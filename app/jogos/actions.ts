'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sendEvolutionWhatsApp, sendEvolutionWhatsAppMedia } from '@/lib/whatsapp/evolution'
import { extractMatchFee } from './utils'
import fs from 'fs'
import path from 'path'

// Gera o Card Oficial do Aluno no estilo FIFA FUT em PNG e converte em Base64 para envio direto no WhatsApp
async function getStudentCardImageBase64(
  callupId: string,
  fallbackPhotoUrl?: string | null
): Promise<string> {
  const host = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000'

  // 1. Tenta buscar da rota dinâmica do Card FIFA (/api/og/card/[callupId])
  try {
    const res = await fetch(`${host}/api/og/card/${callupId}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    })
    if (res.ok) {
      const arr = await res.arrayBuffer()
      const b64 = Buffer.from(arr).toString('base64')
      if (b64.length > 500) {
        return b64
      }
    }
  } catch (err) {
    console.warn(`[Card Generator] Falha ao buscar card em ${host}/api/og/card/${callupId}:`, err)
  }

  // Fallback localhost:3000 caso host acima tenha falhado
  if (host !== 'http://localhost:3000') {
    try {
      const res = await fetch(`http://localhost:3000/api/og/card/${callupId}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(12000),
      })
      if (res.ok) {
        const arr = await res.arrayBuffer()
        const b64 = Buffer.from(arr).toString('base64')
        if (b64.length > 500) {
          return b64
        }
      }
    } catch (err) {
      console.warn(`[Card Generator] Falha fallback localhost:3000:`, err)
    }
  }

  // Fallback 1: se por algum motivo extremo a rota do card falhar, usa a foto direta do aluno
  if (fallbackPhotoUrl) {
    try {
      const res = await fetch(fallbackPhotoUrl, { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        const arr = await res.arrayBuffer()
        return Buffer.from(arr).toString('base64')
      }
    } catch (err) {
      console.warn('Falha ao baixar foto do aluno para base64:', err)
    }
  }

  // Fallback 2: Imagem oficial do Leão da Ilha do Sport
  try {
    const defaultImgPath = path.resolve(process.cwd(), 'public', 'sport-lion-mascot.jpg')
    if (fs.existsSync(defaultImgPath)) {
      return fs.readFileSync(defaultImgPath).toString('base64')
    }
  } catch (err) {
    console.warn('Falha ao carregar sport-lion-mascot.jpg:', err)
  }

  return ''
}

// Monta a mensagem de anúncio da convocação (SEM NENHUM LINK DO SISTEMA)
function buildConvocacaoCaption({
  guardianName,
  studentName,
  matchTitle,
  opponent,
  matchDate,
  matchTime,
  location,
  categoryName,
  fee,
}: {
  guardianName: string
  studentName: string
  matchTitle: string
  opponent: string
  matchDate: string
  matchTime: string
  location: string
  categoryName: string
  fee: number
}): string {
  const feeSection =
    fee > 0
      ? `💰 *TAXA DE INSCRIÇÃO:* R$ ${fee.toFixed(2).replace('.', ',')} *(A ser paga diretamente na Coordenação / Secretaria)*\n⚠️ *Atenção:* Favor procurar a coordenação da escolinha para acertar o pagamento da inscrição do atleta.`
      : `💰 *TAXA DE INSCRIÇÃO:* Isento / Gratuito`

  return `🏆 *CONVOCAÇÃO OFICIAL - SPORT CLUB DO RECIFE* 🔴⚫🦁\n★ ★ ★ *FIGURINHA OFICIAL DE CONVOCADO • ÁLBUM 2026*\n\nSensacional, Sr(a). *${guardianName || 'Responsável'}*!\nO atleta *${studentName}* foi CONVOCADO para defender o Sport Club do Recife no próximo confronto:\n\n⚔️ Partida: *${matchTitle} vs ${opponent}*\n📅 Data: *${matchDate}* ${matchTime ? `às *${matchTime}*` : ''}\n📍 Local: *${location}*\n🎽 Categoria: *${categoryName || 'Oficial'}*\n\n${feeSection}\n\n📸 *A Figurinha Oficial de Convocado do atleta foi gerada e enviada anexa acima!*\nContamos com a presença do nosso atleta em campo!\n"Pelo Sport tudo!" 🔴⚫🦁⚽`
}

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
        student:students(id, name, photo_url, preferred_position, dominant_foot, guardian:guardians(id, name, phone, receives_notifications))
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

// Disparo em lote de WhatsApp para os responsáveis dos convocados de uma partida
// Envia a foto/card como imagem direta na mensagem, SEM NENHUM LINK DO SISTEMA
export async function dispatchMatchCallupsWhatsAppAction(matchId: string): Promise<{
  success: boolean
  sentCount: number
  totalGuardians: number
  error?: string
}> {
  const supabase = createAdminClient()

  const { data: match, error } = await supabase
    .from('matches')
    .select(`
      *,
      category:categories(name),
      callups:match_callups(
        id,
        status,
        student:students(
          id,
          name,
          photo_url,
          guardian:guardians(id, name, phone, receives_notifications)
        )
      )
    `)
    .eq('id', matchId)
    .single()

  if (error || !match) {
    return { success: false, sentCount: 0, totalGuardians: 0, error: 'Partida não encontrada.' }
  }

  const fee = extractMatchFee(match.notes)
  const matchDate = match.match_date ? match.match_date.split('-').reverse().join('/') : ''
  const matchTime = match.match_time ? match.match_time.slice(0, 5) : ''

  let sentCount = 0
  let totalGuardians = 0

  const dispatches: Promise<any>[] = []

  for (const c of match.callups || []) {
    const studentName = c.student?.name || 'Atleta'
    const guardiansList = Array.isArray(c.student?.guardian)
      ? c.student?.guardian
      : c.student?.guardian
      ? [c.student?.guardian]
      : []

    // Filtra responsáveis que possuem telefone e têm a flag de notificação ativa
    const eligibleGuardians = guardiansList.filter(
      (g: any) => g?.phone && g?.receives_notifications !== false
    )

    totalGuardians += eligibleGuardians.length

    for (const g of eligibleGuardians) {
      const caption = buildConvocacaoCaption({
        guardianName: g.name,
        studentName,
        matchTitle: match.title,
        opponent: match.opponent,
        matchDate,
        matchTime,
        location: match.location,
        categoryName: match.category?.name,
        fee,
      })

      dispatches.push(
        (async () => {
          try {
            const imageB64 = await getStudentCardImageBase64(c.id, c.student?.photo_url)
            if (imageB64) {
              const res = await sendEvolutionWhatsAppMedia({
                phone: g.phone,
                media: imageB64,
                mimetype: 'image/png',
                caption,
                fileName: `figurinha_copa_${studentName.replace(/\s+/g, '_')}.png`,
              })
              if (res.success) sentCount++
            } else {
              const res = await sendEvolutionWhatsApp({
                phone: g.phone,
                message: caption,
              })
              if (res.success) sentCount++
            }
          } catch (err) {
            console.warn(`Falha ao disparar convocação com card para ${g.phone}:`, err)
          }
        })()
      )
    }
  }

  if (dispatches.length > 0) {
    await Promise.allSettled(dispatches)
  }

  revalidatePath('/jogos')
  revalidatePath('/portal')

  return {
    success: true,
    sentCount,
    totalGuardians,
  }
}

// Disparo individual para um único atleta (com foto e sem link)
export async function dispatchSingleCallupWhatsAppAction(callupId: string): Promise<{
  success: boolean
  message: string
}> {
  const supabase = createAdminClient()

  const { data: callup, error } = await supabase
    .from('match_callups')
    .select(`
      id,
      match:matches(
        title,
        opponent,
        match_date,
        match_time,
        location,
        notes,
        category:categories(name)
      ),
      student:students(
        name,
        photo_url,
        guardian:guardians(name, phone, receives_notifications)
      )
    `)
    .eq('id', callupId)
    .single()

  if (error || !callup) {
    return { success: false, message: 'Convocação não encontrada.' }
  }

  const rawMatch = callup.match as any
  const match = Array.isArray(rawMatch) ? rawMatch[0] : rawMatch
  const rawStudent = callup.student as any
  const student = Array.isArray(rawStudent) ? rawStudent[0] : rawStudent
  const guardiansList = Array.isArray(student?.guardian)
    ? student?.guardian
    : student?.guardian
    ? [student?.guardian]
    : []

  const eligibleGuardian = guardiansList.find(
    (g: any) => g?.phone && g?.receives_notifications !== false
  )

  if (!eligibleGuardian) {
    return { success: false, message: 'Nenhum responsável com telefone ativo para receber WhatsApp.' }
  }

  const fee = extractMatchFee(match?.notes)
  const matchDate = match?.match_date ? match.match_date.split('-').reverse().join('/') : ''
  const matchTime = match?.match_time ? match.match_time.slice(0, 5) : ''

  const caption = buildConvocacaoCaption({
    guardianName: eligibleGuardian.name,
    studentName: student?.name || 'Atleta',
    matchTitle: match?.title || 'Partida',
    opponent: match?.opponent || 'Adversário',
    matchDate,
    matchTime,
    location: match?.location || 'CT Ilha do Retiro',
    categoryName: match?.category?.name || 'Oficial',
    fee,
  })

  try {
    const imageB64 = await getStudentCardImageBase64(callupId, student?.photo_url)
    if (imageB64) {
      const res = await sendEvolutionWhatsAppMedia({
        phone: eligibleGuardian.phone,
        media: imageB64,
        mimetype: 'image/png',
        caption,
        fileName: `figurinha_copa_${(student?.name || 'atleta').replace(/\s+/g, '_')}.png`,
      })
      if (!res.success) {
        return { success: false, message: res.error || 'Erro ao enviar WhatsApp.' }
      }
    } else {
      const res = await sendEvolutionWhatsApp({
        phone: eligibleGuardian.phone,
        message: caption,
      })
      if (!res.success) {
        return { success: false, message: res.error || 'Erro ao enviar WhatsApp.' }
      }
    }

    return {
      success: true,
      message: `Convocação com Figurinha de Copa enviada com sucesso para ${eligibleGuardian.name}!`,
    }
  } catch (err: any) {
    return { success: false, message: `Erro ao disparar: ${err.message}` }
  }
}

export async function createMatchAction(formData: FormData): Promise<void> {
  const supabase = createAdminClient()

  // Extrai taxa de inscrição e notas
  const feeVal = parseFloat(String(formData.get('registration_fee') || '0').replace(',', '.')) || 0
  const userNotes = formData.get('notes') ? String(formData.get('notes')) : ''
  const structuredNotes = JSON.stringify({
    fee: feeVal,
    userNotes: userNotes,
  })

  const matchData = {
    title: String(formData.get('title')),
    opponent: String(formData.get('opponent')),
    match_type: String(formData.get('match_type') || 'friendly'),
    unit_id: formData.get('unit_id') ? String(formData.get('unit_id')) : null,
    category_id: formData.get('category_id') ? String(formData.get('category_id')) : null,
    coach_id: formData.get('coach_id') ? String(formData.get('coach_id')) : null,
    match_date: String(formData.get('match_date')),
    match_time: formData.get('match_time') ? String(formData.get('match_time')) : null,
    location: String(formData.get('location') || 'CT Ilha do Retiro - Campo 01'),
    status: 'scheduled',
    notes: structuredNotes,
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

// Atualização de partida e convocados (edição livre sem disparar WhatsApp)
export async function updateMatchAndCallupsAction(formData: FormData) {
  const supabase = createAdminClient()
  const matchId = String(formData.get('match_id'))

  if (!matchId) {
    throw new Error('ID da partida é obrigatório.')
  }

  const rawFee = formData.get('registration_fee')
  const fee = rawFee ? parseFloat(String(rawFee).replace(',', '.')) : 0

  const userNotes = String(formData.get('user_notes') || '')
  const structuredNotes = JSON.stringify({
    fee: isNaN(fee) ? 0 : fee,
    userNotes,
  })

  const matchData = {
    title: String(formData.get('title')),
    opponent: String(formData.get('opponent')),
    match_type: String(formData.get('match_type') || 'friendly'),
    category_id: formData.get('category_id') ? String(formData.get('category_id')) : null,
    coach_id: formData.get('coach_id') ? String(formData.get('coach_id')) : null,
    match_date: String(formData.get('match_date')),
    match_time: formData.get('match_time') ? String(formData.get('match_time')) : null,
    location: String(formData.get('location') || 'CT Ilha do Retiro - Campo 01'),
    notes: structuredNotes,
  }

  const { error: matchError } = await supabase
    .from('matches')
    .update(matchData)
    .eq('id', matchId)

  if (matchError) {
    throw new Error('Erro ao atualizar partida: ' + matchError.message)
  }

  // Atualiza os convocados
  const selectedStudentIds = formData.getAll('selected_students').map(String)

  // Busca os convocados atuais
  const { data: currentCallups } = await supabase
    .from('match_callups')
    .select('id, student_id, status')
    .eq('match_id', matchId)

  const currentIds = (currentCallups || []).map((c: any) => c.student_id)

  // Identifica alunos a remover (desmarcados)
  const toRemove = (currentCallups || []).filter(
    (c: any) => !selectedStudentIds.includes(c.student_id)
  )
  if (toRemove.length > 0) {
    await supabase
      .from('match_callups')
      .delete()
      .in('id', toRemove.map((c: any) => c.id))
  }

  // Identifica alunos a adicionar (marcados e não existentes)
  const toAdd = selectedStudentIds.filter((sId) => !currentIds.includes(sId))
  if (toAdd.length > 0) {
    const newCallups = toAdd.map((sId) => ({
      match_id: matchId,
      student_id: sId,
      status: 'pending',
      goals: 0,
      assists: 0,
    }))
    await supabase.from('match_callups').insert(newCallups)
  }

  revalidatePath('/jogos')
  revalidatePath('/portal')
  return { success: true }
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

export async function getCallupDetails(callupId: string) {
  const supabase = createAdminClient()

  const { data: callup, error } = await supabase
    .from('match_callups')
    .select(`
      *,
      match:matches(
        *,
        unit:units(name),
        category:categories(name),
        coach:coaches(name, phone)
      ),
      student:students(
        *,
        guardian:guardians(*)
      )
    `)
    .eq('id', callupId)
    .single()

  if (error || !callup) {
    return null
  }

  // Busca última avaliação técnica do aluno se existir
  const { data: evaluation } = await supabase
    .from('technical_evaluations')
    .select('*')
    .eq('student_id', callup.student_id)
    .order('evaluation_date', { ascending: false })
    .limit(1)
    .single()

  return {
    callup,
    evaluation: evaluation ?? null,
  }
}

export async function confirmCallupAction(callupId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('match_callups')
    .update({ status: 'confirmed' })
    .eq('id', callupId)

  if (error) return { success: false, error: error.message }
  revalidatePath(`/convocacao/${callupId}`)
  revalidatePath('/jogos')
  revalidatePath('/portal')
  return { success: true }
}
