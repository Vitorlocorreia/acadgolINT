'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Trophy,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Users,
  Share2,
  Sparkles,
  ArrowRight,
  Shield,
  Loader2,
  Flame,
  DollarSign,
  AlertCircle,
} from 'lucide-react'
import { FifaCard } from '@/components/fifa-card'
import { confirmCallupAction } from '@/app/jogos/actions'

interface Props {
  callup: any
  evaluation: any
}

export function ConvocacaoClient({ callup, evaluation }: Props) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<string>(callup.status || 'pending')
  const [feedback, setFeedback] = useState<string | null>(null)

  const student = callup.student || {}
  const match = callup.match || {}
  const isConfirmed = status === 'confirmed'

  // Extrai taxa de inscrição
  let fee = 0
  if (match.notes) {
    try {
      const p = JSON.parse(match.notes)
      if (typeof p?.fee === 'number') fee = p.fee
      else if (typeof p?.registration_fee === 'number') fee = p.registration_fee
    } catch {
      const m = match.notes.match(/taxa:\s*r?\$?\s*([0-9]+([.,][0-9]+)?)/i)
      if (m && m[1]) fee = parseFloat(m[1].replace(',', '.')) || 0
    }
  }

  const handleConfirmPresence = () => {
    startTransition(async () => {
      const res = await confirmCallupAction(callup.id)
      if (res.success) {
        setStatus('confirmed')
        setFeedback('Presença confirmada com sucesso! O treinador e a coordenação foram notificados.')
      }
    })
  }

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-start relative overflow-hidden">
      {/* Background Ilha do Retiro Stadium Atmosfera */}
      <div className="fixed inset-0 pointer-events-none opacity-25 z-0">
        <img
          src="/sport-stadium-hero.jpg"
          alt="Estádio Ilha do Retiro"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0C]/90 via-[#0A0A0C]/80 to-[#0A0A0C]" />
      </div>

      {/* Header com Escudo do Sport */}
      <div className="w-full max-w-2xl text-center space-y-3 mb-6 pt-2 relative z-10">
        <div className="flex items-center justify-center gap-2">
          <div className="relative w-10 h-12 shrink-0 drop-shadow-[0_0_12px_rgba(214,31,39,0.7)]">
            <Image src="/sport-recife.svg" alt="Sport Club do Recife" fill className="object-contain" priority />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#D61F27]/20 border border-[#FFE300]/40 rounded-full text-[#FFE300] text-xs font-bold uppercase tracking-widest shadow-xs">
          <span>★ ★ ★</span>
          <span>Sport Club do Recife — Convocação Oficial</span>
          <span>★ ★ ★</span>
        </div>

        <h1 className="font-bebas text-4xl sm:text-6xl text-white tracking-wider leading-none mt-2 drop-shadow-[0_2px_10px_rgba(214,31,39,0.5)]">
          {student.name} FOI CONVOCADO!
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
          Parabéns, craque! Você foi selecionado para defender o Leão da Ilha no próximo grande confronto oficial.
        </p>
      </div>

      {/* FIGURINHA DE COPA OFICIAL */}
      <div className="mb-6 relative z-10 flex flex-col items-center">
        <div className="max-w-xs sm:max-w-sm w-full rounded-[22px] overflow-hidden border-3 border-[#FFE300] shadow-[0_10px_35px_rgba(214,31,39,0.4)] bg-black transition-transform hover:scale-[1.02] duration-300">
          <img
            src={`/api/og/card/${callup.id}`}
            alt={`Figurinha Oficial de ${student.name}`}
            className="w-full h-auto object-contain block"
          />
        </div>

        {/* Botão para Baixar a Figurinha */}
        <div className="mt-4">
          <a
            href={`/api/og/card/${callup.id}`}
            download={`figurinha_copa_${student.name?.replace(/\s+/g, '_')}.png`}
            target="_blank"
            className="px-5 py-2.5 bg-gradient-to-r from-[#D61F27] to-[#8B0D12] hover:from-[#E5232B] hover:to-[#A31016] text-white rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 shadow-lg border border-amber-400/50 cursor-pointer"
          >
            <span>📥 Baixar Figurinha Oficial da Copa</span>
          </a>
        </div>
      </div>

      {/* PAINEL DE CONFIRMAÇÃO & DETALHES DO JOGO */}
      <div className="w-full max-w-md space-y-4 relative z-10">
        {/* Status de Confirmação */}
        <div className="p-4 rounded-[10px] bg-black/80 border border-slate-800 shadow-xl space-y-3 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Status da Convocação:
            </span>
            <span
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${
                isConfirmed
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-red-500/20 text-red-300 border-red-500/40'
              }`}
            >
              {isConfirmed ? '✅ Presença Confirmada' : '⏳ Aguardando Confirmação'}
            </span>
          </div>

          {isConfirmed ? (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                Excelente! A vaga do atleta está confirmada na escalação do Leão. Pelo Sport Tudo! 🦁🔥
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleConfirmPresence}
              disabled={isPending}
              className="w-full py-3 bg-gradient-to-r from-[#D61F27] to-[#8B0D12] hover:from-[#A8131A] hover:to-[#6B080D] text-white font-bold rounded-[6px] text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer border border-[#FFE300]/40"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-[#FFE300]" />
              )}
              <span>Confirmar Presença de {student.name?.split(' ')[0]}</span>
            </button>
          )}

          {feedback && (
            <p className="text-[11px] text-center text-emerald-400 font-bold">{feedback}</p>
          )}
        </div>

        {/* Card Taxa de Inscrição / Pagamento na Coordenação */}
        <div className="p-4 rounded-[10px] bg-gradient-to-r from-[#140204] via-[#2A0507] to-[#0A0A0C] border-2 border-amber-400/40 shadow-xl space-y-2 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[#FFE300]" />
              <span>Taxa de Inscrição da Partida</span>
            </span>
            <span className="font-bebas text-2xl text-[#FFE300] leading-none">
              {fee > 0
                ? Number(fee).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                : 'Isento / Gratuito'}
            </span>
          </div>

          <div className="p-2.5 rounded bg-black/60 border border-slate-800 text-[11px] text-slate-300 space-y-1">
            <p className="font-semibold text-[#FFE300] flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-[#FFE300]" />
              <span>Instrução de Pagamento:</span>
            </p>
            <p className="leading-relaxed">
              {fee > 0
                ? 'O valor da taxa de inscrição deve ser pago diretamente na Coordenação / Secretaria da escolinha.'
                : 'Esta partida não possui taxa de inscrição para o atleta.'}
            </p>
          </div>
        </div>

        {/* Detalhes da Partida */}
        <div className="p-5 rounded-[10px] bg-black/80 border border-slate-800 shadow-xl space-y-3 text-xs backdrop-blur-md">
          <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
            <h3 className="font-bebas text-xl text-white tracking-wider flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-[#D61F27]" />
              Informações do Confronto
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#D61F27]/20 text-[#FFE300] border border-[#FFE300]/30">
              {match.category?.name || 'Categoria Oficial'}
            </span>
          </div>

          <div className="space-y-2 text-slate-300">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#FFE300] shrink-0" />
              <span>
                Confronto: <strong className="text-white">Sport Club do Recife vs {match.opponent}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#D61F27] shrink-0" />
              <span>
                Data: <strong>{match.match_date?.split('-').reverse().join('/')}</strong>
              </span>
            </div>

            {match.match_time && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                <span>
                  Horário: <strong>{match.match_time.slice(0, 5)}</strong> (chegar 30 min antes)
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Local: <strong>{match.location || 'CT Ilha do Retiro - Campo 01'}</strong>
              </span>
            </div>

            {match.coach?.name && (
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800 text-[11px] text-slate-400">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>Treinador Responsável: {match.coach.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Link para o Portal do Aluno se tiver token */}
        {student.portal_token && (
          <div className="text-center pt-2">
            <Link
              href={`/portal/${student.portal_token}`}
              className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-bold uppercase tracking-wider underline"
            >
              <span>Acessar Portal do Atleta</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-600 mt-8 relative z-10 pb-4">
        <p className="font-bebas tracking-wider text-slate-400 text-sm">
          Sport Club do Recife • Escolinha Oficial do Leão
        </p>
        <p className="text-[10px] text-amber-400 font-bold tracking-widest uppercase">
          ★ ★ ★ Pelo Sport Tudo! ★ ★ ★
        </p>
      </div>
    </div>
  )
}
