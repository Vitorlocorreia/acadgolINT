'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function getClassesList(unitId?: string) {
  const supabase = createAdminClient()

  let query = supabase
    .from('classes')
    .select(`
      *,
      unit:units(name),
      category:categories(name, min_age, max_age),
      coach:coaches(name, phone),
      enrollments:enrollments(id, status, student:students(id, name, status))
    `)
    .order('start_time', { ascending: true })

  if (unitId && unitId !== 'all') {
    query = query.eq('unit_id', unitId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Erro ao buscar turmas:', error)
    return []
  }

  return (data ?? []).map((cls: any) => {
    const activeEnrollments = (cls.enrollments ?? []).filter((e: any) => e.status === 'active' && e.student?.status === 'active')
    return {
      ...cls,
      active_students_count: activeEnrollments.length,
    }
  })
}

export async function getUnitsAndCategoriesForClasses() {
  const supabase = createAdminClient()

  const [unitsRes, categoriesRes, coachesRes] = await Promise.all([
    supabase.from('units').select('*').eq('is_active', true).order('name'),
    supabase.from('categories').select('*').order('min_age'),
    supabase.from('coaches').select('*').eq('is_active', true).order('name'),
  ])

  return {
    units: unitsRes.data ?? [],
    categories: categoriesRes.data ?? [],
    coaches: coachesRes.data ?? [],
  }
}

export async function createClassAction(formData: FormData) {
  const supabase = createAdminClient()

  const rawDays = formData.getAll('days_of_week')
  const days_of_week = rawDays.length > 0 ? rawDays : ['ter', 'qui']

  const newClass = {
    name: String(formData.get('name')),
    unit_id: String(formData.get('unit_id')),
    category_id: String(formData.get('category_id')),
    coach_id: formData.get('coach_id') ? String(formData.get('coach_id')) : null,
    days_of_week: days_of_week,
    start_time: String(formData.get('start_time')),
    end_time: String(formData.get('end_time')),
    max_students: parseInt(String(formData.get('max_students') || '20')),
    is_active: true,
  }

  const { error } = await supabase.from('classes').insert(newClass)

  if (error) {
    throw new Error('Erro ao criar turma: ' + error.message)
  }

  revalidatePath('/turmas')
  revalidatePath('/chamada')
  revalidatePath('/dashboard')
  redirect('/turmas')
}
