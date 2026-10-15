import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export type NotificationEvent = {
  kind: 'attendance' | 'callup'
  entityId: string
  guardianId: string
  classId?: string
  date?: string
  variant?: string
  message: string
}
export type DeliveryResult = { success: boolean; messageId?: string; error?: string; uncertain?: boolean }
export type TrackedResult = { status: 'accepted' | 'already_accepted' | 'blocked' | 'failed'; error?: string }

// Reserve before contacting the provider. A database failure must never cause an untracked send.
export async function sendTrackedWhatsApp(
  db: SupabaseClient,
  event: NotificationEvent,
  deliver: (phone: string) => Promise<DeliveryResult>,
): Promise<TrackedResult> {
  const reserved = await db.rpc('whatsapp_reserve', {
    p_kind: event.kind, p_entity: event.entityId, p_guardian: event.guardianId,
    p_class: event.classId || null, p_date: event.date || null,
    p_variant: event.variant || '', p_message: event.message,
  })
  if (reserved.error || !reserved.data) return { status: 'failed', error: 'Não foi possível registrar o envio. Nenhuma mensagem foi enviada.' }
  const job = reserved.data
  if (job.state === 'accepted') return { status: 'already_accepted' }
  if (!job.claim) return { status: 'blocked', error: job.error || 'Confira este aviso no histórico da Comunicação antes de tentar novamente.' }
  let result: DeliveryResult
  try { result = await deliver(job.phone) }
  catch { result = { success: false, uncertain: true, error: 'O serviço não confirmou o resultado. Confira a conversa antes de reenviar.' } }
  const finished = await db.rpc('whatsapp_finish', {
    p_job: job.id, p_claim: job.claim,
    p_result: result.success ? 'accepted' : result.uncertain ? 'uncertain' : 'failed',
    p_provider_id: result.messageId || null, p_error: result.error || null,
  })
  if (finished.error || !finished.data) return { status: 'blocked', error: 'O resultado não foi registrado. Confira a conversa e o histórico antes de reenviar.' }
  return result.success ? { status: 'accepted' } : { status: 'failed', error: result.error }
}
