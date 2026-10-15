'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function getTrialClasses() {
  const supabase = await createAdminClient('trials.read')

  const { data: trials, error } = await supabase
    .from('trial_classes')
    .select('*, unit:units(name), category:categories(name)')
    .order('scheduled_date', { ascending: true })

  if (error) {
    console.error('Erro ao buscar aulas experimentais:', error)
    throw new Error('Não foi possível carregar as aulas experimentais. Tente novamente.')
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
  const supabase = await createAdminClient('trials.read')

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

  if ([unitsRes, categoriesRes, classesRes].some(result => result.error)) {
    throw new Error('Não foi possível carregar as opções da aula. Tente novamente.')
  }
  return {
    units: unitsRes.data ?? [],
    categories: categoriesRes.data ?? [],
    classes: classesRes.data ?? [],
  }
}

export async function createTrialClassAction(formData:FormData){
 const db=await createAdminClient('trials.write');const {error}=await db.rpc('schedule_trial',{p_payload:Object.fromEntries(formData.entries())});
 if(error)throw new Error(error.message);revalidatePath('/experimentais');revalidatePath('/chamada');redirect('/experimentais');
}
export async function updateTrialStatusAction(trialId:string,status:string){
 const db=await createAdminClient('trials.write');
 if(!['scheduled','attended','missed','cancelled'].includes(status))return {success:false,error:'Conclua a matrícula na ficha do atleta antes de marcar como matriculado.'};
 const {error}=await db.from('trial_classes').update({status,updated_at:new Date().toISOString()}).eq('id',trialId);
 if(error)return {success:false,error:error.message};revalidatePath('/experimentais');return {success:true};
}
