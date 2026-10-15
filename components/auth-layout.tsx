import Image from 'next/image'
import type { ReactNode } from 'react'

export function AuthLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <main className="auth-page"><section className="auth-brand"><Image src="/sport-recife.svg" alt="Sport Club do Recife" width={68} height={84} priority /><p className="auth-eyebrow">SPORT CLUB DO RECIFE</p><h1>O futuro do Leão<br />começa aqui.</h1><p>Organização fora de campo.<br />Formação dentro dele.</p><div className="auth-brand-footer">Escolinha do Sport · Gestão da escolinha</div></section><section className="auth-form-area"><div className="auth-form"><Image src="/sport-recife.svg" alt="Sport" width={38} height={48} className="lg:hidden mb-8" /><p className="eyebrow mb-3">Acesso da equipe</p><h2 className="page-title">{title}</h2><p className="page-subtitle mb-8">{description}</p>{children}<p className="text-xs text-[var(--text-muted)] mt-10">Sport Club do Recife · Escolinha do Sport</p></div></section></main>
}
