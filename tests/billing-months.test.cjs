const test=require('node:test'),assert=require('node:assert/strict'),{loadTS}=require('./support/load-ts.cjs');
const {advanceMonthOptions,nextBillingMonth}=loadTS('lib/finance/billing-months.ts');
test('month options span the current and next twelve reference months without day or timezone rollover',()=>{
 const months=Array.from(advanceMonthOptions('2026-10-31'));
 assert.equal(months.length,13);assert.equal(months[0],'2026-10');assert.equal(months[1],'2026-11');assert.equal(months[12],'2027-10');assert.equal(new Set(months).size,13);
 assert.equal(nextBillingMonth('2026-12-31'),'2027-01');assert.equal(nextBillingMonth('2028-01-31'),'2028-02');assert.equal(nextBillingMonth('2028-02-29'),'2028-03');
});
