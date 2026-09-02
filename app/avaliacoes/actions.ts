'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function getEvaluationsList() {
  const supabase = createAdminClient()

  const { data: evaluations, error } = await supabase
    .from('technical_evaluations')
    .select(`
      *,
      student:students(id, name, preferred_position, dominant_foot, uniform_size, birth_date),
      coach:coaches(name)
    `)
    .order('evaluation_date', { ascending: false })

  if (error) {
    console.error('Erro ao buscar avaliações técnicas:', error)
    return []
  }

  return evaluations ?? []
}

export async function getStudentsAndCoachesForEvaluation() {
  const supabase = createAdminClient()

  const [studentsRes, coachesRes] = await Promise.all([
    supabase.from('students').select('id, name, preferred_position').eq('status', 'active').order('name'),
    supabase.from('coaches').select('id, name').eq('is_active', true).order('name'),
  ])

  return {
    students: studentsRes.data ?? [],
    coaches: coachesRes.data ?? [],
  }
}

export async function createEvaluationAction(formData: FormData) {
  const supabase = createAdminClient()

  const evaluationData = {
    student_id: String(formData.get('student_id')),
    coach_id: formData.get('coach_id') ? String(formData.get('coach_id')) : null,
    evaluation_date: String(formData.get('evaluation_date') || new Date().toISOString().slice(0, 10)),
    period: String(formData.get('period') || '1º Semestre 2026'),
    score_pass: parseInt(String(formData.get('score_pass') || '3')),
    score_shooting: parseInt(String(formData.get('score_shooting') || '3')),
    score_dribble: parseInt(String(formData.get('score_dribble') || '3')),
    score_control: parseInt(String(formData.get('score_control') || '3')),
    score_marking: parseInt(String(formData.get('score_marking') || '3')),
    score_speed: parseInt(String(formData.get('score_speed') || '3')),
    score_stamina: parseInt(String(formData.get('score_stamina') || '3')),
    score_discipline: parseInt(String(formData.get('score_discipline') || '5')),
    score_teamwork: parseInt(String(formData.get('score_teamwork') || '5')),
    strengths: formData.get('strengths') ? String(formData.get('strengths')) : null,
    areas_to_improve: formData.get('areas_to_improve') ? String(formData.get('areas_to_improve')) : null,
    coach_feedback: formData.get('coach_feedback') ? String(formData.get('coach_feedback')) : null,
  }

  const { error } = await supabase.from('technical_evaluations').insert(evaluationData)

  if (error) {
    throw new Error('Erro ao salvar avaliação: ' + error.message)
  }

  revalidatePath('/avaliacoes')
  revalidatePath('/alunos')
  redirect('/avaliacoes')
}
