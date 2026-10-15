import 'server-only'
import { requireStaff } from './session'
import { publicSupabaseConfig } from '@/lib/supabase/config'

export async function manageStaff(body: Record<string, unknown>) {
  const { db } = await requireStaff('staff.coaches.manage')
  const { data: { session } } = await db.auth.getSession()
  if (!session) return { error: 'Entre novamente para continuar.' }
  const { url, key } = publicSupabaseConfig()
  const response = await fetch(`${url}/functions/v1/staff-admin`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(20000) })
  const result = await response.json()
  return response.ok ? result : { error: result.error || 'Não foi possível concluir a solicitação.' }
}
