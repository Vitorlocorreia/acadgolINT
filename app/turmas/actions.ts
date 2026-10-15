'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function getClassesList() {
  const supabase = await createAdminClient('classes.read')

  const {data,error}=await supabase.rpc('staff_class_catalog',{p_unit:null});
  if(error)throw new Error('Não foi possível carregar as turmas.');return data||[];
}


export async function getUnitsAndCategoriesForClasses() {
  const supabase = await createAdminClient('classes.read')

  const [categoriesRes, coachesRes] = await Promise.all([
    supabase.from('categories').select('*').order('min_age'),
    supabase.from('staff_profiles')
      .select('id,full_name,username,coach_id,coach:coaches!inner(id,is_active)')
      .eq('role', 'treinador').eq('active', true).eq('is_test', false)
      .eq('coach.is_active', true).order('full_name'),
  ])

  if ([categoriesRes, coachesRes].some(result => result.error)) {
    throw new Error('Não foi possível carregar as opções da turma. Tente novamente.')
  }
  return {
    categories: categoriesRes.data ?? [],
    coaches: (coachesRes.data ?? []).map(person => ({
      id: person.coach_id,
      user_id: person.id,
      name: person.full_name,
      username: person.username,
    })),
  }
}

export async function createClassAction(formData: FormData) {
  const supabase = await createAdminClient('classes.write')
  const coachId = String(formData.get('coach_id') || '').trim() || null
  if (coachId) {
    const trainer = await supabase.from('staff_profiles')
      .select('id,coach:coaches!inner(id,is_active)')
      .eq('coach_id', coachId).eq('role', 'treinador').eq('active', true)
      .eq('is_test', false).eq('coach.is_active', true).limit(1).maybeSingle()
    if (trainer.error || !trainer.data) throw new Error('Selecione um usuário ativo com cargo de treinador. Confira o cadastro em Equipe e acessos.')
  }
  let schoolUnitQuery=supabase.from('units').select('id').eq('is_active',true)
  if(process.env.SCHOOL_UNIT_ID)schoolUnitQuery=schoolUnitQuery.eq('id',process.env.SCHOOL_UNIT_ID)
  const schoolUnits=await schoolUnitQuery.limit(2)
  if(schoolUnits.error||schoolUnits.data?.length!==1)throw new Error('Não foi possível identificar a unidade da escolinha. Confira a configuração antes de cadastrar a turma.')

  const rawDays = formData.getAll('days_of_week')
  const days_of_week = rawDays.length > 0 ? rawDays : ['ter', 'qui']

  const newClass = {
    name: String(formData.get('name')),
    unit_id: schoolUnits.data[0].id,
    category_id: String(formData.get('category_id')),
    coach_id: coachId,
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
