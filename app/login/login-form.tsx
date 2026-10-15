'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react'
import { loginAction } from './actions'

export function LoginForm({ next = '', expired = false }: { next?: string; expired?: boolean }) {
  const [state, action, pending] = useActionState(loginAction, { error: '' })
  const [visible, setVisible] = useState(false)
  return <form action={action} className="space-y-5">
    <input type="hidden" name="next" value={next} />
    {expired && !state.error && <p role="status" className="notice">Entre novamente para continuar.</p>}
    {state.error && <p role="alert" className="notice notice-error">{state.error}</p>}
    <div><label htmlFor="login-user" className="field-label">Usuário ou e-mail</label><input id="login-user" name="identifier" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={254} placeholder="Seu usuário de acesso" className="field" /></div>
    <div><label htmlFor="login-password" className="field-label">Senha</label><div className="relative"><input id="login-password" name="password" type={visible ? 'text' : 'password'} autoComplete="current-password" required maxLength={128} className="field !pr-14" /><button type="button" className="icon-button absolute right-0 top-0 !border-0 !bg-transparent" aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
    <div className="flex justify-end"><Link href="/esqueci-senha" className="text-link">Esqueci minha senha</Link></div>
    <button className="button button-primary w-full" disabled={pending}>{pending ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}{pending ? 'Entrando…' : 'Entrar'}</button>
    <p className="text-xs text-[var(--text-muted)]">Precisa de um acesso? Solicite ao administrador da escolinha.</p>
  </form>
}
