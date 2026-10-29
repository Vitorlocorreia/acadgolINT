import {z} from 'zod'

export const cashMethods=['dinheiro','pix','debito','credito'] as const
export const cashLabels={dinheiro:'Dinheiro',pix:'PIX',debito:'Cartão de débito',credito:'Cartão de crédito'}
const amount=z.coerce.number().finite().nonnegative()
const actor=z.object({name:z.string(),username:z.string().nullable(),role:z.string()})
const values=z.object({dinheiro:amount,pix:amount,debito:amount,credito:amount,total:amount})
const differences=z.object({dinheiro:z.coerce.number().finite(),pix:z.coerce.number().finite(),debito:z.coerce.number().finite(),credito:z.coerce.number().finite(),total:z.coerce.number().finite()})
const entry=z.object({invoiceId:z.uuid(),paymentId:z.uuid().nullable(),studentName:z.string(),referenceMonth:z.string(),chargeType:z.string(),agreedAmount:amount,receivedAmount:amount,paidAt:z.string(),recordedAt:z.string().nullable(),actorName:z.string(),parts:z.array(z.object({method:z.string(),amount}))})
export const cashSourceSchema=z.object({date:z.iso.date(),totals:values,count:z.number().int().nonnegative(),reversedCount:z.number().int().nonnegative(),entries:z.array(entry),fingerprint:z.string().regex(/^[a-f0-9]{32}$/)})
export const cashClosureSchema=z.object({id:z.uuid(),business_date:z.iso.date(),revision:z.number().int().positive(),opening_cash:amount,expected:values,counted:values,difference:differences,difference_reason:z.string(),notes:z.string(),actor_snapshot:actor,closed_at:z.string(),reopening:z.object({reason:z.string(),actor,at:z.string()}).nullable()})
export const cashReportSchema=z.object({date:z.iso.date(),state:z.enum(['open','closed']),live:cashSourceSchema,latest:cashClosureSchema.nullable(),history:z.array(cashClosureSchema),canReopen:z.boolean()})
export const cashDocumentSchema=cashClosureSchema.extend({snapshot:cashSourceSchema})
const countedAmount=z.number().finite().min(0).max(1000000000).refine(n=>Math.abs(n*100-Math.round(n*100))<0.00001)
export const closeCashInputSchema=z.object({date:z.iso.date(),key:z.uuid(),fingerprint:z.string().regex(/^[a-f0-9]{32}$/),openingCash:countedAmount.max(1000000),counted:z.object({dinheiro:countedAmount,pix:countedAmount,debito:countedAmount,credito:countedAmount}),differenceReason:z.string().trim().max(500),notes:z.string().trim().max(1000)})
export type CashDayReport=z.infer<typeof cashReportSchema>
export type CashClosure=z.infer<typeof cashClosureSchema>
export type CashDocument=z.infer<typeof cashDocumentSchema>
export type CashSource=z.infer<typeof cashSourceSchema>
export type CloseCashInput=z.infer<typeof closeCashInputSchema>
export function reconciliation(totals:CashSource['totals'],opening:number,counted:CloseCashInput['counted']){
 const expected={...totals,dinheiro:(Math.round(totals.dinheiro*100)+Math.round(opening*100))/100,total:(Math.round(totals.total*100)+Math.round(opening*100))/100}
 const difference={dinheiro:0,pix:0,debito:0,credito:0,total:0}
 for(const method of cashMethods)difference[method]=(Math.round(counted[method]*100)-Math.round(expected[method]*100))/100
 difference.total=cashMethods.reduce((sum,method)=>sum+Math.round(difference[method]*100),0)/100
 return {expected,difference,hasDifference:cashMethods.some(method=>difference[method]!==0)}
}
