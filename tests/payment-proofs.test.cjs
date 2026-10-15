const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {loadTS}=require('./support/load-ts.cjs');
const helpers=loadTS('lib/finance/payment-proof.ts');
const actor='12b8af44-79e2-49b3-8dbb-be3f6063cf05';
const valid={invoiceId:'d76e3f23-9c3d-4c21-806b-3fcbde8cf2c3',idempotencyKey:'69287b56-79d7-4f97-9561-3a066e13bbd8',paymentMethod:'pix',receivedAmount:100,overdueOption:'waive'};
const pdf=()=>new File(['%PDF-1.7\nReceipt fixture'], 'Recibo João.pdf',{type:'application/pdf'});
const form=file=>{const data=new FormData();data.set('proof',file);return data;};
function scenario({uploadError=null,existing=null,networkError=false}={}){
 const calls=[],uploads=[],refreshes=[];
 const db={auth:{getUser:async()=>({data:{user:{id:actor}},error:null})},storage:{from:bucket=>{
  assert.equal(bucket,'payment-proofs');return {
   upload:async(path,bytes,options)=>{uploads.push({path,bytes,options});if(networkError)throw Error('offline');return {error:uploadError};},
   download:async()=>existing?{data:existing,error:null}:{data:null,error:{message:'missing'}},
  };
 }},rpc:async(name,args)=>{calls.push({name,args});return {data:{paymentId:'receipt'},error:null};}};
 const actions=loadTS('app/financeiro/actions.ts',{
  '@/lib/supabase/admin':{createAdminClient:async permission=>{assert.equal(permission,'finance.write');return db;}},
  'next/cache':{revalidatePath:path=>refreshes.push(path)},zod:require('zod'),'./calc':{},'node:crypto':crypto,'@/lib/finance/payment-parts':loadTS('lib/finance/payment-parts.ts'),'@/lib/finance/payment-proof':helpers,
 },{File,Uint8Array});
 return {actions,calls,uploads,refreshes};
}
test('proof rejects empty, oversized and unsupported files, and checks the supported file signatures',()=>{
 assert.match(helpers.paymentProofProblem({size:0,type:'application/pdf'}),/vazio/);
 assert.match(helpers.paymentProofProblem({size:3145729,type:'application/pdf'}),/3 MB/);
 assert.match(helpers.paymentProofProblem({size:20,type:'text/html'}),/PDF/);
 assert.equal(helpers.paymentProofProblem({size:3145728,type:'image/png'}),null);
 for(const [type,bytes] of [['application/pdf',Buffer.from('%PDF-1.7')],['image/jpeg',Buffer.from([255,216,255])],['image/png',Buffer.from([137,80,78,71,13,10,26,10])],['image/webp',Buffer.from('RIFF1234WEBP')]]){
  assert.equal(helpers.paymentProofHasSignature(bytes,type),true);
  assert.equal(helpers.paymentProofHasSignature(Buffer.from('<html>fake</html>'),type),false);
 }
 assert.equal(helpers.paymentProofHasSignature(Buffer.alloc(0),'image/png'),false);
 assert.equal(helpers.paymentProofName('../Recibo\r\n.pdf','application/pdf'),'.._Recibo__.pdf');
 assert.equal(helpers.paymentProofName('','image/png'),'comprovante.png');
});
test('a valid proof uploads immutable bytes and only then records its server-derived metadata',async()=>{
 const run=scenario(),file=pdf();const result=await run.actions.markInvoiceManualPaidAction(valid,form(file));
 assert.equal(result.success,true);assert.equal(run.uploads.length,1);assert.equal(run.calls.length,1);
 const expectedHash=crypto.createHash('sha256').update(Buffer.from(await file.arrayBuffer())).digest('hex');
 const path=`${actor}/${valid.invoiceId}/${valid.idempotencyKey}/${expectedHash}.pdf`;
 assert.equal(run.uploads[0].path,path);assert.equal(run.uploads[0].options.upsert,false);
 const payload=run.calls[0].args.p_payload;
 assert.equal(payload.proofPath,path);assert.equal(payload.proofName,'Recibo João.pdf');assert.equal(payload.proofMime,'application/pdf');assert.equal(payload.proofSize,file.size);
 assert.ok(run.refreshes.includes('/financeiro'));
});
test('invalid content and unsupported files cannot mark an invoice as paid',async()=>{
 for(const file of [new File(['malicious'],'fake.pdf',{type:'application/pdf'}),new File(['text'],'proof.html',{type:'text/html'}),new File([],'empty.pdf',{type:'application/pdf'}),new File([new Uint8Array(3145729)],'large.pdf',{type:'application/pdf'})]){
  const run=scenario(),result=await run.actions.markInvoiceManualPaidAction(valid,form(file));
  assert.equal(result.success,false);assert.equal(run.uploads.length,0);assert.equal(run.calls.length,0);
 }
});
test('failed or interrupted uploads leave the invoice unchanged',async()=>{
 for(const options of [{uploadError:{message:'rejected'}},{networkError:true}]){
  const run=scenario(options),result=await run.actions.markInvoiceManualPaidAction(valid,form(pdf()));
  assert.equal(result.success,false);assert.equal(run.calls.length,0);assert.equal(run.refreshes.length,0);assert.match(result.error,/baixa não foi registrada/i);
 }
});
test('retry reuses matching immutable evidence but refuses different stored contents',async()=>{
 for(const matches of [true,false]){
  const run=scenario({uploadError:{message:'duplicate'},existing:matches?pdf():new Blob(['wrong'])});
  const result=await run.actions.markInvoiceManualPaidAction(valid,form(pdf()));
  assert.equal(result.success,matches);assert.equal(run.calls.length,matches?1:0);
 }
});
test('client-supplied proof paths and metadata are stripped without an uploaded file',async()=>{
 const run=scenario();await run.actions.markInvoiceManualPaidAction({...valid,proofPath:'someone-else.pdf',proofName:'fake',proofSize:99,proofMime:'application/pdf'});
 for(const field of ['proofPath','proofName','proofSize','proofMime'])assert.equal(field in run.calls[0].args.p_payload,false);
});
function downloadScenario({role='financeiro',pending=false,active=true,proof=true,downloadError=false}={}){
 let queries=0,downloads=0;
 const record=proof?{proof_path:'private/path',proof_name:'Recibo João.pdf',proof_mime:'application/pdf'}:null;
 const db={from:()=>{queries++;return {select:()=>({eq:()=>({maybeSingle:async()=>({data:record,error:null})})})};},storage:{from:()=>({download:async()=>{downloads++;return {data:downloadError?null:pdf(),error:downloadError?{}:null};}})}};
 const route=loadTS('app/api/financeiro/comprovantes/[paymentId]/route.ts',{
  '@/lib/auth/session':{getStaffSession:async()=>role?{staff:{active,must_change_password:pending,session_valid:true,role},db}:null},
  '@/lib/auth/permissions':loadTS('lib/auth/permissions.ts'),
  '@/lib/finance/payment-proof':helpers,zod:require('zod'),
 },{Response,Request});
 return {get:()=>route.GET(new Request('http://localhost'),{params:Promise.resolve({paymentId:valid.invoiceId})}),counts:()=>({queries,downloads})};
}
test('proof downloads require a completed, active financial staff session',async()=>{
 for(const [options,status] of [[{role:null},401],[{pending:true},401],[{active:false},401],[{role:'treinador'},403]]){
  const run=downloadScenario(options),response=await run.get();assert.equal(response.status,status);assert.equal(run.counts().queries,0);
 }
});
test('each financial role downloads evidence privately as an attachment',async()=>{
 for(const role of ['admin','secretaria','financeiro']){
  const response=await downloadScenario({role}).get();assert.equal(response.status,200);
  assert.equal(response.headers.get('content-type'),'application/pdf');assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.match(response.headers.get('content-disposition'),/^attachment;/);
  assert.match(response.headers.get('content-disposition'),/Jo%C3%A3o/);assert.match(await response.text(),/^%PDF-/);
 }
});
test('missing evidence and failed downloads produce clear failures without exposing storage paths',async()=>{
 for(const [options,status] of [[{proof:false},404],[{downloadError:true},503]]){
  const response=await downloadScenario(options).get();assert.equal(response.status,status);assert.doesNotMatch(await response.text(),/private\/path/);
 }
});
