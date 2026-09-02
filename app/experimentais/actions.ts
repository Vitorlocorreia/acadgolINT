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

  return trials ?? []
}

export async function getUnitsAndCategoriesForTrials() {
  const supabase = createAdminClient()

  const [unitsRes, categoriesRes] = await Promise.all([
    supabase.from('units').select('*').eq('is_active', true).order('name'),
    supabase.from('categories').select('*').order('min_age'),
  ])

  return {
    units: unitsRes.data ?? [],
    categories: categoriesRes.data ?? [],
  }
}

export async function createTrialClassAction(formData: FormData) {
  const supabase = createAdminClient()

  const trialData = {
    student_name: String(formData.get('student_name')),
    student_age: formData.get('student_age') ? parseInt(String(formData.get('student_age'))) : null,
    guardian_name: String(formData.get('guardian_name')),
    guardian_phone: String(formData.get('guardian_phone')),
    guardian_email: formData.get('guardian_email') ? String(formData.get('guardian_email')) : null,
    unit_id: formData.get('unit_id') ? String(formData.get('unit_id')) : null,
    category_id: formData.get('category_id') ? String(formData.get('category_id')) : null,
    scheduled_date: String(formData.get('scheduled_date')),
    scheduled_time: formData.get('scheduled_time') ? String(formData.get('scheduled_time')) : null,
    status: 'scheduled',
    feedback: formData.get('feedback') ? String(formData.get('feedback')) : null,
  }

  const { error } = await supabase.from('trial_classes').insert(trialData)

  if (error) {
    throw new Error('Erro ao agendar aula experimental: ' + error.message)
  }

  revalidatePath('/experimentais')
  revalidatePath('/dashboard')
  redirect('/experimentais')
}

export async function updateTrialStatusAction(trialId: string, status: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('trial_classes')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', trialId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/experimentais')
  revalidatePath('/dashboard')
  return { success: true }
}
