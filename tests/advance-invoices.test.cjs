const test=require('node:test'),assert=require('node:assert/strict'),{loadTS}=require('./support/load-ts.cjs');
const student='10000000-0000-4000-8000-000000000001',invoiceId='20000000-0000-4000-8000-000000000001';
const invoice={id:invoiceId,reference_month:'2026-11',due_date:'2026-11-30',amount:120,status:'pending',charge_type:'monthly',student:{id:student,name:'Atleta de teste'}};
function scenario(response={data:{success:true,created:true,invoice},error:null},allowed=true){
 const calls=[],paths=[],permissions=[];
 const actions=loadTS('app/financeiro/advance-actions.ts',{
  zod:require('zod'),'next/cache':{revalidatePath:path=>paths.push(path)},
  '@/lib/supabase/admin':{createAdminClient:async permission=>{permissions.push(permission);if(!allowed)throw new Error('Acesso negado');return {rpc:async(name,args)=>{calls.push({name,args:JSON.parse(JSON.stringify(args))});return response}}}}
 });
 return {actions,calls,paths,permissions};
}
test('advance prepares only the selected athlete and month and refreshes financial views',async()=>{
 const run=scenario();const result=await run.actions.prepareAdvanceInvoiceAction(student,'2026-11');
 assert.equal(result.success,true);assert.equal(result.invoice.status,'pending');
 assert.deepEqual(run.calls,[{name:'prepare_advance_monthly_invoice',args:{p_student:student,p_month:'2026-11'}}]);
 assert.deepEqual(run.paths,['/financeiro','/dashboard']);assert.deepEqual(run.permissions,['finance.write']);
});
test('invalid athlete or month never reaches the database',async()=>{
 for(const [id,month] of [[student,'2026-13'],[student,'2026-1'],['not-a-student','2026-11'],[student,'2026-11-01']]){
  const run=scenario();assert.equal((await run.actions.prepareAdvanceInvoiceAction(id,month)).success,false);assert.equal(run.calls.length,0);
 }
});
test('already paid/cancelled/unauthorized responses cannot open a payment form',async()=>{
 const run=scenario({data:null,error:{message:'A mensalidade deste atleta já está quitada nesse mês.'}});
 const result=await run.actions.prepareAdvanceInvoiceAction(student,'2026-11');assert.equal(result.success,false);assert.match(result.error,/quitada/);assert.equal(run.paths.length,0);
 const denied=scenario(undefined,false);await assert.rejects(denied.actions.prepareAdvanceInvoiceAction(student,'2026-11'),/Acesso negado/);assert.equal(denied.calls.length,0);
 for(const data of [null,{success:true,created:true,invoice:{...invoice,status:'paid'}},{success:true,created:true,invoice:{...invoice,amount:0}}]){
  const malformed=scenario({data,error:null});assert.equal((await malformed.actions.prepareAdvanceInvoiceAction(student,'2026-11')).success,false);assert.equal(malformed.paths.length,0);
 }
});
test('an existing pending charge is reused without changing its agreed value',async()=>{
 const run=scenario({data:{success:true,created:false,invoice:{...invoice,amount:'137.50'}},error:null});
 const result=await run.actions.prepareAdvanceInvoiceAction(student,'2026-11');assert.equal(result.created,false);assert.equal(result.invoice.amount,137.5);
});
test('athlete lookup is bounded, requires finance permission, and strips unrelated personal data',async()=>{
 const run=scenario({data:[{id:student,name:'Atleta de teste',guardian_name:'Responsável fictício',monthly_fee:'120',due_day:31,portal_token:'must-not-leak',phone:'private'}],error:null});
 const result=await run.actions.searchAdvanceStudentsAction('  Atleta  ');assert.equal(result.success,true);assert.equal(result.students[0].monthly_fee,120);
 assert.deepEqual(Object.keys(result.students[0]).sort(),['due_day','guardian_name','id','monthly_fee','name']);
 assert.deepEqual(run.calls,[{name:'finance_advance_students',args:{p_search:'Atleta'}}]);assert.equal(run.paths.length,0);assert.deepEqual(run.permissions,['finance.write']);
 for(const query of ['a',' ', 'x'.repeat(121)]){const short=scenario();assert.equal((await short.actions.searchAdvanceStudentsAction(query)).success,false);assert.equal(short.calls.length,0);}
});

test('automatic lookup accepts the initial empty search and a single typed character, with bounded pages',async()=>{
 for(const search of ['', 'A', '  Atleta  ']){
  const run=scenario({data:{students:[],total:0,page:1,pages:1,pageSize:25},error:null});
  const result=await run.actions.getAdvanceStudentDirectoryAction(search,2);assert.equal(result.success,true);
  assert.deepEqual(run.calls,[{name:'finance_advance_student_directory',args:{p_search:search.trim(),p_page:2}}]);assert.equal(run.paths.length,0);
 }
 for(const [search,page] of [['x'.repeat(121),1],['',0],['',100001],['',1.5]]){
  const run=scenario();assert.equal((await run.actions.getAdvanceStudentDirectoryAction(search,page)).success,false);assert.equal(run.calls.length,0);
 }
});
test('multiple selected athletes are prepared in one atomic call without recording receipts',async()=>{
 const second='10000000-0000-4000-8000-000000000002';
 const invoices=[invoice,{...invoice,id:'20000000-0000-4000-8000-000000000002',student:{id:second,name:'Outro atleta de teste'}}];
 const run=scenario({data:{success:true,createdCount:1,invoices},error:null});
 const result=await run.actions.prepareAdvanceInvoicesAction([student,second],'2026-11');assert.equal(result.success,true);assert.equal(result.invoices.length,2);
 assert.deepEqual(run.calls,[{name:'prepare_advance_monthly_invoices',args:{p_students:[student,second],p_month:'2026-11'}}]);assert.deepEqual(run.permissions,['finance.write']);assert.deepEqual(run.paths,['/financeiro','/dashboard']);
});
test('invalid, duplicated or excessive selections cannot reach billing',async()=>{
 const many=Array.from({length:51},(_,i)=>`10000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
 for(const ids of [[],[student,student],['invalid'],many]){
  const run=scenario();assert.equal((await run.actions.prepareAdvanceInvoicesAction(ids,'2026-11')).success,false);assert.equal(run.calls.length,0);
 }
 const denied=scenario(undefined,false);await assert.rejects(denied.actions.prepareAdvanceInvoicesAction([student],'2026-11'),/Acesso negado/);assert.equal(denied.calls.length,0);
});
test('a failed selection or mismatched response never reports a complete batch',async()=>{
 const second='10000000-0000-4000-8000-000000000002';
 const failed=scenario({data:null,error:{message:'Atleta já quitado. Nenhuma nova mensalidade emitida.'}});
 const result=await failed.actions.prepareAdvanceInvoicesAction([student,second],'2026-11');assert.equal(result.success,false);assert.match(result.error,/quitado/);assert.equal(failed.paths.length,0);
 for(const invoices of [[invoice],[invoice,invoice],[invoice,{...invoice,student:{id:'10000000-0000-4000-8000-000000000003',name:'Outro'}}],[invoice,{...invoice,reference_month:'2026-12',student:{id:second,name:'Outro'}}]]){
  const run=scenario({data:{success:true,createdCount:1,invoices},error:null});assert.equal((await run.actions.prepareAdvanceInvoicesAction([student,second],'2026-11')).success,false);assert.equal(run.paths.length,0);
 }
});

test('one athlete can prepare several reference months in one atomic request',async()=>{
 const december={...invoice,id:'20000000-0000-4000-8000-000000000002',reference_month:'2026-12',due_date:'2026-12-31'};
 const run=scenario({data:{success:true,createdCount:1,invoices:[invoice,december]},error:null});
 const result=await run.actions.prepareAdvancePeriodsAction([student],['2026-12','2026-11']);
 assert.equal(result.success,true);assert.equal(result.invoices.length,2);
 assert.deepEqual(run.calls,[{name:'prepare_advance_monthly_periods',args:{p_students:[student],p_months:['2026-11','2026-12']}}]);assert.deepEqual(run.paths,['/financeiro','/dashboard']);
});
test('several athletes and months must return every unique athlete/month pair',async()=>{
 const second='10000000-0000-4000-8000-000000000002';
 const invoices=[invoice,{...invoice,id:'20000000-0000-4000-8000-000000000002',reference_month:'2026-12'},
  {...invoice,id:'20000000-0000-4000-8000-000000000003',student:{id:second,name:'Outro'}},
  {...invoice,id:'20000000-0000-4000-8000-000000000004',reference_month:'2026-12',student:{id:second,name:'Outro'}}];
 const run=scenario({data:{success:true,createdCount:4,invoices},error:null});assert.equal((await run.actions.prepareAdvancePeriodsAction([student,second],['2026-11','2026-12'])).success,true);
 for(const rows of [invoices.slice(0,3),[invoices[0],invoices[0],invoices[2],invoices[3]],[...invoices.slice(0,3),{...invoices[3],reference_month:'2027-01'}]]){
  const failed=scenario({data:{success:true,createdCount:4,invoices:rows},error:null});assert.equal((await failed.actions.prepareAdvancePeriodsAction([student,second],['2026-11','2026-12'])).success,false);assert.equal(failed.paths.length,0);
 }
});
test('empty/repeated months, excessive cross products and unprivileged requests fail before issuance',async()=>{
 const many=Array.from({length:50},(_,i)=>`10000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
 for(const [ids,months] of [[[student],[]],[[student],['2026-11','2026-11']],[[student],['2026-13']],[[student,student],['2026-11']],[many,['2026-11','2026-12','2027-01']]]){
  const run=scenario();assert.equal((await run.actions.prepareAdvancePeriodsAction(ids,months)).success,false);assert.equal(run.calls.length,0);
 }
 const denied=scenario(undefined,false);await assert.rejects(denied.actions.prepareAdvancePeriodsAction([student],['2026-11']),/Acesso negado/);assert.equal(denied.calls.length,0);
 const failed=scenario({data:null,error:{message:'Uma mensalidade já está quitada. Nenhuma nova mensalidade emitida.'}});
 assert.equal((await failed.actions.prepareAdvancePeriodsAction([student],['2026-11','2026-12'])).success,false);assert.equal(failed.paths.length,0);
});
