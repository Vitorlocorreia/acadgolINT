'use server'
import {z} from 'zod'
import {revalidatePath} from 'next/cache'
import {createAdminClient} from '@/lib/supabase/admin'
import {cashReportSchema,cashDocumentSchema,closeCashInputSchema} from '@/lib/finance/cash-closing'

export async function getCashDayReportAction(date:string){
 const db=await createAdminClient('finance.read')
 if(!z.iso.date().safeParse(date).success||date<'2000-01-01')return {success:false as const,error:'Selecione uma data válida para o caixa.'}
 const {data,error}=await db.rpc('cash_day_report',{p_date:date})
 if(error)return {success:false as const,error:error.message}
 const report=cashReportSchema.safeParse(data)
 if(!report.success||report.data.date!==date||report.data.live.date!==date)return {success:false as const,error:'Não foi possível conferir o caixa. Atualize a consulta antes de fechar.'}
 return {success:true as const,report:report.data}
}
export async function closeCashDayAction(payload:unknown){
 const db=await createAdminClient('finance.write')
 const input=closeCashInputSchema.safeParse(payload)
 if(!input.success)return {success:false as const,error:'Revise a data e os valores conferidos. Use até duas casas decimais.'}
 const {data,error}=await db.rpc('close_cash_day',{p_payload:input.data})
 if(error)return {success:false as const,error:error.message}
 const result=z.object({success:z.literal(true),closureId:z.uuid(),revision:z.number().int().positive(),alreadyProcessed:z.boolean()}).safeParse(data)
 if(!result.success)return {success:false as const,error:'Não foi possível confirmar o fechamento. Consulte o dia antes de tentar novamente.'}
 revalidatePath('/financeiro')
 return result.data
}
export async function reopenCashDayAction(closureId:string,reason:string){
 const db=await createAdminClient('finance.write')
 const input=z.object({closureId:z.uuid(),reason:z.string().trim().min(5).max(500)}).safeParse({closureId,reason})
 if(!input.success)return {success:false as const,error:'Informe um motivo de 5 a 500 caracteres para reabrir.'}
 const {data,error}=await db.rpc('reopen_cash_day',{p_closure:input.data.closureId,p_reason:input.data.reason})
 if(error)return {success:false as const,error:error.message}
 const result=z.object({success:z.literal(true),alreadyReopened:z.boolean()}).safeParse(data)
 if(!result.success)return {success:false as const,error:'Não foi possível confirmar a reabertura. Atualize o dia antes de tentar novamente.'}
 revalidatePath('/financeiro')
 return result.data
}
export async function getCashClosureDocumentAction(closureId:string){
 const db=await createAdminClient('finance.read')
 if(!z.uuid().safeParse(closureId).success)return {success:false as const,error:'Fechamento inválido.'}
 const {data,error}=await db.rpc('cash_closure_document',{p_closure:closureId})
 if(error)return {success:false as const,error:error.message}
 const result=cashDocumentSchema.safeParse(data)
 if(!result.success||result.data.id!==closureId)return {success:false as const,error:'Não foi possível carregar o documento deste fechamento.'}
 return {success:true as const,document:result.data}
}
