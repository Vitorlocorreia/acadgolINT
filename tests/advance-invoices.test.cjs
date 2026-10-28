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
