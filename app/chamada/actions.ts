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
  records: Array<{ student_id: string; status: 'present' | 'absent' | 'justified'; coach_notes?: string }>,
  options: { notifyAbsents?: boolean; notifyPresences?: boolean } = { notifyAbsents: true, notifyPresences: true }
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

  // Notificações automáticas no WhatsApp para os pais
  const { sendEvolutionWhatsApp } = await import('@/lib/whatsapp/evolution')
  const formattedDate = trainingDate.split('-').reverse().join('/')
  let notificationsSent = 0

  // Busca dados dos alunos e responsáveis
  const studentIds = records.map((r) => r.student_id)
  const { data: studentsWithGuardians } = await supabase
    .from('students')
    .select('id, name, guardian:guardians(name, phone)')
    .in('id', studentIds)

  const studentMap = new Map((studentsWithGuardians || []).map((s: any) => [s.id, s]))

  for (const record of records) {
    const st: any = studentMap.get(record.student_id)
    if (!st) continue

    const guardian = Array.isArray(st.guardian) ? st.guardian[0] : st.guardian
    if (!guardian?.phone) continue

    if (record.status === 'absent' && options.notifyAbsents !== false) {
      const msg = `⚽ *Academia do Gol — Aviso de Ausência*\n\nOlá ${guardian.name || 'Responsável'}! Notamos que o atleta *${st.name}* não compareceu ao treino de hoje (${formattedDate}).\n\nAconteceu algum imprevisto ou gostaria de justificar a falta? Estamos à disposição!\n\n_Mensagem automática da Academia do Gol_`
      await sendEvolutionWhatsApp({ phone: guardian.phone, message: msg }).catch(() => {})
      notificationsSent++
    } else if (record.status === 'present' && options.notifyPresences) {
      const msg = `⚽ *Academia do Gol — Check-in de Treino*\n\nOlá ${guardian.name || 'Responsável'}! Confirmamos que o atleta *${st.name}* acabou de se apresentar e já está em campo para o treino de hoje (${formattedDate})!\n\n_Check-in oficial da Academia do Gol_`
      await sendEvolutionWhatsApp({ phone: guardian.phone, message: msg }).catch(() => {})
      notificationsSent++
    }
  }

  revalidatePath('/chamada')
  revalidatePath('/dashboard')
  return { success: true, notificationsSent }
}

// Disparo imediato individual de WhatsApp ao marcar presença ou falta
export async function notifySingleStudentAttendanceAction(
  studentId: string,
  trainingDate: string,
  status: 'present' | 'absent' | 'justified',
  classId?: string
) {
  const supabase = createAdminClient()

  if (classId) {
    await supabase.from('attendance_logs').upsert(
      {
        class_id: classId,
        training_date: trainingDate,
        student_id: studentId,
        status,
      },
      { onConflict: 'class_id,training_date,student_id' }
    )
  }

  const { data: student } = await supabase
    .from('students')
    .select('id, name, guardian:guardians(name, phone)')
    .eq('id', studentId)
    .single()

  if (!student) return { success: false, error: 'Aluno não encontrado' }

  const guardian = Array.isArray(student.guardian) ? student.guardian[0] : student.guardian
  if (!guardian?.phone) {
    return { success: false, error: 'Responsável sem telefone cadastrado' }
  }

  const { sendEvolutionWhatsApp } = await import('@/lib/whatsapp/evolution')
  const formattedDate = trainingDate.split('-').reverse().join('/')

  let msg = ''
  if (status === 'present') {
    msg = `⚽ *Academia do Gol — Check-in de Treino*\n\nOlá ${guardian.name || 'Responsável'}! Confirmamos que o atleta *${student.name}* acabou de se apresentar e já está em campo para o treino de hoje (${formattedDate})!\n\n_Check-in oficial da Academia do Gol_`
  } else if (status === 'absent') {
    msg = `⚽ *Academia do Gol — Aviso de Ausência*\n\nOlá ${guardian.name || 'Responsável'}! Notamos que o atleta *${student.name}* não compareceu ao treino de hoje (${formattedDate}).\n\nAconteceu algum imprevisto ou gostaria de justificar a falta? Estamos à disposição!\n\n_Mensagem automática da Academia do Gol_`
  } else {
    msg = `⚽ *Academia do Gol — Falta Justificada*\n\nOlá ${guardian.name || 'Responsável'}! Registramos a justificativa de ausência do atleta *${student.name}* para o treino de hoje (${formattedDate}). Obrigado pelo aviso!\n\n_Academia do Gol_`
  }

  const res = await sendEvolutionWhatsApp({ phone: guardian.phone, message: msg })
  revalidatePath('/chamada')
  return {
    success: res.success,
    message: res.success
      ? `Notificação WhatsApp enviada para ${guardian.name || 'o responsável'}!`
      : `Erro WhatsApp: ${res.error || 'Falha no envio'}`,
  }
}
