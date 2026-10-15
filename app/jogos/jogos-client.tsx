'use client'

import {buildCallupCaption,callupInstructions} from '@/lib/callups/model'
import { ModalFrame } from '@/components/modal-frame'
import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
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
  Sparkles,
  Eye,
  User,
  Bot,
  Zap,
  DollarSign,
  Edit3,
  Search,
  Filter,
  CheckSquare,
  Square,
} from 'lucide-react'
import {
  updateMatchScoreAction,
  updateCallupStatsAction,
  dispatchMatchCallupsWhatsAppAction,
  dispatchSingleCallupWhatsAppAction,
  updateMatchAndCallupsAction,
} from './actions'
import { extractMatchFee } from './utils'

interface Props {
  matches: any[]
  categories?: any[]
  coaches?: any[]
  students?: any[]
}

export function JogosClient({
  matches,
  categories = [],
  coaches = [],
  students = [],
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null)
  const [scoreModal, setScoreModal] = useState<any | null>(null)
  const [viewingCardCallup, setViewingCardCallup] = useState<any | null>(null)
  const [ourScore, setOurScore] = useState<number>(0)
  const [opponentScore, setOpponentScore] = useState<number>(0)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [dispatchingMatchId, setDispatchingMatchId] = useState<string | null>(null)
  const [sendingSingleCallupId, setSendingSingleCallupId] = useState<string | null>(null)

  // Estados para Edição de Convocação
  const [editingMatch, setEditingMatch] = useState<any | null>(null)
  const [selectedStudentIdsForEdit, setSelectedStudentIdsForEdit] = useState<string[]>([])
  const [editCategoryFilter, setEditCategoryFilter] = useState<string>('all')
  const [editSearchTerm, setEditSearchTerm] = useState<string>('')
  const [isUpdatingMatch, setIsUpdatingMatch] = useState<boolean>(false)

  // Estado para Confirmação de Anúncio
  const [announceConfirmMatch, setAnnounceConfirmMatch] = useState<any | null>(null)

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

  // Disparo de Anúncio via Robô Evolution
  const handleAutoDispatch = (matchId: string) => {
    setDispatchingMatchId(matchId)
    setFeedback(null)
    startTransition(async () => {
      const res = await dispatchMatchCallupsWhatsAppAction(matchId)
      setDispatchingMatchId(null)
      if (res.success) {
        setFeedback(
          `${res.sentCount} imagens aceitas pelo WhatsApp. ${res.skippedCount || 0} avisos já enviados foram preservados.`
        )
      } else {
        setFeedback(`❌ Erro no anúncio: ${res.error || 'Falha ao conectar com o WhatsApp.'}`)
      }
    })
  }

  // Abertura do Modal de Edição
  const handleOpenEditModal = (match: any) => {
    setEditingMatch(match)
    const currentIds = (match.callups || []).map((c: any) => c.student?.id || c.student_id)
    setSelectedStudentIdsForEdit(currentIds)
    setEditCategoryFilter(match.category_id || 'all')
    setEditSearchTerm('')
  }

  const toggleStudentForEdit = (studentId: string) => {
    setSelectedStudentIdsForEdit((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    )
  }

  // Filtragem de alunos para a convocação
  const filteredStudentsForEdit = useMemo(() => {
    return students.filter((s: any) => {
      const matchesCategory =
        editCategoryFilter === 'all' || s.category_id === editCategoryFilter
      const matchesSearch =
        !editSearchTerm ||
        s.name.toLowerCase().includes(editSearchTerm.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [students, editCategoryFilter, editSearchTerm])

  const handleSelectAllVisible = () => {
    const ids = filteredStudentsForEdit.map((s: any) => s.id)
    setSelectedStudentIdsForEdit((prev) => Array.from(new Set([...prev, ...ids])))
  }

  const handleClearAllVisible = () => {
    const ids = filteredStudentsForEdit.map((s: any) => s.id)
    setSelectedStudentIdsForEdit((prev) => prev.filter((id) => !ids.includes(id)))
  }

  // Salvar Edição da Convocação
  const handleSaveEditedMatch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingMatch) return

    setIsUpdatingMatch(true)
    try {
      const formEl = e.currentTarget
      const formData = new FormData(formEl)

      // Anexa os alunos selecionados
      formData.delete('selected_students')
      selectedStudentIdsForEdit.forEach((id) => formData.append('selected_students', id))

      const res = await updateMatchAndCallupsAction(formData)
      if (res.success) {
        setFeedback('Convocação e detalhes da partida atualizados com sucesso!')
        setEditingMatch(null)
      } else {
        setFeedback('Erro ao atualizar convocação.')
      }
    } catch (err: any) {
      setFeedback(`Erro ao salvar: ${err.message || 'Falha na requisição.'}`)
    } finally {
      setIsUpdatingMatch(false)
    }
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="p-3.5 rounded-lg bg-gradient-to-r from-[#1A0406] to-[#0A0A0C] border-2 border-[#c81930] text-white text-xs font-bold flex items-center gap-2.5 shadow-md">
          <CheckCircle2 className="w-4 h-4 text-[#FFE300] shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {matches.length === 0 ? (
        <div className="card-light py-16 text-center space-y-2">
          <Trophy className="w-12 h-12 text-[var(--text-muted)] mx-auto" />
          <p className="text-sm font-bold text-[var(--text-secondary)]">Nenhum jogo ou campeonato agendado.</p>
          <p className="text-xs text-[var(--text-muted)]">Agende um amistoso ou partida oficial pelo formulário ao lado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {matches.map((match) => {
            const isFinished = match.status === 'finished'
            const callups = match.callups || []
            const confirmedCount = callups.filter((c: any) => c.status === 'confirmed').length
            const isDispatchingThis = dispatchingMatchId === match.id
            const fee = extractMatchFee(match.notes)

            return (
              <div
                key={match.id}
                className="card-light p-5 space-y-4 hover:border-[#c81930]/50 transition-all shadow-xs border-l-4 border-l-[#c81930]"
              >
                {/* Header do Jogo */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#c81930]/10 text-[#c81930] border border-[#c81930]/20">
                        {match.category?.name || 'Geral'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                        <span>★</span>
                        <span>{match.match_type === 'championship' ? 'Campeonato Oficial' : 'Amistoso Rubro-Negro'}</span>
                      </span>
                      {fee > 0 ? (
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#c81930]/10 text-[#c81930] border border-[#c81930]/30 flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-[#c81930]" />
                          <span>Inscrição: R$ {fee.toFixed(2).replace('.', ',')} (Coordenação)</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          🎟️ Gratuito
                        </span>
                      )}
                    </div>
                    <h3 className="section-title  text-[var(--text-primary)] tracking-tight leading-tight mt-1">
                      {match.title} vs {match.opponent}
                    </h3>
                  </div>

                  {/* Placar */}
                  <div className="flex items-center gap-3">
                    {isFinished ? (
                      <div className="px-4 py-2 bg-[#0A0A0C] text-[#FFE300] border border-amber-400/30 rounded stat-number  tracking-tight leading-tight shadow-xs">
                        {match.our_score ?? 0} x {match.opponent_score ?? 0}
                      </div>
                    ) : (
                      <span className="px-3 py-1 rounded text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Agendado
                      </span>
                    )}

                    <button
                      onClick={() => handleOpenScoreModal(match)}
                      className="button px-3 py-1.5 bg-[var(--bg-subtle)] hover:bg-slate-200 text-[var(--text-secondary)] rounded text-xs font-bold  cursor-pointer"
                    >
                      {isFinished ? 'Editar Placar' : 'Lançar Resultado'}
                    </button>
                  </div>
                </div>

                {/* Dados da Partida */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-[var(--text-secondary)]">
                  <div className="flex items-center gap-1.5 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-[#c81930]" />
                    <span>
                      {match.match_date?.split('-').reverse().join('/')}{' '}
                      {match.match_time ? `às ${match.match_time.slice(0, 5)}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>{match.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-600" />
                    <span>
                      {callups.length} Convocado(s) •{' '}
                      <strong className="text-emerald-700">{confirmedCount} Confirmados</strong>
                    </span>
                  </div>
                </div>

                {/* Lista de Convocados e Botões de Disparo */}
                <div className="pt-2 border-t border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {callups.map((c: any) => {
                      const isConf = c.status === 'confirmed'
                      return (
                        <button type="button"
                          key={c.id}
                          onClick={() => setViewingCardCallup({ callup: c, match })}
                          className={`button px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                            isConf
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-[var(--bg-card-hover)] text-[var(--text-primary)] border-[var(--border-color)] hover:bg-[var(--bg-subtle)]'
                          }`}
                          title="Clique para ver o Card FIFA 3D deste atleta"
                        >
                          <span className="w-5 h-5 rounded-full overflow-hidden bg-[var(--bg-subtle)] shrink-0 flex items-center justify-center text-[8px]">
                            {c.student?.photo_url ? (
                              <img
                                src={c.student.photo_url}
                                alt={c.student.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              '⭐'
                            )}
                          </span>
                          <span>{c.student?.name}</span>
                          {isConf ? (
                            <span className="text-[9px] text-emerald-600">✅</span>
                          ) : (
                            <span className="text-[9px] text-amber-500">⏳</span>
                          )}
                        </button>
                      )
                    })}

                    {callups.length === 0 && (
                      <span className="text-xs text-[var(--text-muted)] italic">
                        Nenhum atleta convocado ainda. Clique em &quot;Editar Convocação&quot; para selecionar os jogadores.
                      </span>
                    )}
                  </div>

                  {/* Ações da Partida */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {/* Botão de Editar Convocação */}
                    <button aria-label="Editar adversário, data, local, taxa e lista de atletas convocados"
                      onClick={() => handleOpenEditModal(match)}
                      className="button px-3 py-1.5 bg-[var(--bg-subtle)] hover:bg-slate-200 text-[var(--text-primary)] rounded text-xs font-bold  tracking-normal flex items-center justify-center gap-1.5 border border-[var(--border-color)] cursor-pointer"
                      title="Editar adversário, data, local, taxa e lista de atletas convocados"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                      <span>Editar Convocação</span>
                    </button>

                    {/* Botão de Anunciar Convocação (só envia quando clicar aqui e confirmar) */}
                    {callups.length > 0 && (
                      <button aria-label="Anunciar oficialmente e disparar WhatsApp para os responsáveis"
                        onClick={() => setAnnounceConfirmMatch(match)}
                        disabled={isPending || isDispatchingThis}
                        className="button px-3.5 py-1.5 bg-gradient-to-r from-[#c81930] to-[#a71327] hover:from-[#c81930] hover:to-[#a71327] text-white rounded text-xs font-bold  tracking-normal flex items-center justify-center gap-1.5 shadow-sm border border-amber-400/40 cursor-pointer disabled:opacity-50"
                        title="Anunciar oficialmente e disparar WhatsApp para os responsáveis"
                      >
                        {isDispatchingThis ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FFE300]" />
                        ) : (
                          <Bot className="w-3.5 h-3.5 text-[#FFE300]" />
                        )}
                        <span>{isDispatchingThis ? 'Anunciando...' : '📢 Anunciar Convocação'}</span>
                      </button>
                    )}

                    {/* Botão de Cards & Detalhes */}
                    {callups.length > 0 && (
                      <button aria-label="Ver lista de convocações individuais e artes de convocação"
                        onClick={() => setSelectedMatch(match)}
                        className="button px-3 py-1.5 bg-[var(--bg-subtle)] hover:bg-slate-200 text-[var(--text-secondary)] rounded text-xs font-bold  tracking-normal flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Ver lista de convocações individuais e artes de convocação"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Convocações e detalhes</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Disparo de Convocação WhatsApp com Link do Card FIFA */}
      {selectedMatch && (
        <ModalFrame label="Atletas convocados" onClose={() => setSelectedMatch(null)} wide>
          <div className="bg-[var(--bg-card)] rounded-[10px] max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-[var(--border-color)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div>
                <h3 className="section-title  text-[var(--text-primary)] tracking-tight leading-tight flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Cards FIFA & Convocação Oficial — {selectedMatch.title} vs {selectedMatch.opponent}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Confira a arte de cada atleta, baixe a imagem ou envie aos responsáveis pelo WhatsApp.
                </p>
              </div>
              <button aria-label="Fechar janela"
                onClick={() => setSelectedMatch(null)}
                className="button text-[var(--text-muted)] hover:text-[var(--text-secondary)] font-bold"
              >
                ✕
              </button>
            </div>

            {/* Banner de Disparo Automático no Modal */}
            <div className="p-3 bg-gradient-to-r from-[#0A0A0C] to-[#1F0406] rounded-lg border border-amber-400/40 flex items-center justify-between gap-3 text-white">
              <div className="flex items-center gap-2.5">
                <Bot className="w-5 h-5 text-[#FFE300] shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-white tracking-tight">
                    Disparo Automático em Lote (Robô Evolution)
                  </h4>
                  <p className="text-xs text-[var(--text-muted)]">
                    Envia para todos os pais elegíveis de uma só vez.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  const m = selectedMatch
                  setSelectedMatch(null)
                  setAnnounceConfirmMatch(m)
                }}
                disabled={isPending || dispatchingMatchId === selectedMatch.id}
                className="button px-4 py-2 bg-gradient-to-r from-[#c81930] to-[#a71327] hover:from-[#c81930] hover:to-[#a71327] text-white rounded text-xs font-bold  tracking-normal flex items-center gap-1.5 shadow-sm border border-amber-400/40 cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Zap className="w-3.5 h-3.5 text-[#FFE300]" />
                <span>📢 Anunciar Todos</span>
              </button>
            </div>

            <div className="space-y-3">
              {(selectedMatch.callups || []).map((c: any) => {
                const guardian = Array.isArray(c.student?.guardian) ? c.student?.guardian[0] : c.student?.guardian
                const phone = guardian?.phone ? guardian.phone.replace(/\D/g, '') : ''
                const isConfirmed = c.status === 'confirmed'

                const msg = buildCallupCaption({...c,match:selectedMatch},guardian?.name,false)

                return (
                  <div
                    key={c.id}
                    className="p-3 bg-[var(--bg-card-hover)] rounded-lg border border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-900 border border-amber-400/50 flex items-center justify-center overflow-hidden shrink-0">
                        {c.student?.photo_url ? (
                          <img
                            src={c.student.photo_url}
                            alt={c.student.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-amber-300" />
                        )}
                      </div>

                      <div>
                        <div className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                          <span>{c.student?.name}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              isConfirmed
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isConfirmed ? 'Confirmado' : 'Aguardando'}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          Resp: {guardian?.name || '—'} • {guardian?.phone || 'Sem telefone'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap justify-end">
                      <button aria-label="Ver Arte personalizada de convocação"
                        type="button"
                        onClick={() => setViewingCardCallup({ callup: c, match: selectedMatch })}
                        className="button px-2.5 py-1.5 bg-[var(--bg-card)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-color)] rounded text-xs font-bold  tracking-normal inline-flex items-center gap-1 cursor-pointer"
                        title="Ver Arte personalizada de convocação"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-500" />
                        <span>Ver arte</span>
                      </button>

                      {phone ? (
                        <>
                          <button aria-label="Disparar Arte de Convocação e anúncio oficial diretamente no WhatsApp do responsável (Robô)"
                            type="button"
                            disabled={sendingSingleCallupId === c.id || !c.student?.photo_url}
                            onClick={async () => {
                              setSendingSingleCallupId(c.id)
                              try {
                                const res = await dispatchSingleCallupWhatsAppAction(c.id)
                                if (res.success) {
                                  setFeedback(res.message)
                                } else {
                                  setFeedback(res.message || 'Erro ao enviar via WhatsApp')
                                }
                              } catch (err: any) {
                                setFeedback(err.message || 'Erro inesperado')
                              } finally {
                                setSendingSingleCallupId(null)
                              }
                            }}
                            className="button px-3 py-1.5 bg-gradient-to-r from-[#c81930] to-[#a71327] hover:from-[#c81930] hover:to-[#a71327] text-white rounded text-xs font-bold  tracking-normal inline-flex items-center gap-1.5 shadow-2xs border border-amber-400/30 shrink-0 cursor-pointer disabled:opacity-50"
                            title="Disparar Arte de Convocação e anúncio oficial diretamente no WhatsApp do responsável (Robô)"
                          >
                            {sendingSingleCallupId === c.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FFE300]" />
                            ) : (
                              <Bot className="w-3.5 h-3.5 text-[#FFE300]" />
                            )}
                            <span>{sendingSingleCallupId === c.id ? 'Enviando...' : 'Enviar imagem'}</span>
                          </button>

                          <a
                            href={`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="button px-2.5 py-1.5 bg-[var(--bg-subtle)] hover:bg-slate-200 text-[var(--text-secondary)] rounded text-xs font-bold tracking-normal inline-flex items-center gap-1 border border-[var(--border-color)] shrink-0"
                            title="Enviar mensagem manualmente pelo WhatsApp Web/App (sem links)"
                          >
                            <Send className="w-3 h-3 text-emerald-600" /> Manual
                          </a>
                        </>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)] italic">Sem WhatsApp</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="pt-3 border-t border-[var(--border-color)] flex justify-end">
              <button
                onClick={() => setSelectedMatch(null)}
                className="button px-5 py-2 bg-[var(--bg-subtle)] hover:bg-slate-200 text-[var(--text-secondary)] rounded text-xs font-bold  cursor-pointer"
              >
                Concluído
              </button>
            </div>
          </div>
        </ModalFrame>
      )}

      {/* Modal Preview Card FIFA */}
      {viewingCardCallup && (
        <ModalFrame label="Arte da convocação" onClose={() => setViewingCardCallup(null)}>
          <div className="bg-[#0A0A0C] text-white rounded-[12px] p-6 max-w-lg w-full space-y-4 border border-amber-400/40 relative max-h-[95vh] overflow-y-auto flex flex-col items-center shadow-2xl">
            <button aria-label="Fechar janela"
              onClick={() => setViewingCardCallup(null)}
              className="button absolute top-3 right-3 text-[var(--text-muted)] hover:text-white font-bold text-lg cursor-pointer"
            >
              ✕
            </button>

            <div className="text-center space-y-1">
              <span className="text-xs font-bold tracking-normal text-[#FFE300]">
                Sport Club do Recife · Convocação individual
              </span>
              <h3 className="section-title  text-white tracking-tight">
                Arte personalizada de convocação
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                A foto e os dados do atleta preenchem este modelo automaticamente. Confira a imagem antes do envio.
              </p>
            </div>

            {/* Imagem Real da Arte de Convocação */}
            <div className="max-w-[340px] w-full rounded-[16px] overflow-hidden border-2 border-amber-400/60 shadow-2xl bg-black">
              <img
                src={`/api/og/card/${viewingCardCallup.callup.access_token}`}
                alt="Arte personalizada de convocação"
                className="w-full h-auto object-contain"
              />
            </div>

            <div className="pt-2 flex items-center gap-3 justify-center">
              <a
                href={`/api/og/card/${viewingCardCallup.callup.access_token}`}
                download={`convocacao_sport_${viewingCardCallup.callup.student?.name?.replace(/\s+/g, '_')}.png`}
                target="_blank"
                className="button px-3.5 py-1.5 bg-gradient-to-r from-[#c81930] to-[#a71327] hover:from-[#c81930] hover:to-[#a71327] text-white rounded text-xs font-bold tracking-normal inline-flex items-center gap-1.5 shadow-sm border border-amber-400/30"
              >
                <span>Baixar convocação</span>
                <span>⬇</span>
              </a>
              <Link
                href={`/convocacao/${viewingCardCallup.callup.access_token}`}
                target="_blank"
                className="text-xs text-amber-400 hover:text-amber-300 font-bold tracking-normal underline flex items-center gap-1 justify-center"
              >
                <span>Página Pública</span>
                <span>↗</span>
              </Link>
            </div>
          </div>
        </ModalFrame>
      )}

      {/* Modal Lançar Placar */}
      {scoreModal && (
        <ModalFrame label="Registrar resultado" onClose={() => setScoreModal(null)}>
          <div className="bg-[var(--bg-card)] rounded-[10px] max-w-md w-full p-6 space-y-4 shadow-2xl border border-[var(--border-color)]">
            <h3 className="section-title  text-[var(--text-primary)] tracking-tight leading-tight">
              Lançar Placar Final
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {scoreModal.title} vs {scoreModal.opponent}
            </p>

            <div className="grid grid-cols-2 gap-4 py-2 text-center">
              <div>
                <label htmlFor="field-appjogosjogosclienttsx-101" className="block text-xs font-bold  text-[var(--text-secondary)] mb-1">
                  Sport Club do Recife
                </label>
                <input id="field-appjogosjogosclienttsx-101"
                  type="number"
                  min="0"
                  value={ourScore}
                  onChange={(e) => setOurScore(parseInt(e.target.value) || 0)}
                  className="input-escolinha text-center font-semibold text-3xl h-14 font-bold text-[#c81930]"
                />
              </div>
              <div>
                <label htmlFor="field-appjogosjogosclienttsx-102" className="block text-xs font-bold  text-[var(--text-secondary)] mb-1">
                  {scoreModal.opponent}
                </label>
                <input id="field-appjogosjogosclienttsx-102"
                  type="number"
                  min="0"
                  value={opponentScore}
                  onChange={(e) => setOpponentScore(parseInt(e.target.value) || 0)}
                  className="input-escolinha text-center font-semibold text-3xl h-14 font-bold text-[var(--text-primary)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
              <button
                onClick={() => setScoreModal(null)}
                className="button px-4 py-2 bg-[var(--bg-subtle)] text-[var(--text-secondary)] rounded text-xs font-bold  cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveScore}
                disabled={isPending}
                className="button px-6 py-2 bg-gradient-to-r from-[#c81930] to-[#a71327] hover:from-[#c81930] hover:to-[#a71327] text-white rounded text-xs font-bold  shadow-sm flex items-center gap-1.5 border border-amber-400/30 cursor-pointer"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Salvar Placar
              </button>
            </div>
          </div>
        </ModalFrame>
      )}

      {/* Modal de Confirmação para Anunciar Convocação */}
      {announceConfirmMatch && (
        <ModalFrame label="Revisar envio de convocação" onClose={() => setAnnounceConfirmMatch(null)}>
          <div className="bg-[var(--bg-card)] rounded-[12px] max-w-lg w-full p-6 space-y-4 shadow-2xl border border-[var(--border-color)] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-3">
              <div className="w-10 h-10 rounded-full bg-[#c81930]/10 flex items-center justify-center text-xl shrink-0">
                📢
              </div>
              <div>
                <h3 className="section-title  text-[var(--text-primary)] tracking-tight leading-tight">
                  Anunciar Convocação Oficial
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Sport Club do Recife vs {announceConfirmMatch.opponent}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-[var(--text-secondary)] bg-[var(--bg-card-hover)] p-4 rounded-lg border border-[var(--border-color)]">
              <div className="flex justify-between py-1 border-b border-[var(--border-color)]/60">
                <span className="font-bold text-[var(--text-secondary)]">⚔️ Partida:</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {announceConfirmMatch.title} vs {announceConfirmMatch.opponent}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-color)]/60">
                <span className="font-bold text-[var(--text-secondary)]">📅 Data e Horário:</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {announceConfirmMatch.match_date?.split('-').reverse().join('/')} às{' '}
                  {announceConfirmMatch.match_time?.slice(0, 5) || 'A definir'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-color)]/60">
                <span className="font-bold text-[var(--text-secondary)]">📍 Local:</span>
                <span className="font-medium text-[var(--text-primary)] truncate max-w-[240px]">
                  {announceConfirmMatch.location}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-color)]/60">
                <span className="font-bold text-[var(--text-secondary)]">👥 Atletas Convocados:</span>
                <span className="font-bold text-[#c81930]">
                  {announceConfirmMatch.callups?.length || 0} atleta(s)
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-bold text-[var(--text-secondary)]">💰 Taxa de Inscrição:</span>
                <span className="font-bold text-emerald-700">
                  {extractMatchFee(announceConfirmMatch.notes) > 0
                    ? `R$ ${extractMatchFee(announceConfirmMatch.notes).toFixed(2).replace('.', ',')} (Coordenação)`
                    : 'Gratuito / Isento'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <span>⚠️ O que acontece ao clicar em anunciar?</span>
              </div>
              <p>
                O robô oficial irá gerar a <strong>Arte personalizada de convocação</strong> personalizada para cada um dos {announceConfirmMatch.callups?.length || 0} atletas e enviará a foto com o comunicado oficial no WhatsApp dos responsáveis elegíveis.
              </p>
              <p className="text-xs text-amber-800">
                * A mensagem NÃO contém links do sistema, apenas a foto oficial e os dados da partida.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAnnounceConfirmMatch(null)}
                className="button px-4 py-2 bg-[var(--bg-subtle)] hover:bg-slate-200 text-[var(--text-secondary)] rounded text-xs font-bold  cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending || dispatchingMatchId === announceConfirmMatch.id}
                onClick={() => {
                  const mId = announceConfirmMatch.id
                  setAnnounceConfirmMatch(null)
                  handleAutoDispatch(mId)
                }}
                className="button px-5 py-2 bg-gradient-to-r from-[#c81930] to-[#a71327] hover:from-[#c81930] hover:to-[#a71327] text-white rounded text-xs font-bold  tracking-normal flex items-center gap-2 shadow-md border border-amber-400/40 cursor-pointer disabled:opacity-50"
              >
                <Bot className="w-4 h-4 text-[#FFE300]" />
                <span>Sim, Anunciar Convocação Agora 📢</span>
              </button>
            </div>
          </div>
        </ModalFrame>
      )}

      {/* Modal de Edição da Convocação */}
      {editingMatch && (
        <ModalFrame label="Editar partida e convocados" onClose={() => setEditingMatch(null)} wide>
          <div className="bg-[var(--bg-card)] rounded-[12px] max-w-3xl w-full p-6 space-y-5 shadow-2xl border border-[var(--border-color)] max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#c81930]/10 flex items-center justify-center text-[#c81930]">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="section-title  text-[var(--text-primary)] tracking-tight leading-tight">
                    Editar Convocação & Partida
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Altere os dados do jogo, taxa de inscrição e selecione os atletas convocados.
                  </p>
                </div>
              </div>
              <button aria-label="Fechar janela"
                onClick={() => setEditingMatch(null)}
                className="button text-[var(--text-muted)] hover:text-[var(--text-secondary)] font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditedMatch} className="space-y-4">
              <input type="hidden" name="match_id" value={editingMatch.id} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="field-appjogosjogosclienttsx-103" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                    Título do Jogo / Torneio <span className="text-red-500">*</span>
                  </label>
                  <input id="field-appjogosjogosclienttsx-103"
                    type="text"
                    name="title"
                    required
                    defaultValue={editingMatch.title}
                    className="input-escolinha"
                  />
                </div>

                <div>
                  <label htmlFor="field-appjogosjogosclienttsx-104" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                    Time Adversário <span className="text-red-500">*</span>
                  </label>
                  <input id="field-appjogosjogosclienttsx-104"
                    type="text"
                    name="opponent"
                    required
                    defaultValue={editingMatch.opponent}
                    className="input-escolinha"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="jogos-field-1" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                    Tipo de Jogo
                  </label>
                  <select id="jogos-field-1"
                    name="match_type"
                    defaultValue={editingMatch.match_type || 'friendly'}
                    className="input-escolinha cursor-pointer"
                  >
                    <option value="friendly">⚽ Amistoso Rubro-Negro</option>
                    <option value="championship">🏆 Campeonato Oficial</option>
                    <option value="internal_cup">🥇 Torneio Interno</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="jogos-field-2" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                    Categoria
                  </label>
                  <select id="jogos-field-2"
                    name="category_id"
                    defaultValue={editingMatch.category_id || ''}
                    className="input-escolinha cursor-pointer"
                  >
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="jogos-field-3" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                    Treinador Responsável
                  </label>
                  <select id="jogos-field-3"
                    name="coach_id"
                    defaultValue={editingMatch.coach_id || ''}
                    className="input-escolinha cursor-pointer"
                  >
                    <option value="">Selecione o treinador...</option>
                    {coaches.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        Prof. {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="field-appjogosjogosclienttsx-105" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                    Data da Partida <span className="text-red-500">*</span>
                  </label>
                  <input id="field-appjogosjogosclienttsx-105"
                    type="date"
                    name="match_date"
                    required
                    defaultValue={editingMatch.match_date}
                    className="input-escolinha"
                  />
                </div>

                <div>
                  <label htmlFor="field-appjogosjogosclienttsx-106" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                    Horário de Início
                  </label>
                  <input id="field-appjogosjogosclienttsx-106"
                    type="time"
                    name="match_time"
                    defaultValue={editingMatch.match_time ? editingMatch.match_time.slice(0, 5) : ''}
                    className="input-escolinha"
                  />
                </div>

                <div>
                  <label htmlFor="field-appjogosjogosclienttsx-107" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                    Taxa de Inscrição (R$)
                  </label>
                  <input id="field-appjogosjogosclienttsx-107"
                    type="number"
                    step="0.01"
                    min="0"
                    name="registration_fee"
                    placeholder="0,00"
                    defaultValue={
                      extractMatchFee(editingMatch.notes) > 0
                        ? extractMatchFee(editingMatch.notes)
                        : ''
                    }
                    className="input-escolinha"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="field-appjogosjogosclienttsx-108" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                  Local da Partida <span className="text-red-500">*</span>
                </label>
                <input id="field-appjogosjogosclienttsx-108"
                  type="text"
                  name="location"
                  required
                  defaultValue={editingMatch.location}
                  className="input-escolinha"
                />
              </div>

<div><label htmlFor="edit-callup-instructions" className="field-label">Orientações da convocação</label><textarea id="edit-callup-instructions" name="user_notes" maxLength={500} rows={3} className="input-escolinha" defaultValue={callupInstructions(editingMatch.notes)} placeholder="Apresentação, uniforme e o que levar."/></div>
              {/* SELEÇÃO DE ATLETAS CONVOCADOS */}
              <div className="pt-3 border-t border-[var(--border-color)] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#c81930]" />
                      Atletas Convocados ({selectedStudentIdsForEdit.length} selecionados)
                    </h4>
                    <p className="text-xs text-[var(--text-muted)]">
                      Marque os atletas que receberão a arte e os dados da convocação.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllVisible}
                      className="button px-2.5 py-1 bg-[var(--bg-subtle)] hover:bg-slate-200 text-[var(--text-secondary)] rounded text-xs font-bold cursor-pointer"
                    >
                      Marcar Visíveis
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllVisible}
                      className="button px-2.5 py-1 bg-[var(--bg-subtle)] hover:bg-slate-200 text-[var(--text-secondary)] rounded text-xs font-bold cursor-pointer"
                    >
                      Desmarcar Visíveis
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[var(--bg-card-hover)] p-2.5 rounded-lg border border-[var(--border-color)]">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="Buscar atleta por nome..."
                      value={editSearchTerm}
                      onChange={(e) => setEditSearchTerm(e.target.value)}
                      className="input-escolinha pl-8 text-xs h-9"
                    />
                  </div>

                  <div className="relative">
                    <Filter className="w-3.5 h-3.5 absolute left-2.5 top-3 text-[var(--text-muted)]" />
                    <select
                      value={editCategoryFilter}
                      onChange={(e) => setEditCategoryFilter(e.target.value)}
                      className="input-escolinha pl-8 text-xs h-9 cursor-pointer"
                    >
                      <option value="all">Todas as Categorias</option>
                      {categories.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1.5 p-2 bg-[var(--bg-card-hover)] rounded-lg border border-[var(--border-color)] divide-y divide-[var(--border-color)]">
                  {filteredStudentsForEdit.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[var(--text-muted)] italic">
                      Nenhum atleta encontrado com estes filtros.
                    </div>
                  ) : (
                    filteredStudentsForEdit.map((student: any) => {
                      const isSelected = selectedStudentIdsForEdit.includes(student.id)
                      const guardian = Array.isArray(student.guardian)
                        ? student.guardian[0]
                        : student.guardian
                      const phone = guardian?.phone

                      return (
                        <div
                          key={student.id}
                          onClick={() => toggleStudentForEdit(student.id)}
                          className={`pt-1.5 pb-1 px-2 rounded-lg flex items-center justify-between gap-3 text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-red-50/80 text-red-950 border border-[#c81930]/30'
                              : 'hover:bg-[var(--bg-subtle)]/70 text-[var(--text-secondary)]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-4 h-4 text-[#c81930] shrink-0">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-[#c81930]" />
                              ) : (
                                <Square className="w-4 h-4 text-[var(--text-muted)]" />
                              )}
                            </div>

                            <div className="w-7 h-7 rounded-full overflow-hidden bg-amber-400/20 shrink-0 flex items-center justify-center text-xs border border-amber-400/30">
                              {student.photo_url ? (
                                <img
                                  src={student.photo_url}
                                  alt={student.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                '⭐'
                              )}
                            </div>

                            <div>
                              <div className="font-bold flex items-center gap-2">
                                <span>{student.name}</span>
                                <span className="text-xs font-medium text-[var(--text-muted)]">
                                  ({student.category?.name || 'Geral'})
                                </span>
                              </div>
                              <div className="text-xs text-[var(--text-muted)]">
                                Resp: {guardian?.name || '—'} {phone ? `• ${phone}` : '• Sem tel'}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded ${
                                isSelected
                                  ? 'bg-[#c81930] text-white'
                                  : 'bg-slate-200 text-[var(--text-secondary)]'
                              }`}
                            >
                              {isSelected ? 'Convocado' : 'Disponível'}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setEditingMatch(null)}
                  className="button px-4 py-2 bg-[var(--bg-subtle)] hover:bg-slate-200 text-[var(--text-secondary)] rounded text-xs font-bold  cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingMatch}
                  className="button px-6 py-2 bg-gradient-to-r from-[#c81930] to-[#a71327] hover:from-[#c81930] hover:to-[#a71327] text-white rounded text-xs font-bold  shadow-sm flex items-center gap-1.5 border border-amber-400/30 cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingMatch ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#FFE300]" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{isUpdatingMatch ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>
          </div>
        </ModalFrame>
      )}
    </div>
  )
}
