const test=require('node:test'),assert=require('node:assert/strict'),{loadTS}=require('./support/load-ts.cjs');
const valid={invoiceId:'d76e3f23-9c3d-4c21-806b-3fcbde8cf2c3',idempotencyKey:'69287b56-79d7-4f97-9561-3a066e13bbd8',paymentMethod:'pix',receivedAmount:100,overdueOption:'waive'};
function scenario(error=null){
 const calls=[],refreshes=[];const actions=loadTS('app/financeiro/actions.ts',{
  '@/lib/supabase/admin':{createAdminClient:async permission=>{assert.equal(permission,'finance.write');return {rpc:async(name,args)=>{calls.push({name,args});return {data:{success:true},error}}}}},
  'next/cache':{revalidatePath:path=>refreshes.push(path)},zod:require('zod'),'./calc':{},
  'node:crypto':require('node:crypto'),'@/lib/finance/filters':loadTS('lib/finance/filters.ts'),'@/lib/finance/payment-parts':loadTS('lib/finance/payment-parts.ts'),'@/lib/finance/payment-proof':loadTS('lib/finance/payment-proof.ts'),
 });return {actions,calls,refreshes};
}
test('manual receipt rejects missing identity, nonpositive amounts and unsupported methods before writing',async()=>{
 for(const payload of [{...valid,idempotencyKey:''},{...valid,receivedAmount:0},{...valid,receivedAmount:-1},{...valid,paymentMethod:'automatico'}]){
  const run=scenario();const result=await run.actions.markInvoiceManualPaidAction(payload);assert.equal(result.success,false);assert.equal(run.calls.length,0);
 }
});
test('manual receipt never forwards a client-supplied operator, principal or calculated charges',async()=>{
 const run=scenario();const result=await run.actions.markInvoiceManualPaidAction({...valid,receivedBy:'Outro operador',originalAmount:1,fineAmount:999,interestAmount:999,discountAmount:999});
 assert.equal(result.success,true);assert.equal(run.calls[0].name,'record_manual_payment');
 const payload=run.calls[0].args.p_payload;for(const field of ['receivedBy','originalAmount','fineAmount','interestAmount','discountAmount'])assert.equal(field in payload,false);
 assert.equal(payload.idempotencyKey,valid.idempotencyKey);assert.equal(payload.receivedAmount,100);
});
test('a rejected receipt does not report success or refresh financial totals',async()=>{
 const run=scenario({message:'Esta cobrança já foi recebida.'});const result=await run.actions.markInvoiceManualPaidAction(valid);
 assert.equal(result.success,false);assert.equal(run.refreshes.length,0);assert.match(result.error,/já foi recebida/);
});
