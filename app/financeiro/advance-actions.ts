'use server'

import {z} from 'zod'
import {revalidatePath} from 'next/cache'
import {createAdminClient} from '@/lib/supabase/admin'

const monthSchema=z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/)
const studentSchema=z.object({id:z.uuid(),name:z.string(),guardian_name:z.string(),monthly_fee:z.coerce.number(),due_day:z.number().int().min(1).max(31)})
const invoiceSchema=z.object({id:z.uuid(),reference_month:monthSchema,due_date:z.string(),amount:z.coerce.number().positive(),status:z.enum(['pending','overdue','unconfirmed']),charge_type:z.literal('monthly'),student:z.object({id:z.uuid(),name:z.string()})})
export type AdvanceStudent=z.infer<typeof studentSchema>
export type AdvanceInvoice=z.infer<typeof invoiceSchema>

export async function searchAdvanceStudentsAction(search:string){
 const db=await createAdminClient('finance.write')
 const input=z.string().trim().min(2).max(120).safeParse(search)
 if(!input.success)return {success:false as const,error:'Digite pelo menos dois caracteres do nome.'}
 const {data,error}=await db.rpc('finance_advance_students',{p_search:input.data})
 if(error)return {success:false as const,error:error.message}
 const result=z.array(studentSchema).max(20).safeParse(data)
 if(!result.success)return {success:false as const,error:'Não foi possível consultar os atletas. Tente novamente.'}
 return {success:true as const,students:result.data}
}

export async function prepareAdvanceInvoiceAction(studentId:string,month:string){
 const db=await createAdminClient('finance.write')
 const input=z.object({studentId:z.uuid(),month:monthSchema}).safeParse({studentId,month})
 if(!input.success)return {success:false as const,error:'Informe um atleta e um mês válido.'}
 const {data,error}=await db.rpc('prepare_advance_monthly_invoice',{p_student:input.data.studentId,p_month:input.data.month})
 if(error)return {success:false as const,error:error.message}
 const result=z.object({success:z.literal(true),created:z.boolean(),invoice:invoiceSchema}).safeParse(data)
 if(!result.success)return {success:false as const,error:'Não foi possível conferir a mensalidade. Atualize a consulta antes de tentar novamente.'}
 revalidatePath('/financeiro');revalidatePath('/dashboard')
 return result.data
}
