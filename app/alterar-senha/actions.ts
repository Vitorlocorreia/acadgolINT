'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { requireStaff } from '@/lib/auth/session'
import { homeForRole } from '@/lib/auth/permissions'

export async function changePasswordAction(_state: { error: string }, form: FormData) {
  const { db, staff } = await requireStaff(undefined, true)
  const input = z.object({ password: z.string().min(8).max(128).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/), confirm: z.string() }).refine(data => data.password === data.confirm).safeParse({ password: form.get('password'), confirm: form.get('confirm') })
  if (!input.success) return { error: 'Use pelo menos 8 caracteres, com letras maiúsculas, minúsculas e números. As duas senhas devem ser iguais.' }
  const result = await db.auth.updateUser({ password: input.data.password })
  if (result.error) return { error: result.error.code === 'same_password' ? 'Escolha uma senha diferente da anterior.' : 'Não foi possível alterar a senha. Entre novamente e tente outra vez.' }
  if (staff.must_change_password) {
    const completed = await db.rpc('complete_password_change')
    if (completed.error) return { error: 'A senha foi alterada, mas o acesso ainda não foi liberado. Entre novamente ou procure o administrador.' }
  }
  redirect(homeForRole(staff.role))
}
