'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function getStudentsList(filters?: {
  search?: string
  categoryId?: string
  unitId?: string
  status?: string
}) {
  const supabase = createAdminClient()

  let query = supabase
    .from('students')
    .select(`
      *,
      guardian:guardians(*),
      medical_record:medical_records(*),
      enrollment:enrollments(
        id, status, monthly_fee, due_day,
        class:classes(id, name, unit:units(name), category:categories(name), coach:coaches(name)),
        plan:plans(name)
      )
    `)
    .order('name', { ascending: true })

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query

  if (error) {
    console.error('Erro ao buscar alunos:', error)
    return []
  }

  let results = data ?? []

  if (filters?.search) {
    const s = filters.search.toLowerCase()
    results = results.filter((st: any) =>
      st.name.toLowerCase().includes(s) ||
      st.guardian?.name?.toLowerCase().includes(s) ||
      st.guardian?.phone?.includes(s)
    )
  }

  return results
}

export async function getFormDataForEnrollment() {
  const supabase = createAdminClient()

  const [unitsRes, categoriesRes, plansRes, classesRes, coachesRes] = await Promise.all([
    supabase.from('units').select('*').eq('is_active', true).order('name'),
    supabase.from('categories').select('*').order('min_age'),
    supabase.from('plans').select('*').eq('is_active', true).order('price'),
    supabase.from('classes').select('*, unit:units(name), category:categories(name)').eq('is_active', true),
    supabase.from('coaches').select('*').eq('is_active', true).order('name'),
  ])

  return {
    units: unitsRes.data ?? [],
    categories: categoriesRes.data ?? [],
    plans: plansRes.data ?? [],
    classes: classesRes.data ?? [],
    coaches: coachesRes.data ?? [],
  }
}

export async function createStudentEnrollmentAction(formData: FormData) {
  const supabase = createAdminClient()

  // 1. Dados do Atleta
  const studentData = {
    name: String(formData.get('name')),
    birth_date: String(formData.get('birth_date')),
    cpf: formData.get('cpf') ? String(formData.get('cpf')) : null,
    rg: formData.get('rg') ? String(formData.get('rg')) : null,
    preferred_position: String(formData.get('preferred_position') || 'Meia'),
    dominant_foot: String(formData.get('dominant_foot') || 'Destro'),
    uniform_size: String(formData.get('uniform_size') || '10'),
    status: 'active',
  }

  const { data: student, error: studentError } = await supabase
    .from('students')
    .insert(studentData)
    .select('id')
    .single()

  if (studentError || !student) {
    throw new Error('Erro ao cadastrar aluno: ' + (studentError?.message || 'Falha no banco.'))
  }

  const studentId = student.id

  // 2. Dados do Responsável
  const guardianData = {
    student_id: studentId,
    name: String(formData.get('guardian_name')),
    relationship: String(formData.get('relationship') || 'Pai/Mãe'),
    cpf: String(formData.get('guardian_cpf')),
    phone: String(formData.get('guardian_phone')),
    email: formData.get('guardian_email') ? String(formData.get('guardian_email')) : null,
    address: formData.get('address') ? String(formData.get('address')) : null,
    city: String(formData.get('city') || 'Recife'),
    state: String(formData.get('state') || 'PE'),
    zip_code: formData.get('zip_code') ? String(formData.get('zip_code')) : null,
  }

  await supabase.from('guardians').insert(guardianData)

  // 3. Ficha Médica
  const medicalData = {
    student_id: studentId,
    blood_type: formData.get('blood_type') ? String(formData.get('blood_type')) : null,
    allergies: formData.get('allergies') ? String(formData.get('allergies')) : null,
    continuous_medications: formData.get('continuous_medications') ? String(formData.get('continuous_medications')) : null,
    health_insurance: formData.get('health_insurance') ? String(formData.get('health_insurance')) : null,
    emergency_contact_name: formData.get('emergency_contact_name') ? String(formData.get('emergency_contact_name')) : null,
    emergency_contact_phone: formData.get('emergency_contact_phone') ? String(formData.get('emergency_contact_phone')) : null,
    medical_notes: formData.get('medical_notes') ? String(formData.get('medical_notes')) : null,
    has_medical_clearance: true,
    image_use_authorized: formData.get('image_use_authorized') === 'true',
  }

  await supabase.from('medical_records').insert(medicalData)

  // 4. Matrícula na Turma
  const classId = formData.get('class_id') ? String(formData.get('class_id')) : null
  const planId = formData.get('plan_id') ? String(formData.get('plan_id')) : null
  const dueDay = parseInt(String(formData.get('due_day') || '10'))
  const monthlyFee = parseFloat(String(formData.get('monthly_fee') || '180'))

  if (classId && planId) {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .insert({
        student_id: studentId,
        class_id: classId,
        plan_id: planId,
        start_date: new Date().toISOString().slice(0, 10),
        due_day: dueDay,
        monthly_fee: monthlyFee,
        status: 'active',
      })
      .select('id')
      .single()

    // 5. Gera a 1ª Mensalidade automaticamente
    const now = new Date()
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const dueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`

    await supabase.from('invoices').insert({
      enrollment_id: enrollment?.id || null,
      student_id: studentId,
      reference_month: currentMonthStr,
      due_date: dueDate,
      amount: monthlyFee,
      status: 'pending',
      pix_code: `00020101021226830014br.gov.bcb.pix2561pix.academiadogol.com.br/mensalidade/${studentId}5204000053039865405${monthlyFee.toFixed(2)}5802BR5916Academia do Gol6009Recife62070503***6304`,
    })
  }

  revalidatePath('/alunos')
  revalidatePath('/dashboard')
  redirect('/alunos')
}

export async function getStudentById(id: string) {
  const supabase = createAdminClient()

  const { data: student, error } = await supabase
    .from('students')
    .select(`
      *,
      guardian:guardians(*),
      medical_record:medical_records(*),
      enrollment:enrollments(
        id, status, monthly_fee, due_day, start_date,
        class:classes(id, name, start_time, end_time, days_of_week, unit:units(name), category:categories(name), coach:coaches(name, phone)),
        plan:plans(name, duration_months, includes_uniform)
      ),
      invoices:invoices(*),
      evaluations:technical_evaluations(*, coach:coaches(name))
    `)
    .eq('id', id)
    .single()

  if (error || !student) {
    return null
  }

  // Busca histórico de presenças
  const { data: attendance } = await supabase
    .from('attendance_logs')
    .select('*, class:classes(name)')
    .eq('student_id', id)
    .order('training_date', { ascending: false })
    .limit(20)

  return {
    ...student,
    attendance: attendance ?? [],
  }
}
