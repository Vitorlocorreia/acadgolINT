'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Calendar, Clock, MapPin, Users, Download, CheckCircle2, Loader2, Trophy, ArrowRight } from 'lucide-react'
import { confirmCallupAction } from '@/app/jogos/actions'
import { extractMatchFee } from '@/app/jogos/utils'
import { formatDate, formatMoney } from '@/lib/format'
import {callupInstructions} from '@/lib/callups/model'

interface Props { callup: any; evaluation: any }

export function ConvocacaoClient({ callup }: Props) {
  const [pending, startTransition] = useTransition()
  const [confirmed, setConfirmed] = useState(callup.status === 'confirmed')
  const [error, setError] = useState('')
  const student = callup.student || {}
  const match = callup.match || {}
  const fee = extractMatchFee(match.notes)

  function confirmPresence() {
    setError('')
    startTransition(async () => {
      try {
        const result = await confirmCallupAction(callup.access_token)
        if (result.success) setConfirmed(true)
        else setError('Não foi possível confirmar sua presença. Tente novamente.')
      } catch { setError('A confirmação não foi concluída. Tente novamente.') }
    })
  }

  return <div className="portal min-h-screen">
    <header className="portal-header"><div className="max-w-[1000px] mx-auto flex items-center gap-3"><Image src="/sport-recife.svg" alt="Sport Club do Recife" width={32} height={40} /><div><strong className="text-sm">Sport Club do Recife</strong><p className="text-xs text-[var(--text-muted)]">Escolinha do Sport · Convocação</p></div></div></header>
    <main className="public-callup">
      <div className="page-heading"><div><p className="eyebrow mb-2">O próximo desafio é nosso</p><h1 className="page-title">Você foi convocado, {student.name?.split(' ')[0]}!</h1><p className="page-subtitle">Confira os detalhes da partida e confirme sua presença.</p></div></div>
      <div className="public-callup-grid">
        <div className="space-y-6">
          <section className="athlete-pass"><div className="flex items-center gap-3"><Trophy size={24} className="text-[#fa6578]" /><div><p className="text-xs text-[#c6cbd3] mb-1">{match.title || 'Próxima partida'}</p><h2 className="text-xl font-bold">Sport × {match.opponent || 'Adversário a definir'}</h2></div></div><p className="text-sm text-[#c6cbd3] mt-4">{student.name} · {match.category?.name || 'Categoria a definir'}</p></section>
          <section className="surface p-6" aria-label="Detalhes da partida">
            <div className="callup-detail"><Calendar size={20} /><div><small>Data</small><strong>{match.match_date ? formatDate(match.match_date, { day: 'numeric', month: 'long', year: 'numeric' }) : 'A definir'}</strong></div></div>
            <div className="callup-detail"><Clock size={20} /><div><small>Horário do jogo</small><strong>{match.match_time?.slice(0, 5) || 'A definir'}</strong></div></div>
            <div className="callup-detail"><MapPin size={20} /><div><small>Local</small><strong>{match.location || 'A confirmar com a coordenação'}</strong></div></div>
            {match.coach?.name && <div className="callup-detail"><Users size={20} /><div><small>Treinador</small><strong>{match.coach.name}</strong></div></div>}
            {callupInstructions(match.notes)&&<div className="notice mt-4"><div><strong>Orientações da convocação</strong><p className="text-sm mt-2 whitespace-pre-wrap">{callupInstructions(match.notes)}</p></div></div>}
          </section>
          <section className="surface p-6 space-y-4" aria-labelledby="confirmation-title">
            <h2 id="confirmation-title" className="section-title">Sua presença</h2>
            {confirmed ? <div role="status" className="notice notice-success"><CheckCircle2 size={20} className="shrink-0" /><div><strong>Presença confirmada</strong><p className="mt-1">A coordenação já pode acompanhar sua confirmação.</p></div></div> : <><p className="text-sm text-[var(--text-secondary)]">Confirme a participação de {student.name} para ajudar a preparar a equipe.</p><button className="button button-primary w-full" disabled={pending} onClick={confirmPresence}>{pending ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}{pending ? 'Confirmando…' : 'Confirmar presença'}</button></>}
            {error && <p role="alert" className="notice notice-error">{error}</p>}
            <div className="border-t border-[var(--border-color)] pt-4 text-sm"><div className="flex items-center justify-between gap-3"><span className="text-[var(--text-secondary)]">Taxa de inscrição</span><strong>{fee > 0 ? formatMoney(fee) : 'Gratuito'}</strong></div>{fee > 0 && <p className="text-xs text-[var(--text-muted)] mt-2">Pagamento diretamente na coordenação da escolinha.</p>}</div>
          </section>
          {student.portal_token && <Link className="text-link" href={`/portal/${student.portal_token}`}>Ir para o portal da família <ArrowRight size={16} /></Link>}
        </div>
        <section className="surface p-6 text-center space-y-4" aria-labelledby="sticker-title">
          <div><p className="eyebrow mb-2">Seu lugar é em campo</p><h2 id="sticker-title" className="section-title">Sua arte de convocação</h2></div>
          <img src={`/api/og/card/${callup.access_token}`} alt={`Arte de convocação de ${student.name}`} className="w-full max-w-[400px] mx-auto rounded-xl" />
          <a href={`/api/og/card/${callup.access_token}`} target="_blank" rel="noreferrer" download={`convocacao_sport_${student.name?.replace(/\s+/g, '_')}.png`} className="button w-full"><Download size={18} />Baixar convocação</a>
        </section>
      </div>
    </main>
    <footer className="text-center text-xs text-[var(--text-muted)] p-6">Sport Club do Recife · Formando novos leões.</footer>
  </div>
}
