'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export async function changeStudentDeletionAction(input: unknown) {
  const db = await createAdminClient('students.write')
  const checked = z.object({ studentId: z.uuid(), deleted: z.boolean(), reason: z.string().trim().max(500), deletedAt: z.iso.datetime({offset:true}).nullable() }).safeParse(input)
  if (!checked.success || (checked.data.deleted && checked.data.reason.length < 5) || (!checked.data.deleted && !checked.data.deletedAt)) return { error: 'Confira o atleta e informe o motivo da exclusão (mínimo de 5 caracteres).' }
  const value = checked.data
  const { error } = await db.rpc('change_student_deletion', { p_student: value.studentId, p_deleted: value.deleted, p_reason: value.reason, p_expected_deleted_at: value.deletedAt })
  if (error) return { error: error.message }
  for (const path of ['/alunos', `/alunos/${value.studentId}`, '/dashboard', '/turmas', '/chamada', '/financeiro', '/jogos', '/experimentais']) revalidatePath(path)
  return { success: true }
}
