'use client'

import { useState, useTransition } from 'react'
import {
  Trophy,
  Calendar,
  Clock,
  MapPin,
  Send,
  CheckCircle2,
  Users,
  Loader2,
  Shield,
  PlusCircle,
  Flame,
  Check,
} from 'lucide-react'
import { updateMatchScoreAction, updateCallupStatsAction } from './actions'

interface Props {
  matches: any[]
}

export function JogosClient({ matches }: Props) {
  const [isPending, startTransition] = useTransition()
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null)
  const [scoreModal, setScoreModal] = useState<any | null>(null)
  const [ourScore, setOurScore] = useState<number>(0)
  const [opponentScore, setOpponentScore] = useState<number>(0)
  const [feedback, setFeedback] = useState<string | null>(null)

  const handleOpenScoreModal = (match: any) => {
    setScoreModal(match)
    setOurScore(match.our_score ?? 0)
    setOpponentScore(match.opponent_score ?? 0)
  }

  const handleSaveScore = () => {
    if (!scoreModal) return
    startTransition(async () => {
      const res = await updateMatchScoreAction(scoreModal.id, ourScore, opponentScore, 'finished')
      if (res.success) {
        setFeedback('Placar final e súmula da partida atualizados com sucesso!')
        setScoreModal(null)
      }
    })
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="p-3 rounded-[4px] bg-[#C8E6C9]/50 border border-[#1A6B2E]/30 text-[#0D4A1C] text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#1A6B2E]" />
          <span>{feedback}</span>
        </div>
      )}

      {matches.length === 0 ? (
        <div className="card-light py-16 text-center space-y-2">
          <Trophy className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">Nenhum jogo ou campeonato agendado.</p>
          <p className="text-xs text-slate-500">Agende um amistoso ou partida oficial pelo formulário ao lado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {matches.map((match) => {
            const isFinished = match.status === 'finished'
            const callups = match.callups || []

            return (
              <div
                key={match.id}
                className="card-light p-5 space-y-4 hover:border-[#1A6B2E] transition-all shadow-xs"
              >
                {/* Header do Jogo */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#1A6B2E]/10 text-[#0D4A1C] border border-[#1A6B2E]/20">
                        {match.category?.name || 'Geral'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-50 text-purple-700 border border-purple-200">
                        {match.match_type === 'championship' ? '🏆 Campeonato' : '⚽ Amistoso'}
                      </span>
                    </div>
                    <h3 className="font-bebas text-2xl text-slate-900 tracking-wider leading-none mt-1">
                      {match.title} vs {match.opponent}
                    </h3>
                  </div>

                  {/* Placar */}
                  <div className="flex items-center gap-3">
                    {isFinished ? (
                      <div className="px-4 py-2 bg-slate-900 text-white rounded font-bebas text-2xl tracking-wider leading-none shadow-xs">
                        {match.our_score ?? 0} x {match.opponent_score ?? 0}
                      </div>
                    ) : (
                      <span className="px-3 py-1 rounded text-xs font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                        Agendado
                      </span>
                    )}

                    <button
                      onClick={() => handleOpenScoreModal(match)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold uppercase cursor-pointer"
                    >
                      {isFinished ? 'Editar Placar' : 'Lançar Resultado'}
                    </button>
                  </div>
                </div>

                {/* Dados da Partida */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-[#1A6B2E]" />
                    <span>{match.match_date?.split('-').reverse().join('/')} {match.match_time ? `às ${match.match_time.slice(0, 5)}` : ''}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>{match.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-600" />
                    <span>{callups.length} Atleta(s) Convocado(s)</span>
                  </div>
                </div>

                {/* Lista de Convocados e Botão WhatsApp */}
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {callups.map((c: any) => (
                      <span
                        key={c.id}
                        className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] font-bold text-slate-800"
                      >
                        {c.student?.name} {c.goals > 0 ? `⚽ x${c.goals}` : ''}
                      </span>
                    ))}
                  </div>

                  {callups.length > 0 && (
                    <button
                      onClick={() => setSelectedMatch(match)}
                      className="px-3.5 py-1.5 bg-[#1A6B2E] hover:bg-[#0D4A1C] text-white rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" /> Disparar Convocações ({callups.length})
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Disparo de Convocação WhatsApp */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[8px] max-w-2xl w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bebas text-2xl text-slate-900 tracking-wider leading-none flex items-center gap-2">
                  <Send className="w-5 h-5 text-[#1A6B2E]" />
                  Convocação Oficial — {selectedMatch.title} vs {selectedMatch.opponent}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Envie a mensagem de convocação no WhatsApp dos pais dos atletas.
                </p>
              </div>
              <button
                onClick={() => setSelectedMatch(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {(selectedMatch.callups || []).map((c: any) => {
                const guardian = Array.isArray(c.student?.guardian) ? c.student?.guardian[0] : c.student?.guardian
                const phone = guardian?.phone ? guardian.phone.replace(/\D/g, '') : ''
                const msg = `Olá ${guardian?.name || 'Responsável'}! ⚽\n\nTemos o prazer de informar que o atleta *${c.student?.name}* foi CONVOCADO para representar a Academia do Gol no jogo:\n\n🏆 *${selectedMatch.title} vs ${selectedMatch.opponent}*\n📅 Data: *${selectedMatch.match_date?.split('-').reverse().join('/')}* às *${selectedMatch.match_time?.slice(0, 5)}*\n📍 Local: *${selectedMatch.location}*\n\nPor favor, confirme a presença do atleta respondendo a esta mensagem. Contamos com vocês!`

                return (
                  <div key={c.id} className="p-3 bg-slate-50 rounded border border-slate-200 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{c.student?.name} (Resp: {guardian?.name || '—'})</div>
                      <div className="text-[11px] text-slate-500">{guardian?.phone || 'Sem telefone'}</div>
                    </div>

                    {phone ? (
                      <a
                        href={`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-1.5 bg-[#1A6B2E] hover:bg-[#0D4A1C] text-white rounded text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" /> Enviar no WhatsApp
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Sem WhatsApp</span>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedMatch(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold uppercase"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lançar Placar */}
      {scoreModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[8px] max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="font-bebas text-2xl text-slate-900 tracking-wider leading-none">
              Lançar Placar Final
            </h3>
            <p className="text-xs text-slate-500">
              {scoreModal.title} vs {scoreModal.opponent}
            </p>

            <div className="grid grid-cols-2 gap-4 py-2 text-center">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Academia do Gol
                </label>
                <input
                  type="number"
                  min="0"
                  value={ourScore}
                  onChange={(e) => setOurScore(parseInt(e.target.value) || 0)}
                  className="input-escolinha text-center font-bebas text-3xl h-14 font-bold text-[#1A6B2E]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  {scoreModal.opponent}
                </label>
                <input
                  type="number"
                  min="0"
                  value={opponentScore}
                  onChange={(e) => setOpponentScore(parseInt(e.target.value) || 0)}
                  className="input-escolinha text-center font-bebas text-3xl h-14 font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setScoreModal(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded text-xs font-bold uppercase"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveScore}
                disabled={isPending}
                className="px-6 py-2 bg-[#1A6B2E] hover:bg-[#0D4A1C] text-white rounded text-xs font-bold uppercase shadow-xs flex items-center gap-1.5"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Salvar Placar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
