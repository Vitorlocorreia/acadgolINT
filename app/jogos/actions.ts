'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function getMatchesList() {
  const supabase = createAdminClient()

  const { data: matches, error } = await supabase
    .from('matches')
    .select(`
      *,
      unit:units(name),
      category:categories(name),
      coach:coaches(name),
      callups:match_callups(
        id,
        status,
        goals,
        assists,
        student:students(id, name, preferred_position, guardian:guardians(name, phone))
      )
    `)
    .order('match_date', { ascending: false })

  if (error) {
    console.error('Erro ao buscar jogos:', error)
    return []
  }

  return matches ?? []
}

export async function getFormDataForMatches() {
  const supabase = createAdminClient()

  const [unitsRes, categoriesRes, coachesRes, studentsRes] = await Promise.all([
    supabase.from('units').select('*').eq('is_active', true).order('name'),
    supabase.from('categories').select('*').order('min_age'),
    supabase.from('coaches').select('*').eq('is_active', true).order('name'),
    supabase.from('students').select('id, name, preferred_position').eq('status', 'active').order('name'),
  ])

  return {
    units: unitsRes.data ?? [],
    categories: categoriesRes.data ?? [],
    coaches: coachesRes.data ?? [],
    students: studentsRes.data ?? [],
  }
}

export async function createMatchAction(formData: FormData): Promise<void> {
  const supabase = createAdminClient()

  const matchData = {
    title: String(formData.get('title')),
    opponent: String(formData.get('opponent')),
    match_type: String(formData.get('match_type') || 'friendly'),
    unit_id: formData.get('unit_id') ? String(formData.get('unit_id')) : null,
    category_id: formData.get('category_id') ? String(formData.get('category_id')) : null,
    coach_id: formData.get('coach_id') ? String(formData.get('coach_id')) : null,
    match_date: String(formData.get('match_date')),
    match_time: formData.get('match_time') ? String(formData.get('match_time')) : null,
    location: String(formData.get('location') || 'Arena Academia do Gol'),
    status: 'scheduled',
    notes: formData.get('notes') ? String(formData.get('notes')) : null,
  }

  const { data: match, error } = await supabase
    .from('matches')
    .insert(matchData)
    .select('id')
    .single()

  if (error || !match) {
    throw new Error('Erro ao criar partida: ' + (error?.message || 'Falha no banco.'))
  }

  // Convoca os alunos selecionados
  const selectedStudentIds = formData.getAll('selected_students')
  if (selectedStudentIds.length > 0) {
    const callups = selectedStudentIds.map((sId) => ({
      match_id: match.id,
      student_id: String(sId),
      status: 'pending',
      goals: 0,
      assists: 0,
    }))
    await supabase.from('match_callups').insert(callups)
  }

  revalidatePath('/jogos')
  revalidatePath('/portal')
  redirect('/jogos')
}

export async function updateMatchScoreAction(
  matchId: string,
  ourScore: number,
  opponentScore: number,
  status: string = 'finished'
) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('matches')
    .update({
      our_score: ourScore,
      opponent_score: opponentScore,
      status,
    })
    .eq('id', matchId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/jogos')
  return { success: true }
}

export async function updateCallupStatsAction(
  callupId: string,
  goals: number,
  assists: number,
  status: string
) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('match_callups')
    .update({
      goals,
      assists,
      status,
    })
    .eq('id', callupId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/jogos')
  return { success: true }
}
