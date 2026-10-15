'use client'
import { useActionState } from 'react'
import { Loader2, LockKeyhole } from 'lucide-react'
import { changePasswordAction } from './actions'
import { logoutAction } from '@/app/login/actions'

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, { error: '' })
  return <><form action={action} className="space-y-5">{state.error && <p role="alert" className="notice notice-error">{state.error}</p>}<div><label htmlFor="new-password" className="field-label">Nova senha</label><input id="new-password" name="password" type="password" minLength={8} maxLength={128} required autoComplete="new-password" className="field" /><p className="text-xs text-[var(--text-muted)] mt-2">Pelo menos 8 caracteres, com letras maiúsculas, minúsculas e números.</p></div><div><label htmlFor="confirm-password" className="field-label">Confirme a nova senha</label><input id="confirm-password" name="confirm" type="password" minLength={8} maxLength={128} required autoComplete="new-password" className="field" /></div><button className="button button-primary w-full" disabled={pending}>{pending ? <Loader2 size={18} className="animate-spin" /> : <LockKeyhole size={18} />}Salvar nova senha</button></form><form action={logoutAction} className="mt-4"><button className="button button-quiet w-full">Sair desta conta</button></form></>
}
