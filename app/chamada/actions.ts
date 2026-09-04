'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function getClassesForAttendance() {
  const supabase = createAdminClient()

  const { data: classes } = await supabase
    .from('classes')
    .select('id, name, start_time, end_time, unit:units(name), category:categories(name)')
    .eq('is_active', true)
    .order('start_time')

  return classes ?? []
}

export async function getClassStudentsAndAttendance(classId: string, trainingDate: string) {
  const supabase = createAdminClient()

  // 1. Busca alunos matriculados ativos na turma
  const { data: enrollments, error: enrollError } = await supabase
    .from('enrollments')
    .select(`
      id,
      student_id,
      student:students(id, name, photo_url, preferred_position, uniform_size, status)
    `)
    .eq('class_id', classId)
    .eq('status', 'active')

  if (enrollError) {
    console.error('Erro ao buscar alunos da turma:', enrollError)
    return { students: [], logs: [] }
  }

  const students = (enrollments ?? [])
    .map((e: any) => e.student)
    .filter((s: any) => s && s.status === 'active')

  // 2. Busca chamada já realizada para essa data se existir
  const { data: logs } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('class_id', classId)
    .eq('training_date', trainingDate)

  return {
    students,
    logs: logs ?? [],
  }
}

export async function saveAttendanceAction(
  classId: string,
  trainingDate: string,
  records: Array<{ student_id: string; status: 'present' | 'absent' | 'justified'; coach_notes?: string }>
) {
  const supabase = createAdminClient()

  const rows = records.map((r) => ({
    class_id: classId,
    training_date: trainingDate,
    student_id: r.student_id,
    status: r.status,
    coach_notes: r.coach_notes || null,
  }))

  const { error } = await supabase
    .from('attendance_logs')
    .upsert(rows, { onConflict: 'class_id,training_date,student_id' })

  if (error) {
    return { success: false, error: error.message }
  }

  // Disparo automático de aviso de falta no WhatsApp para os pais
  const absentRecords = records.filter((r) => r.status === 'absent')
  if (absentRecords.length > 0) {
    const studentIds = absentRecords.map((r) => r.student_id)
    const { data: absentStudents } = await supabase
      .from('students')
      .select('id, name, guardian:guardians(name, phone)')
      .in('id', studentIds)

    if (absentStudents && absentStudents.length > 0) {
      const { sendEvolutionWhatsApp } = await import('@/lib/whatsapp/evolution')
      for (const st of absentStudents) {
        const guardian = Array.isArray(st.guardian) ? st.guardian[0] : st.guardian
        if (guardian?.phone) {
          const formattedDate = trainingDate.split('-').reverse().join('/')
          const msg = `⚽ *Academia do Gol — Aviso de Ausência*\n\nOlá ${guardian.name || 'Responsável'}! Notamos que o atleta *${st.name}* não compareceu ao treino de hoje (${formattedDate}).\n\nAconteceu algum imprevisto ou gostaria de justificar a falta? Estamos à disposição!\n\n_Mensagem automática da Academia do Gol_`
          await sendEvolutionWhatsApp({ phone: guardian.phone, message: msg }).catch(() => {})
        }
      }
    }
  }

  revalidatePath('/chamada')
  revalidatePath('/dashboard')
  return { success: true, absentsNotified: absentRecords.length }
}
