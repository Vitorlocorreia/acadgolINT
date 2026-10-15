'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { publicSupabaseConfig } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'
import { hasPermission, homeForRole, permissionForPath, safeNextPath, type StaffRole } from '@/lib/auth/permissions'

export async function loginAction(_state: { error: string }, form: FormData) {
  const input = z.object({ identifier: z.string().min(3).max(254), password: z.string().min(1).max(128) }).safeParse({ identifier: String(form.get('identifier') || '').trim().toLowerCase(), password: form.get('password') })
  if (!input.success) return { error: 'Informe seu usuário e sua senha.' }
  const {url,key}=publicSupabaseConfig()
  let tokens
  try {
    const response=await fetch(`${url}/functions/v1/staff-admin`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({action:'login',...input.data}),cache:'no-store',signal:AbortSignal.timeout(20000)})
    tokens=await response.json()
    if(!response.ok)return {error:tokens.error||'Não foi possível entrar. Tente novamente.'}
  } catch {return {error:'Não foi possível conectar. Tente novamente em instantes.'}}
  const db = await createClient()
  const { error } = await db.auth.setSession(tokens)
  if (error) return { error: 'Não foi possível entrar. Confira usuário e senha e tente novamente.' }
  const profile = await db.rpc('current_staff_profile')
  if (profile.error || !profile.data?.active || !profile.data?.session_valid) {
    await db.auth.signOut({ scope: 'local' })
    return { error: 'Este acesso não está liberado. Procure o administrador da escolinha.' }
  }
  if (profile.data.must_change_password) redirect('/alterar-senha')
  const next = safeNextPath(form.get('next'))
  const permission = next ? permissionForPath(next.split('?')[0]) : null
  redirect(next && permission && hasPermission(profile.data.role, permission) ? next : homeForRole(profile.data.role as StaffRole))
}

export async function logoutAction() {
  const db = await createClient()
  await db.auth.signOut({ scope: 'local' })
  redirect('/login')
}
