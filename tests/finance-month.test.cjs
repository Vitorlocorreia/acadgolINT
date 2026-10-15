const test=require('node:test'),assert=require('node:assert/strict'),{loadTS}=require('./support/load-ts.cjs');
function scenario(now){
 class Clock extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return new Date(now).valueOf();}}
 const monthFilters=[];
 const actions=loadTS('app/financeiro/actions.ts',{
  '@/lib/supabase/admin':{createAdminClient:async permission=>{assert.equal(permission,'finance.read');return {from:()=>{
   const query={select:()=>query,eq:(column,value)=>{if(column==='reference_month')monthFilters.push(value);return query;},in:()=>query,neq:()=>query,range:()=>query,lt:()=>query,gte:()=>query,lte:()=>query,order:()=>query,then:(resolve,reject)=>Promise.resolve({data:[],error:null}).then(resolve,reject)};return query;
  },rpc:async(name,args)=>{monthFilters.push(args.p_month);if(name==='finance_invoice_directory')return {data:{invoices:[],classes:[],counts:{all:0,pending:0,paid:0,unconfirmed:0,overdue:0},pagination:{page:1,pageSize:50,total:0,pages:1}},error:null};assert.equal(name,'finance_month_summary');return {data:{stats:{total:0,collected:0,pending:0,overdue:0,openingPaid:0,openingPaidCount:0,unconfirmed:0,unconfirmedCount:0},counts:{all:0,pending:0,paid:0,unconfirmed:0,overdue:0},methods:{dinheiro:0,pix:0,debito:0,credito:0}},error:null}}};}},
  zod:require('zod'),'node:crypto':require('node:crypto'),'next/cache':{revalidatePath:()=>{}},
  '@/lib/finance/filters':loadTS('lib/finance/filters.ts'),'@/lib/finance/payment-parts':loadTS('lib/finance/payment-parts.ts'),'@/lib/finance/payment-proof':loadTS('lib/finance/payment-proof.ts'),'./calc':loadTS('app/financeiro/calc.ts',{}, {Date:Clock}),
 },{Date:Clock});
 return {actions,monthFilters};
}
test('finance stays in the Recife month when UTC has already entered the next month',async()=>{
 const run=scenario('2026-11-01T01:30:00Z');const data=await run.actions.getFinanceiroEscolinhaData();
 assert.equal(data.todayStr,'2026-10-31');assert.equal(data.targetMonth,'2026-10');assert.ok(run.monthFilters.every(month=>month==='2026-10'));
});
test('finance advances after midnight in Recife and still allows consulting a future month',async()=>{
 const run=scenario('2026-11-01T03:01:00Z');const data=await run.actions.getFinanceiroEscolinhaData();
 assert.equal(data.todayStr,'2026-11-01');assert.equal(data.targetMonth,'2026-11');
 const future=await run.actions.getFinanceiroEscolinhaData('2027-01');assert.equal(future.targetMonth,'2027-01');
});
