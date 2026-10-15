'use server'

import {z} from 'zod'
import {revalidatePath} from 'next/cache'
import {createAdminClient} from '@/lib/supabase/admin'

export async function completeImportedEnrollmentAction(payload:unknown){
 const db=await createAdminClient('students.write')
 const input=z.object({enrollmentId:z.uuid(),studentId:z.uuid(),classId:z.uuid(),planId:z.union([z.uuid(),z.literal('')]),monthlyFee:z.number().min(0).max(100000).refine(v=>Math.abs(v*100-Math.round(v*100))<0.00001),dueDay:z.number().int().min(1).max(31)}).safeParse(payload)
 if(!input.success)return {error:'Revise a turma, o valor e o vencimento.'}
 const p=input.data
 const {data:enrollment,error:readError}=await db.from('enrollments').select('student_id').eq('id',p.enrollmentId).maybeSingle()
 if(readError||enrollment?.student_id!==p.studentId)return {error:'Matrícula indisponível. Atualize a página.'}
 const {error}=await db.rpc('complete_imported_enrollment',{p_enrollment:p.enrollmentId,p_class:p.classId,p_plan:p.planId||null,p_fee:p.monthlyFee,p_due_day:p.dueDay})
 if(error)return {error:error.message}
 for(const path of ['/alunos',`/alunos/${p.studentId}`,'/turmas','/chamada','/financeiro'])revalidatePath(path)
 return {success:true}
}
