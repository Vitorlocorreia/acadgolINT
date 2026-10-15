const test=require('node:test'),assert=require('node:assert/strict'),{loadTS}=require('./support/load-ts.cjs')
const {normalizeFinanceFilters,financeHref,defaultFinanceFilters}=loadTS('lib/finance/filters.ts',{}, {URLSearchParams})

test('finance defaults to global alphabetical ordering and bounds untrusted filter input',()=>{
 const f=normalizeFinanceFilters({q:'  Ana   Júlia ',classId:'invalid',sort:'SQL',charge:'other',due:'99'})
 assert.equal(f.q,'Ana Júlia');assert.equal(f.classId,'all');assert.equal(f.sort,'name');assert.equal(f.charge,'all');assert.equal(f.due,'all')
 assert.equal(normalizeFinanceFilters({q:'a'.repeat(200)}).q.length,120)
})
test('pagination and status changes preserve the applied name, class, billing type and due-day filters',()=>{
 const f=normalizeFinanceFilters({q:'Mãe & Pai',classId:'unassigned',charge:'monthly',due:'middle'})
 const context={month:'2026-10',status:'paid',date:'2026-10-15',tab:'mensalidades',page:2}
 const url=new URL(financeHref(context,f),'https://example.test')
 for(const [key,value] of Object.entries(f))if(key!=='sort')assert.equal(url.searchParams.get(key),value)
 assert.equal(url.searchParams.get('page'),'2');assert.equal(url.searchParams.get('status'),'paid')
 const reset=new URL(financeHref({...context,page:1,status:'all'},defaultFinanceFilters),'https://example.test')
 for(const key of ['q','classId','charge','due','sort','page'])assert.equal(reset.searchParams.has(key),false)
})
