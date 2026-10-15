'use server'
import type { InvoiceHistoryPage } from '@/lib/finance/invoice-history'
import type { FinancialAuditPage } from '@/lib/finance/audit'

import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createHash } from 'node:crypto'
import {paymentPartsProblem,paymentTotals,financeFilterStatuses} from '@/lib/finance/payment-parts'
import { PAYMENT_PROOF_BUCKET, paymentProofProblem, paymentProofHasSignature, paymentProofName, paymentProofExtension, type PaymentProofType } from '@/lib/finance/payment-proof'

import { getBrDateStr, calculateOverdueCharges, type OverdueCalculation } from './calc'

export interface ManualPaymentPayload {
  idempotencyKey: string
  overdueOption: 'standard' | 'waive' | 'negotiated'
  invoiceId: string
  paymentMethod: string
  paymentChannel?: 'presencial' | 'online_whatsapp' | 'portal'
  receivedBy: string
  receivedAmount: number
  originalAmount: number
  fineAmount?: number
  interestAmount?: number
  discountAmount?: number
  amountTendered?: number
  changeGiven?: number
  notes?: string
  paidAt?: string
  isOverdueSettlement?: boolean
  negotiationReason?: string
  hasDiscount?: boolean
  discountReason?: string
  paymentParts?: {method:'dinheiro'|'pix'|'pix_whatsapp'|'cartao_debito'|'cartao_credito';amount:number}[]
}

export async function getFinanceiroEscolinhaData(
  referenceMonth?: string,
  statusFilter?: string,
  closingDate?: string,
  requestedPage = 1,
) {
  const supabase = await createAdminClient('finance.read')
  const todayStr = getBrDateStr()
  const targetDate = closingDate || todayStr
  const targetMonth = referenceMonth || todayStr.slice(0,7)
  const currentStatus=(['all','pending','paid','unconfirmed','overdue'].includes(statusFilter||'')?statusFilter!:'all') as 'all'|'pending'|'paid'|'unconfirmed'|'overdue'
  const pageSize=50
  const page=Number.isInteger(requestedPage)&&requestedPage>0?Math.min(requestedPage,100000):1
  const statuses=financeFilterStatuses(currentStatus)
  function monthPage(selectedPage:number){
    let query=supabase.from('finance_invoices').select('*')
      .eq('reference_month',targetMonth).order('due_date',{ascending:true}).order('id',{ascending:true})
    query=statuses.length?query.in('status',statuses):query.neq('status','cancelled')
    return query.range((selectedPage-1)*pageSize,selectedPage*pageSize-1)
  }
  const startIso = new Date(`${targetDate}T00:00:00-03:00`).toISOString()
  const endIso = new Date(`${targetDate}T23:59:59.999-03:00`).toISOString()
  const past7Days: {date:string;label:string;total:number;dinheiro:number;pix:number;cartao:number}[]=[]
  for(let i=6;i>=0;i--){
    const d=new Date(`${targetDate}T12:00:00Z`);d.setUTCDate(d.getUTCDate()-i)
    past7Days.push({date:getBrDateStr(d),label:d.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit',timeZone:'America/Recife'}),total:0,dinheiro:0,pix:0,cartao:0})
  }
  const weekStartIso=new Date(`${past7Days[0].date}T00:00:00-03:00`).toISOString()
  const [monthResult,summaryResult,overdueResult,dailyResult,weekResult]=await Promise.all([
    monthPage(page),
    supabase.rpc('finance_month_summary',{p_month:targetMonth}),
    supabase.from('finance_invoices').select('*').in('status',['pending','overdue']).lt('due_date',todayStr).order('due_date',{ascending:true}),
    supabase.from('finance_invoices').select('*').eq('status','paid').eq('settled_before_import',false).gte('paid_at',startIso).lte('paid_at',endIso).order('paid_at',{ascending:false}),
    supabase.from('finance_invoices').select('amount,paid_amount,payment_method,paid_at,receipt,settled_before_import').eq('status','paid').eq('settled_before_import',false).gte('paid_at',weekStartIso).lte('paid_at',endIso),
  ])
  if([monthResult,summaryResult,overdueResult,dailyResult,weekResult].some(r=>r.error)||!summaryResult.data?.stats||!summaryResult.data?.counts||!summaryResult.data?.methods)throw new Error('Não foi possível carregar todos os dados financeiros. Atualize a página antes de conferir os valores.')
  const stats=summaryResult.data.stats as {total:number;collected:number;pending:number;overdue:number;openingPaid:number;openingPaidCount:number;unconfirmed:number;unconfirmedCount:number}
  const filterCounts=summaryResult.data.counts as Record<'all'|'pending'|'paid'|'unconfirmed'|'overdue',number>
  const filteredTotal=filterCounts[currentStatus]
  const pages=Math.max(1,Math.ceil(filteredTotal/pageSize)),actualPage=Math.min(page,pages)
  let list=monthResult.data??[]
  if(actualPage!==page){const result=await monthPage(actualPage);if(result.error)throw new Error('Não foi possível carregar as mensalidades.');list=result.data??[]}
  const dailyItems=dailyResult.data??[]
  const dailySplit=paymentTotals(dailyItems),monthlySplit=summaryResult.data.methods as {dinheiro:number;pix:number;debito:number;credito:number}
  for(const inv of weekResult.data??[]){
    if(!inv.paid_at)continue
    const bucket=past7Days.find(day=>day.date===getBrDateStr(inv.paid_at))
    if(!bucket)continue
    const split=paymentTotals([inv])
    bucket.total+=Number(inv.paid_amount??inv.amount);bucket.dinheiro+=split.dinheiro;bucket.pix+=split.pix;bucket.cartao+=split.debito+split.credito
  }
  return {
    invoices:list,stats,targetMonth,targetDate,todayStr,filterCounts,currentStatus,
    pagination:{page:actualPage,pageSize,total:filteredTotal,pages},
    overdueInvoices:(overdueResult.data??[]).map(inv=>({...inv,charges:calculateOverdueCharges(Number(inv.amount),inv.due_date,todayStr)})),
    dailyCash:{date:targetDate,total:dailySplit.dinheiro+dailySplit.pix+dailySplit.debito+dailySplit.credito,...dailySplit,count:dailyItems.length,items:dailyItems},
    weeklyCash:{days:past7Days,totalWeek:past7Days.reduce((sum,day)=>sum+day.total,0)},
    monthlyCash:{month:targetMonth,totalExpected:stats.total,totalCollected:stats.collected,totalPending:stats.pending,totalOverdue:stats.overdue,collectionRate:stats.total>0?stats.collected/stats.total*100:0,dinheiro:monthlySplit.dinheiro,pix:monthlySplit.pix,cartao:monthlySplit.debito+monthlySplit.credito},
  }
}

export async function markInvoiceManualPaidAction(payload:ManualPaymentPayload,proofForm?:FormData){
 const db=await createAdminClient('finance.write');
 const checked=z.object({idempotencyKey:z.uuid(),invoiceId:z.uuid(),paymentMethod:z.enum(['dinheiro','pix','pix_whatsapp','cartao_debito','cartao_credito','misto']),receivedAmount:z.number().positive().max(1000000),overdueOption:z.enum(['standard','waive','negotiated']),paidAt:z.string().optional(),notes:z.string().max(2000).optional(),negotiationReason:z.string().max(500).optional(),hasDiscount:z.boolean().optional(),discountReason:z.string().max(500).optional(),paymentParts:z.array(z.object({method:z.enum(['dinheiro','pix','pix_whatsapp','cartao_debito','cartao_credito']),amount:z.number().positive().max(1000000)})).min(1).max(4).optional()}).safeParse(payload);
 if(!checked.success)return {success:false,error:'Revise os dados do recebimento.'};
 if(checked.data.paymentParts){const problem=paymentPartsProblem(checked.data.paymentParts,checked.data.receivedAmount);if(problem)return {success:false,error:problem};}
 if(checked.data.paymentMethod==='misto'&&(!checked.data.paymentParts||checked.data.paymentParts.length<2))return {success:false,error:'Informe as formas e os valores do pagamento dividido.'};
 let proof:Record<string,unknown>={};
 const file=proofForm?.get('proof');
 if(file){
  if(!(file instanceof File))return {success:false,error:'Selecione um arquivo de comprovante válido.'};
  const problem=paymentProofProblem(file);if(problem)return {success:false,error:problem};
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(!paymentProofHasSignature(bytes,file.type))return {success:false,error:'O conteúdo do arquivo não corresponde a um PDF ou imagem válida.'};
  const identity=await db.auth.getUser();if(identity.error||!identity.data.user)return {success:false,error:'Entre novamente antes de anexar o comprovante.'};
  const digest=createHash('sha256').update(bytes).digest('hex'),type=file.type as PaymentProofType;
  const path=`${identity.data.user.id}/${checked.data.invoiceId}/${checked.data.idempotencyKey}/${digest}.${paymentProofExtension(type)}`;
  try {
   const storage=db.storage.from(PAYMENT_PROOF_BUCKET);
   const uploaded=await storage.upload(path,bytes,{contentType:type,upsert:false});
   if(uploaded.error){
    // A retry can encounter the immutable object uploaded by the first attempt.
    const existing=await storage.download(path);
    if(existing.error||!existing.data)return {success:false,error:'Não foi possível enviar o comprovante. A baixa não foi registrada. Tente novamente.'};
    const previous=new Uint8Array(await existing.data.arrayBuffer());
    if(previous.length!==bytes.length||createHash('sha256').update(previous).digest('hex')!==digest)return {success:false,error:'O comprovante não pôde ser conferido. A baixa não foi registrada.'};
   }
  } catch {return {success:false,error:'O envio do comprovante foi interrompido. A baixa não foi registrada. Tente novamente.'};}
  proof={proofPath:path,proofName:paymentProofName(file.name,type),proofMime:type,proofSize:bytes.length};
 }
 const {data,error}=await db.rpc('record_manual_payment',{p_payload:{...checked.data,...proof}});
 if(error)return {success:false,error:error.message};
 revalidatePath('/financeiro');revalidatePath('/dashboard');revalidatePath('/alunos');return {...data,success:true};
}

export async function getFinancialAuditAction(filters: unknown, offset = 0): Promise<{ audit: FinancialAuditPage | null; error: string }> {
 const db = await createAdminClient('finance.read')
 const optionalDate = z.union([z.iso.date(), z.literal('')])
 const parsed = z.object({ start: optionalDate, end: optionalDate, action: z.enum(['all','created','payment','reversal','discount']), student: z.string().trim().max(120), actor: z.string().trim().max(120) }).safeParse(filters)
 if (!parsed.success || !Number.isInteger(offset) || offset < 0 || offset > 100000 || (parsed.data.start && parsed.data.end && parsed.data.start > parsed.data.end)) return { audit: null, error: 'Revise o período e os filtros da auditoria.' }
 const input = parsed.data
 const { data, error } = await db.rpc('financial_audit_log', { p_start: input.start || null, p_end: input.end || null, p_action: input.action, p_student: input.student, p_actor: input.actor, p_offset: offset, p_limit: 30 })
 if (error || !data || !Array.isArray(data.entries)) return { audit: null, error: 'Não foi possível carregar a auditoria financeira. Tente novamente.' }
 return { audit: data as FinancialAuditPage, error: '' }
}

export async function getInvoiceHistoryAction(invoiceId: string, offset = 0): Promise<{ history: InvoiceHistoryPage | null; error: string }> {
 const db = await createAdminClient('finance.read')
 if (!z.uuid().safeParse(invoiceId).success || !Number.isInteger(offset) || offset < 0 || offset > 100000) return { history: null, error: 'Cobrança ou página de histórico inválida.' }
 const { data, error } = await db.rpc('invoice_financial_history', { p_invoice: invoiceId, p_offset: offset, p_limit: 30 })
 if (error || !data || !Array.isArray(data.events)) return { history: null, error: 'Não foi possível carregar o histórico da cobrança. Tente novamente.' }
 return { history: data as InvoiceHistoryPage, error: '' }
}

export async function getInvoiceProofsAction(invoiceId:string){
 const db=await createAdminClient('finance.read');
 if(!z.uuid().safeParse(invoiceId).success)return {proofs:[],error:'Cobrança inválida.'};
 const {data,error}=await db.from('invoice_payments').select('id,proof_name,proof_mime,proof_size,paid_at,received_amount,payment_method,reversal:payment_reversals(id,reason,created_at)').eq('invoice_id',invoiceId).not('proof_path','is',null).order('recorded_at',{ascending:false}).limit(100);
 if(error)return {proofs:[],error:'Não foi possível carregar os comprovantes. Tente novamente.'};
 return {proofs:(data||[]).map(item=>({...item,reversal:Array.isArray(item.reversal)?item.reversal[0]||null:item.reversal})),error:''};
}
export async function revertInvoicePaymentAction(invoiceId:string,reason:string){
 const db=await createAdminClient('finance.reverse');
 if(!z.uuid().safeParse(invoiceId).success)return {success:false,error:'Cobrança inválida.'};
 const {error}=await db.rpc('reverse_manual_payment',{p_invoice:invoiceId,p_reason:reason});
 if(error)return {success:false,error:error.message};
 revalidatePath('/financeiro');revalidatePath('/dashboard');return {success:true};
}
export async function generateMonthlyInvoicesAction(referenceMonth:string){
 const db=await createAdminClient('finance.write');
 const {data,error}=await db.rpc('generate_manual_invoices',{p_month:referenceMonth});
 if(error)return {success:false,error:error.message};revalidatePath('/financeiro');revalidatePath('/dashboard');return data;
}
