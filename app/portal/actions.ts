'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function getStudentPortalData(token: string) {
  const supabase = createAdminClient()

  // 1. Busca aluno pelo portal_token
  const { data: student, error } = await supabase
    .from('students')
    .select(`
      *,
      guardian:guardians(*),
      medical_record:medical_records(*),
      enrollment:enrollments(
        *,
        plan:plans(*),
        class:classes(*, unit:units(name), coach:coaches(name, phone), category:categories(name))
      ),
      invoices:invoices(*)
    `)
    .eq('portal_token', token)
    .single()

  if (error || !student) {
    return null
  }

  // 2. Busca histórico recente de presença
  const { data: attendance } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('student_id', student.id)
    .order('training_date', { ascending: false })
    .limit(10)

  // 3. Busca última avaliação técnica
  const { data: evaluation } = await supabase
    .from('technical_evaluations')
    .select('*, coach:coaches(name)')
    .eq('student_id', student.id)
    .order('evaluation_date', { ascending: false })
    .limit(1)
    .single()

  // 4. Busca próximas partidas/jogos convocados
  const { data: callups } = await supabase
    .from('match_callups')
    .select('*, match:matches(*)')
    .eq('student_id', student.id)
    .order('created_at', { ascending: false })
    .limit(3)

  return {
    student,
    attendance: attendance ?? [],
    evaluation: evaluation ?? null,
    callups: callups ?? [],
  }
}
