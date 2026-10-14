'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function getTrialClasses() {
  const supabase = createAdminClient()

  const { data: trials, error } = await supabase
    .from('trial_classes')
    .select('*, unit:units(name), category:categories(name)')
    .order('scheduled_date', { ascending: true })

  if (error) {
    console.error('Erro ao buscar aulas experimentais:', error)
    return []
  }

  // Enriquecer trials com dados da turma vinculada (armazenada em feedback)
  const enrichedTrials = await Promise.all(
    (trials ?? []).map(async (t) => {
      let classData = null
      let parsedClassId: string | null = null
      let userNotes = t.feedback

      if (t.feedback) {
        try {
          const parsed = JSON.parse(t.feedback)
          parsedClassId = parsed.class_id || null
          userNotes = parsed.userNotes ?? ''
        } catch {
          // Formato texto livre antigo
        }
      }

      if (parsedClassId) {
        const { data: cls } = await supabase
          .from('classes')
          .select('id, name, start_time, end_time, days_of_week')
          .eq('id', parsedClassId)
          .single()
        classData = cls
      }

      return {
        ...t,
        class_id: parsedClassId,
        class_info: classData,
        display_notes: userNotes,
      }
    })
  )

  return enrichedTrials
}

export async function getUnitsAndCategoriesForTrials() {
  const supabase = createAdminClient()

  const [unitsRes, categoriesRes, classesRes] = await Promise.all([
    supabase.from('units').select('*').eq('is_active', true).order('name'),
    supabase.from('categories').select('*').order('min_age'),
    supabase
      .from('classes')
      .select(`
        id,
        name,
        start_time,
        end_time,
        days_of_week,
        unit_id,
        category_id,
        unit:units(name),
        category:categories(name)
      `)
      .eq('is_active', true)
      .order('name'),
  ])

  return {
    units: unitsRes.data ?? [],
    categories: categoriesRes.data ?? [],
    classes: classesRes.data ?? [],
  }
}

export async function createTrialClassAction(formData: FormData) {
  const supabase = createAdminClient()

  const studentName = String(formData.get('student_name'))
  const rawAge = formData.get('student_age') ? parseInt(String(formData.get('student_age'))) : null
  const guardianName = String(formData.get('guardian_name'))
  const guardianPhone = String(formData.get('guardian_phone'))
  const guardianEmail = formData.get('guardian_email') ? String(formData.get('guardian_email')) : null
  const classId = formData.get('class_id') ? String(formData.get('class_id')) : null
  const scheduledDate = String(formData.get('scheduled_date'))
  const userNotes = formData.get('feedback') ? String(formData.get('feedback')) : ''

  let unitId = formData.get('unit_id') ? String(formData.get('unit_id')) : null
  let categoryId = formData.get('category_id') ? String(formData.get('category_id')) : null
  let scheduledTime = formData.get('scheduled_time') ? String(formData.get('scheduled_time')) : null

  // Se uma turma foi selecionada, herda automaticamente unidade, categoria e horário
  if (classId) {
    const { data: cls } = await supabase
      .from('classes')
      .select('unit_id, category_id, start_time')
      .eq('id', classId)
      .single()

    if (cls) {
      if (!unitId) unitId = cls.unit_id
      if (!categoryId) categoryId = cls.category_id
      if (!scheduledTime && cls.start_time) scheduledTime = cls.start_time
    }
  }

  // 1. Cadastra o aluno em `students` com status 'trial' para aparecer na chamada
  const currentYear = new Date().getFullYear()
  const birthYear = rawAge ? currentYear - rawAge : currentYear - 8
  const birthDate = `${birthYear}-01-01`

  const { data: newStudent, error: studentError } = await supabase
    .from('students')
    .insert({
      name: studentName,
      birth_date: birthDate,
      status: 'trial',
      preferred_position: 'A definir',
      dominant_foot: 'Destro',
    })
    .select('id')
    .single()

  if (studentError) {
    console.error('Erro ao cadastrar aluno teste em students:', studentError)
  }

  if (newStudent) {
    // 2. Cadastra o responsável em `guardians`
    await supabase.from('guardians').insert({
      student_id: newStudent.id,
      name: guardianName,
      relationship: 'Responsável',
      cpf: '000.000.000-00',
      phone: guardianPhone,
      email: guardianEmail,
      receives_notifications: true,
    })

    // 3. Se houver turma, matricula na turma com status 'trial' para figurar na lista da chamada
    if (classId) {
      const { data: defaultPlan } = await supabase.from('plans').select('id').limit(1).single()
      await supabase.from('enrollments').insert({
        student_id: newStudent.id,
        class_id: classId,
        plan_id: defaultPlan?.id || '00000000-0000-0000-0000-000000000000',
        start_date: scheduledDate,
        due_day: 10,
        monthly_fee: 0,
        status: 'trial',
        notes: `Aula Experimental Agendada para ${scheduledDate}`,
      })
    }
  }

  // 4. Cria o registro na tabela `trial_classes` do funil de captação
  const structuredFeedback = JSON.stringify({
    class_id: classId,
    student_id: newStudent?.id || null,
    userNotes,
  })

  const trialData = {
    student_name: studentName,
    student_age: rawAge,
    guardian_name: guardianName,
    guardian_phone: guardianPhone,
    guardian_email: guardianEmail,
    unit_id: unitId,
    category_id: categoryId,
    scheduled_date: scheduledDate,
    scheduled_time: scheduledTime,
    status: 'scheduled',
    feedback: structuredFeedback,
  }

  const { error } = await supabase.from('trial_classes').insert(trialData)

  if (error) {
    throw new Error('Erro ao agendar aula experimental: ' + error.message)
  }

  revalidatePath('/experimentais')
  revalidatePath('/chamada')
  revalidatePath('/dashboard')
  redirect('/experimentais')
}

export async function updateTrialStatusAction(trialId: string, status: string) {
  const supabase = createAdminClient()

  const { data: trial } = await supabase
    .from('trial_classes')
    .select('*')
    .eq('id', trialId)
    .single()

  let studentId: string | null = null
  if (trial?.feedback) {
    try {
      const parsed = JSON.parse(trial.feedback)
      studentId = parsed.student_id
    } catch {}
  }

  // Se o aluno foi matriculado, promove o status para 'active'
  if (status === 'enrolled' && studentId) {
    await supabase.from('students').update({ status: 'active' }).eq('id', studentId)
    await supabase
      .from('enrollments')
      .update({ status: 'active', notes: 'Matriculado após Aula Experimental' })
      .eq('student_id', studentId)
  }

  const { error } = await supabase
    .from('trial_classes')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', trialId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/experimentais')
  revalidatePath('/chamada')
  revalidatePath('/dashboard')
  return { success: true }
}
