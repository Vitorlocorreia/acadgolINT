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

  // 1. Busca alunos matriculados ativos E experimentais vinculados a esta turma
  const { data: enrollments, error: enrollError } = await supabase
    .from('enrollments')
    .select(`
      id,
      student_id,
      status,
      notes,
      student:students(id, name, photo_url, preferred_position, uniform_size, status)
    `)
    .eq('class_id', classId)
    .in('status', ['active', 'trial'])

  if (enrollError) {
    console.error('Erro ao buscar alunos da turma:', enrollError)
    return { students: [], logs: [] }
  }

  const students = (enrollments ?? [])
    .map((e: any) => {
      if (!e.student) return null
      const isTrial =
        e.status === 'trial' ||
        e.student.status === 'trial' ||
        (e.notes && e.notes.toLowerCase().includes('experimental'))

      return {
        ...e.student,
        is_trial: Boolean(isTrial),
        enrollment_id: e.id,
      }
    })
    .filter((s: any) => s && (s.status === 'active' || s.status === 'trial'))
    // Ordenação: regulares e experimentais em ordem alfabética
    .sort((a: any, b: any) => a.name.localeCompare(b.name))

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

  // Sincroniza presença de alunos experimentais na tabela trial_classes
  const presentStudentIds = records.filter((r) => r.status === 'present').map((r) => r.student_id)
  if (presentStudentIds.length > 0) {
    const { data: allTrials } = await supabase
      .from('trial_classes')
      .select('id, feedback')
      .eq('status', 'scheduled')

    for (const t of allTrials || []) {
      if (t.feedback) {
        try {
          const parsed = JSON.parse(t.feedback)
          if (parsed.student_id && presentStudentIds.includes(parsed.student_id)) {
            await supabase.from('trial_classes').update({ status: 'attended' }).eq('id', t.id)
          }
        } catch {}
      }
    }
  }

  // Notificações automáticas no WhatsApp para os pais
  const { sendEvolutionWhatsApp } = await import('@/lib/whatsapp/evolution')
  const formattedDate = trainingDate.split('-').reverse().join('/')
  let notificationsSent = 0

  // Busca dados dos alunos e responsáveis com filtro de receives_notifications
  const studentIds = records.map((r) => r.student_id)
  const { data: studentsWithGuardians } = await supabase
    .from('students')
    .select('id, name, guardian:guardians(name, phone, receives_notifications)')
    .in('id', studentIds)

  const studentMap = new Map((studentsWithGuardians || []).map((s: any) => [s.id, s]))

  for (const record of records) {
    const st: any = studentMap.get(record.student_id)
    if (!st) continue

    const rawGuardians = Array.isArray(st.guardian) ? st.guardian : st.guardian ? [st.guardian] : []
    const targets = rawGuardians.filter((g: any) => g.receives_notifications !== false && g.phone)
    const finalTargets = targets.length > 0 ? targets : rawGuardians.filter((g: any) => g.phone).slice(0, 1)

    for (const guardian of finalTargets) {
      if (record.status === 'absent' && options.notifyAbsents !== false) {
        const msg = `⚽ *Sport Club do Recife — Aviso de Ausência*\n\nOlá ${guardian.name || 'Responsável'}! Notamos que o atleta *${st.name}* não compareceu ao treino de hoje (${formattedDate}).\n\nAconteceu algum imprevisto ou gostaria de justificar a falta? Estamos à disposição!\n\n_Pelo Sport tudo! 🔴⚫_`
        await sendEvolutionWhatsApp({ phone: guardian.phone, message: msg }).catch(() => {})
        notificationsSent++
      } else if (record.status === 'present' && options.notifyPresences) {
        const msg = `⚽ *Sport Club do Recife — Check-in de Treino*\n\nOlá ${guardian.name || 'Responsável'}! Confirmamos que o atleta *${st.name}* acabou de se apresentar e já está em campo para o treino de hoje (${formattedDate})!\n\n_Pelo Sport tudo! 🔴⚫_`
        await sendEvolutionWhatsApp({ phone: guardian.phone, message: msg }).catch(() => {})
        notificationsSent++
      }
    }
  }

  revalidatePath('/chamada')
  revalidatePath('/experimentais')
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
    .select('id, name, guardian:guardians(name, phone, receives_notifications)')
    .eq('id', studentId)
    .single()

  if (!student) return { success: false, error: 'Aluno não encontrado' }

  const rawGuardians = Array.isArray(student.guardian)
    ? student.guardian
    : student.guardian
    ? [student.guardian]
    : []
  const targets = rawGuardians.filter((g: any) => g.receives_notifications !== false && g.phone)
  const finalTargets = targets.length > 0 ? targets : rawGuardians.filter((g: any) => g.phone).slice(0, 1)

  if (finalTargets.length === 0) {
    return { success: false, error: 'Nenhum responsável com telefone para envio' }
  }

  const { sendEvolutionWhatsApp } = await import('@/lib/whatsapp/evolution')
  const formattedDate = trainingDate.split('-').reverse().join('/')

  let sentCount = 0
  for (const guardian of finalTargets) {
    let msg = ''
    if (status === 'present') {
      msg = `⚽ *Academia do Gol — Check-in de Treino*\n\nOlá ${guardian.name || 'Responsável'}! Confirmamos que o atleta *${student.name}* acabou de se apresentar e já está em campo para o treino de hoje (${formattedDate})!\n\n_Check-in oficial da Academia do Gol_`
    } else if (status === 'absent') {
      msg = `⚽ *Academia do Gol — Aviso de Ausência*\n\nOlá ${guardian.name || 'Responsável'}! Notamos que o atleta *${student.name}* não compareceu ao treino de hoje (${formattedDate}).\n\nAconteceu algum imprevisto ou gostaria de justificar a falta? Estamos à disposição!\n\n_Mensagem automática da Academia do Gol_`
    } else {
      msg = `⚽ *Academia do Gol — Falta Justificada*\n\nOlá ${guardian.name || 'Responsável'}! Registramos a justificativa de ausência do atleta *${student.name}* para o treino de hoje (${formattedDate}). Obrigado pelo aviso!\n\n_Academia do Gol_`
    }

    const res = await sendEvolutionWhatsApp({ phone: guardian.phone, message: msg })
    if (res.success) sentCount++
  }

  revalidatePath('/chamada')
  return {
    success: sentCount > 0,
    message: sentCount > 0
      ? `Notificação WhatsApp enviada para ${sentCount} responsável(is)!`
      : `Não foi possível enviar a mensagem no WhatsApp.`,
  }
}

export async function getAttendanceHistory(classId?: string, limit: number = 30) {
  const supabase = createAdminClient()

  let query = supabase
    .from('attendance_logs')
    .select(`
      id,
      training_date,
      class_id,
      student_id,
      status,
      coach_notes,
      student:students(id, name, preferred_position, uniform_size),
      class:classes(id, name, unit:units(name), category:categories(name), coach:coaches(name))
    `)
    .order('training_date', { ascending: false })

  if (classId && classId !== 'all') {
    query = query.eq('class_id', classId)
  }

  const { data: logs, error } = await query

  if (error || !logs) {
    return []
  }

  const sessionsMap = new Map<
    string,
    {
      key: string
      date: string
      classId: string
      className: string
      unitName: string
      categoryName: string
      coachName: string
      total: number
      present: number
      absent: number
      justified: number
      attendanceRate: number
      logs: any[]
    }
  >()

  logs.forEach((log: any) => {
    const key = `${log.training_date}_${log.class_id}`
    if (!sessionsMap.has(key)) {
      sessionsMap.set(key, {
        key,
        date: log.training_date,
        classId: log.class_id,
        className: log.class?.name || 'Turma',
        unitName: log.class?.unit?.name || 'Unidade Principal',
        categoryName: log.class?.category?.name || 'Geral',
        coachName: log.class?.coach?.name || 'Treinador',
        total: 0,
        present: 0,
        absent: 0,
        justified: 0,
        attendanceRate: 0,
        logs: [],
      })
    }

    const session = sessionsMap.get(key)!
    session.total += 1
    if (log.status === 'present') session.present += 1
    else if (log.status === 'absent') session.absent += 1
    else if (log.status === 'justified') session.justified += 1
    session.logs.push(log)
  })

  sessionsMap.forEach((session) => {
    session.attendanceRate = session.total > 0 ? Math.round((session.present / session.total) * 100) : 0
  })

  return Array.from(sessionsMap.values()).slice(0, limit)
}
