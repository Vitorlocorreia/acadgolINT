const test=require('node:test'),assert=require('node:assert/strict'),{loadTS}=require('./support/load-ts.cjs');
const finance=loadTS('lib/finance/payment-parts.ts');
test('opening settlements never turn into PIX, cash or another new receipt',()=>{
 const opening={status:'paid',amount:200,paid_amount:200,settled_before_import:true};
 assert.equal(finance.invoicePaymentParts(opening).length,0);
 const totals=finance.paymentTotals([opening,{amount:150,paid_amount:150,payment_method:'dinheiro'}]);
 assert.equal(totals.dinheiro,150);assert.equal(totals.pix,0);
 assert.match(finance.paymentPartsLabel(opening),/antes da importação/);
});
test('unknown October payment is separate from delinquency even after the due day',()=>{
 const result=finance.summarizeInvoices([
  {status:'paid',amount:200,settled_before_import:true},
  {status:'unconfirmed',amount:150,due_date:'2026-10-01'},
  {status:'paid',amount:120,paid_amount:100},
  {status:'pending',amount:200,due_date:'2026-10-20'},
  {status:'pending',amount:100,due_date:'2026-10-05'},
  {status:'cancelled',amount:999,due_date:'2026-10-01'},
 ],'2026-10-15');
 assert.equal(result.total,770);assert.equal(result.collected,100);
 assert.equal(result.openingPaid,200);assert.equal(result.openingPaidCount,1);
 assert.equal(result.unconfirmed,150);assert.equal(result.unconfirmedCount,1);
 assert.equal(result.overdue,100);assert.equal(result.pending,200);
});
