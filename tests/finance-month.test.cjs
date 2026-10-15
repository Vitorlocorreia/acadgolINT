const test=require('node:test'),assert=require('node:assert/strict'),{loadTS}=require('./support/load-ts.cjs');
function scenario(now){
 class Clock extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return new Date(now).valueOf();}}
 const monthFilters=[];
 const actions=loadTS('app/financeiro/actions.ts',{
  '@/lib/supabase/admin':{createAdminClient:async permission=>{assert.equal(permission,'finance.read');return {from:()=>{
   const query={select:()=>query,eq:(column,value)=>{if(column==='reference_month')monthFilters.push(value);return query;},in:()=>query,lt:()=>query,gte:()=>query,lte:()=>query,order:()=>query,then:(resolve,reject)=>Promise.resolve({data:[],error:null}).then(resolve,reject)};return query;
  }};}},
  zod:require('zod'),'node:crypto':require('node:crypto'),'next/cache':{revalidatePath:()=>{}},
  '@/lib/finance/payment-parts':loadTS('lib/finance/payment-parts.ts'),'@/lib/finance/payment-proof':loadTS('lib/finance/payment-proof.ts'),'./calc':loadTS('app/financeiro/calc.ts',{}, {Date:Clock}),
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
