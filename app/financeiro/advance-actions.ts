'use server'

import {z} from 'zod'
import {revalidatePath} from 'next/cache'
import {createAdminClient} from '@/lib/supabase/admin'

const monthSchema=z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/)
const studentSchema=z.object({id:z.uuid(),name:z.string(),guardian_name:z.string(),monthly_fee:z.coerce.number(),due_day:z.number().int().min(1).max(31)})
const invoiceSchema=z.object({id:z.uuid(),reference_month:monthSchema,due_date:z.string(),amount:z.coerce.number().positive(),status:z.enum(['pending','overdue','unconfirmed']),charge_type:z.literal('monthly'),student:z.object({id:z.uuid(),name:z.string()})})
export type AdvanceStudent=z.infer<typeof studentSchema>
export type AdvanceInvoice=z.infer<typeof invoiceSchema>
export interface AdvanceStudentDirectory{students:AdvanceStudent[];total:number;page:number;pages:number;pageSize:25}

export async function getAdvanceStudentDirectoryAction(search:string,page=1){
 const db=await createAdminClient('finance.write')
 const input=z.object({search:z.string().trim().max(120),page:z.number().int().min(1).max(100000)}).safeParse({search,page})
 if(!input.success)return {success:false as const,error:'Revise a pesquisa de atletas.'}
 const {data,error}=await db.rpc('finance_advance_student_directory',{p_search:input.data.search,p_page:input.data.page})
 if(error)return {success:false as const,error:error.message}
 const result=z.object({students:z.array(studentSchema).max(25),total:z.number().int().nonnegative(),page:z.number().int().positive(),pages:z.number().int().positive(),pageSize:z.literal(25)}).safeParse(data)
 if(!result.success)return {success:false as const,error:'Não foi possível carregar a lista de atletas. Tente novamente.'}
 return {success:true as const,directory:result.data}
}

export async function prepareAdvanceInvoicesAction(studentIds:string[],month:string){
 const db=await createAdminClient('finance.write')
 const input=z.object({studentIds:z.array(z.uuid()).min(1).max(50).refine(ids=>new Set(ids).size===ids.length),month:monthSchema}).safeParse({studentIds,month})
 if(!input.success)return {success:false as const,error:'Selecione de 1 a 50 atletas e informe um mês válido.'}
 const {data,error}=await db.rpc('prepare_advance_monthly_invoices',{p_students:input.data.studentIds,p_month:input.data.month})
 if(error)return {success:false as const,error:error.message}
 const result=z.object({success:z.literal(true),createdCount:z.number().int().min(0).max(input.data.studentIds.length),invoices:z.array(invoiceSchema).length(input.data.studentIds.length)}).safeParse(data)
 if(!result.success||new Set(result.data.invoices.map(invoice=>invoice.student.id)).size!==input.data.studentIds.length
  ||result.data.invoices.some(invoice=>invoice.reference_month!==input.data.month||!input.data.studentIds.includes(invoice.student.id))){
  return {success:false as const,error:'Não foi possível conferir todas as mensalidades. Atualize a consulta antes de tentar novamente.'}
 }
 revalidatePath('/financeiro');revalidatePath('/dashboard')
 return result.data
}

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
