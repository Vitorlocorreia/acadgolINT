const test=require('node:test'),assert=require('node:assert/strict'),{loadTS}=require('./support/load-ts.cjs');
const payments=loadTS('lib/finance/payment-parts.ts');
const split=[{method:'dinheiro',amount:80},{method:'pix',amount:20}];
test('split totals equal the amount actually received, with exact cent comparisons',()=>{
 assert.equal(payments.paymentPartsProblem(split,100),null);
 assert.equal(payments.paymentPartsProblem([{method:'dinheiro',amount:0.1},{method:'pix',amount:0.2}],0.3),null);
 assert.match(payments.paymentPartsProblem(split,120),/soma/);
});
test('split rejects negative, zero, fractional cents, duplicate and unsupported methods',()=>{
 for(const parts of [[{method:'dinheiro',amount:0}],[{method:'pix',amount:-1}],[{method:'pix',amount:0.001}],[{method:'automatico',amount:100}],[{method:'pix',amount:50},{method:'pix',amount:50}],[{method:'pix',amount:50},{method:'pix_whatsapp',amount:50}]])assert.ok(payments.paymentPartsProblem(parts,100));
});
test('two monthly invoices of 120 produce 200 cash and 40 PIX without double counting',()=>{
 const totals=payments.paymentTotals([{amount:120,paid_amount:120,payment_method:'dinheiro'},{amount:120,paid_amount:120,payment_method:'misto',receipt:{payment_parts:[{method:'dinheiro',amount:80},{method:'pix',amount:40}]}}]);
 assert.equal(totals.dinheiro,200);assert.equal(totals.pix,40);assert.equal(totals.debito,0);assert.equal(totals.credito,0);
});
test('discounted receipts report the received amount and retain card and PIX breakdowns',()=>{
 const row={amount:120,paid_amount:100,payment_method:'misto',receipt:{payment_parts:split}};
 const totals=payments.paymentTotals([row]);assert.equal(totals.dinheiro,80);assert.equal(totals.pix,20);
 assert.match(payments.paymentPartsLabel(row),/Dinheiro/);assert.match(payments.paymentPartsLabel(row),/PIX/);
 const cards=payments.paymentTotals([{amount:100,paid_amount:90,payment_method:'misto',receipt:{payment_parts:[{method:'cartao_debito',amount:40},{method:'cartao_credito',amount:50}]}}]);assert.equal(cards.debito,40);assert.equal(cards.credito,50);
});
const valid={invoiceId:'d76e3f23-9c3d-4c21-806b-3fcbde8cf2c3',idempotencyKey:'69287b56-79d7-4f97-9561-3a066e13bbd8',paymentMethod:'misto',receivedAmount:100,overdueOption:'waive',paymentParts:split,hasDiscount:true};
function scenario(){
 const writes=[];
 const actions=loadTS('app/financeiro/actions.ts',{
  '@/lib/supabase/admin':{createAdminClient:async()=>({rpc:async(name,args)=>{writes.push(args.p_payload);return {data:{success:true},error:null};}})},
  '@/lib/finance/payment-parts':payments,'@/lib/finance/payment-proof':loadTS('lib/finance/payment-proof.ts'),'node:crypto':require('node:crypto'),'next/cache':{revalidatePath:()=>{}},zod:require('zod'),'./calc':{},
 });return {actions,writes};
}
test('manual action accepts explicitly marked discounts with optional justification and a split receipt',async()=>{
 const run=scenario(),result=await run.actions.markInvoiceManualPaidAction(valid);
 assert.equal(result.success,true);assert.equal(run.writes[0].hasDiscount,true);assert.equal(run.writes[0].paymentParts.length,2);assert.equal('discountReason' in run.writes[0],false);
});
test('inconsistent split data cannot reach the financial transaction',async()=>{
 for(const payload of [{...valid,receivedAmount:120},{...valid,paymentParts:undefined},{...valid,paymentParts:[{method:'pix',amount:40},{method:'pix',amount:60}]},{...valid,paymentParts:[{method:'pix',amount:99.999}]}]){
  const run=scenario();assert.equal((await run.actions.markInvoiceManualPaidAction(payload)).success,false);assert.equal(run.writes.length,0);
 }
});
test('daily, weekly and monthly reports preserve mixed payment methods after querying the financial view',async()=>{
 const row={id:valid.invoiceId,amount:120,paid_amount:100,status:'paid',payment_method:'misto',paid_at:'2026-10-15T12:00:00Z',receipt:{payment_parts:split},due_date:'2026-10-10'};
 const actions=loadTS('app/financeiro/actions.ts',{
  '@/lib/supabase/admin':{createAdminClient:async()=>({rpc:async()=>({data:{stats:{total:120,collected:100,pending:0,overdue:0,openingPaid:0,openingPaidCount:0,unconfirmed:0,unconfirmedCount:0},counts:{all:1,pending:0,paid:1,unconfirmed:0,overdue:0},methods:{dinheiro:80,pix:20,debito:0,credito:0}},error:null}),from:table=>{assert.equal(table,'finance_invoices');let overdue=false;const q={select:()=>q,eq:()=>q,neq:()=>q,range:()=>q,in:()=>{overdue=true;return q;},lt:()=>q,gte:()=>q,lte:()=>q,order:()=>q,then:(resolve,reject)=>Promise.resolve({data:overdue?[]:[row],error:null}).then(resolve,reject)};return q;}})},
  '@/lib/finance/payment-parts':payments,'@/lib/finance/payment-proof':loadTS('lib/finance/payment-proof.ts'),'node:crypto':require('node:crypto'),'next/cache':{},zod:require('zod'),'./calc':loadTS('app/financeiro/calc.ts'),
 });
 const result=await actions.getFinanceiroEscolinhaData('2026-10','all','2026-10-15');
 assert.equal(result.dailyCash.total,100);assert.equal(result.dailyCash.dinheiro,80);assert.equal(result.dailyCash.pix,20);
 assert.equal(result.weeklyCash.totalWeek,100);assert.equal(result.weeklyCash.days.at(-1).dinheiro,80);assert.equal(result.weeklyCash.days.at(-1).pix,20);
 assert.equal(result.monthlyCash.dinheiro,80);assert.equal(result.monthlyCash.pix,20);assert.equal(result.stats.total,120);assert.equal(result.stats.collected,100);
});
