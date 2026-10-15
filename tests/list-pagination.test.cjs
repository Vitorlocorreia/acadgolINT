const test=require('node:test'),assert=require('node:assert/strict'),{loadTS}=require('./support/load-ts.cjs');
const finance=loadTS('lib/finance/payment-parts.ts');
const rows=Array.from({length:125},(_,n)=>({id:String(n).padStart(4,'0'),reference_month:'2026-10',due_date:n<110?'2026-10-20':'2026-10-01',amount:150,status:n<70?'paid':n<100?'unconfirmed':n<110?'pending':n<120?'overdue':'cancelled',settled_before_import:n<70,paid_at:null}));
function financeScenario(failSummary=false){
 const ranges=[];
 const db={rpc:async(name)=>{assert.equal(name,'finance_month_summary');return {data:{stats:finance.summarizeInvoices(rows,'2026-10-15'),counts:{all:120,paid:70,pending:50,unconfirmed:30,overdue:10},methods:{dinheiro:0,pix:0,debito:0,credito:0}},error:failSummary?{message:'Unavailable'}:null}},from:table=>{
  assert.equal(table,'finance_invoices');let predicates=[],start=0,end=Infinity,orders=[];
  const q={select:()=>q,eq:(k,v)=>{predicates.push(r=>r[k]===v);return q},neq:(k,v)=>{predicates.push(r=>r[k]!==v);return q},in:(k,values)=>{predicates.push(r=>values.includes(r[k]));return q},lt:(k,v)=>{predicates.push(r=>r[k]!=null&&r[k]<v);return q},gte:(k,v)=>{predicates.push(r=>r[k]!=null&&r[k]>=v);return q},lte:(k,v)=>{predicates.push(r=>r[k]!=null&&r[k]<=v);return q},order:(key,opts)=>{orders.push([key,opts.ascending]);return q},range:(a,b)=>{start=a;end=b;ranges.push([a,b]);return q},then:(resolve,reject)=>{
   let data=rows.filter(r=>predicates.every(p=>p(r)));data.sort((a,b)=>{for(const [k,ascending] of orders){const c=String(a[k]).localeCompare(String(b[k]));if(c)return ascending?c:-c}return 0});
   return Promise.resolve({data:data.slice(start,end+1),error:null}).then(resolve,reject)
  }};return q;
 }};
 const actions=loadTS('app/financeiro/actions.ts',{'@/lib/supabase/admin':{createAdminClient:async p=>{assert.equal(p,'finance.read');return db}},'@/lib/finance/payment-parts':finance,'@/lib/finance/payment-proof':{},'node:crypto':require('node:crypto'),'next/cache':{},zod:require('zod'),'./calc':loadTS('app/financeiro/calc.ts')});
 return {actions,ranges};
}
test('pending includes unconfirmed payments and overdue invoices while excluding paid and cancelled',async()=>{
 const run=financeScenario(),result=await run.actions.getFinanceiroEscolinhaData('2026-10','pending','2026-10-15');
 assert.equal(result.invoices.length,50);assert.ok(result.invoices.every(r=>['pending','overdue','unconfirmed'].includes(r.status)));
 assert.equal(result.pagination.total,50);assert.equal(result.filterCounts.paid,70);assert.equal(result.stats.total,18000);assert.equal(result.stats.openingPaidCount,70);
});
test('paid pagination has stable nonoverlapping pages and full-month totals on each page',async()=>{
 const run=financeScenario(),first=await run.actions.getFinanceiroEscolinhaData('2026-10','paid','2026-10-15',1),second=await run.actions.getFinanceiroEscolinhaData('2026-10','paid','2026-10-15',2);
 assert.equal(first.invoices.length,50);assert.equal(second.invoices.length,20);assert.equal(second.pagination.total,70);
 assert.ok(first.invoices.concat(second.invoices).every(r=>r.status==='paid'));
 assert.equal(new Set(first.invoices.concat(second.invoices).map(r=>r.id)).size,70);assert.equal(first.stats.total,second.stats.total);assert.equal(first.stats.collected,0);
 assert.ok(run.ranges.every(([a,b])=>b-a===49));
});
test('a page removed by a new payment falls back to the final existing page',async()=>{
 const {actions}=financeScenario(),result=await actions.getFinanceiroEscolinhaData('2026-10','paid','2026-10-15',999);
 assert.equal(result.pagination.page,2);assert.equal(result.invoices.length,20);
});
test('a summary failure cannot display plausible partial financial totals',async()=>{
 const {actions}=financeScenario(true);await assert.rejects(()=>actions.getFinanceiroEscolinhaData('2026-10','all','2026-10-15'),/Não foi possível carregar todos/);
});
test('student search and pagination run in the guarded database projection without loading full records',async()=>{
 const calls=[];const actions=loadTS('app/alunos/actions.ts',{'@/lib/supabase/admin':{createAdminClient:async p=>{assert.equal(p,'students.read');return {from:()=>{throw Error('Full table reads are forbidden')},rpc:async(name,args)=>{calls.push({name,args});return {data:{students:[],total:17,page:1,pages:1,pageSize:50},error:null}}}}},'next/cache':{},'next/navigation':{}});
 const page=await actions.getStudentsList({search:'  Responsável  ',status:'paused',page:2});assert.equal(page.total,17);assert.equal(calls[0].name,'student_directory');assert.equal(calls[0].args.p_search,'Responsável');assert.equal(calls[0].args.p_status,'paused');assert.equal(calls[0].args.p_page,2);
});
