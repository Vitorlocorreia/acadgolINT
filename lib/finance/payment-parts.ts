export const PAYMENT_METHODS=['dinheiro','pix','cartao_debito','cartao_credito'] as const
export type PaymentMethod=typeof PAYMENT_METHODS[number]
export interface PaymentPart {method:PaymentMethod|'pix_whatsapp';amount:number}
export const paymentMethodLabels:Record<string,string>={dinheiro:'Dinheiro',pix:'PIX',pix_whatsapp:'PIX / WhatsApp',cartao_debito:'Cartão de débito',cartao_credito:'Cartão de crédito',misto:'Pagamento dividido'}
export const moneyCents=(amount:number)=>Math.round(amount*100)
export function paymentPartsProblem(parts:PaymentPart[],total:number){
 if(!parts.length||parts.length>4)return 'Informe de uma a quatro formas de pagamento.'
 if(new Set(parts.map(p=>p.method)).size!==parts.length)return 'Use cada forma de pagamento uma única vez.'
 if(parts.some(p=>![...PAYMENT_METHODS,'pix_whatsapp'].includes(p.method)||!Number.isFinite(p.amount)||p.amount<=0||Math.abs(p.amount*100-moneyCents(p.amount))>0.00001))return 'Informe um valor válido, com até duas casas decimais, em cada forma de pagamento.'
 if(parts.some(p=>p.method==='pix_whatsapp')&&parts.some(p=>p.method==='pix'))return 'Agrupe os valores de PIX em uma única linha.'
 if(parts.reduce((sum,p)=>sum+moneyCents(p.amount),0)!==moneyCents(total))return 'A soma das formas de pagamento deve ser igual ao valor recebido.'
 return null
}
export function invoicePaymentParts(invoice:any):PaymentPart[]{
 if(invoice.settled_before_import)return []
 const saved=invoice.receipt?.payment_parts
 if(Array.isArray(saved)&&saved.length)return saved
 return [{method:invoice.payment_method||'pix',amount:Number(invoice.paid_amount??invoice.amount)}]
}
export function paymentTotals(invoices:any[]){
 const cents={dinheiro:0,pix:0,debito:0,credito:0}
 for(const invoice of invoices)for(const part of invoicePaymentParts(invoice)){
  const key=part.method==='dinheiro'?'dinheiro':part.method==='cartao_debito'?'debito':part.method==='cartao_credito'?'credito':'pix'
  cents[key]+=moneyCents(Number(part.amount))
 }
 return {dinheiro:cents.dinheiro/100,pix:cents.pix/100,debito:cents.debito/100,credito:cents.credito/100}
}
export function paymentPartsLabel(invoice:any){return invoice.settled_before_import?'Quitado antes da importação; forma e data não informadas.':invoicePaymentParts(invoice).map(p=>`${paymentMethodLabels[p.method]||p.method}: ${Number(p.amount).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}`).join(' · ')}

export function summarizeInvoices(invoices:any[],today:string){
 const totals={total:0,collected:0,pending:0,overdue:0,openingPaid:0,openingPaidCount:0,unconfirmed:0,unconfirmedCount:0}
 for(const invoice of invoices){
  if(invoice.status==='cancelled')continue
  const value=moneyCents(Number(invoice.amount));totals.total+=value
  if(invoice.status==='paid'){
   if(invoice.settled_before_import){totals.openingPaid+=value;totals.openingPaidCount++}
   else totals.collected+=moneyCents(Number(invoice.paid_amount??invoice.amount))
  }else if(invoice.status==='unconfirmed'){totals.unconfirmed+=value;totals.unconfirmedCount++}
  else if(invoice.status==='overdue'||invoice.due_date<today)totals.overdue+=value
  else totals.pending+=value
 }
 return {...totals,total:totals.total/100,collected:totals.collected/100,pending:totals.pending/100,overdue:totals.overdue/100,openingPaid:totals.openingPaid/100,unconfirmed:totals.unconfirmed/100}
}
