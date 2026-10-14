'use client'

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
          `🤖 Convocação anunciada com sucesso! ${res.sentCount} de ${res.totalGuardians} responsáveis notificados no WhatsApp com a Figurinha Oficial de Convocado!`
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
        <div className="p-3.5 rounded-[8px] bg-gradient-to-r from-[#1A0406] to-[#0A0A0C] border-2 border-[#D61F27] text-white text-xs font-bold flex items-center gap-2.5 shadow-md">
          <CheckCircle2 className="w-4 h-4 text-[#FFE300] shrink-0" />
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
            const confirmedCount = callups.filter((c: any) => c.status === 'confirmed').length
            const isDispatchingThis = dispatchingMatchId === match.id
            const fee = extractMatchFee(match.notes)

            return (
              <div
                key={match.id}
                className="card-light p-5 space-y-4 hover:border-[#D61F27]/50 transition-all shadow-xs border-l-4 border-l-[#D61F27]"
              >
                {/* Header do Jogo */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#D61F27]/10 text-[#D61F27] border border-[#D61F27]/20">
                        {match.category?.name || 'Geral'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                        <span>★</span>
                        <span>{match.match_type === 'championship' ? 'Campeonato Oficial' : 'Amistoso Rubro-Negro'}</span>
                      </span>
                      {fee > 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#D61F27]/10 text-[#D61F27] border border-[#D61F27]/30 flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-[#D61F27]" />
                          <span>Inscrição: R$ {fee.toFixed(2).replace('.', ',')} (Coordenação)</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                          🎟️ Gratuito
                        </span>
                      )}
                    </div>
                    <h3 className="font-bebas text-2xl text-slate-900 tracking-wider leading-none mt-1">
                      {match.title} vs {match.opponent}
                    </h3>
                  </div>

                  {/* Placar */}
                  <div className="flex items-center gap-3">
                    {isFinished ? (
                      <div className="px-4 py-2 bg-[#0A0A0C] text-[#FFE300] border border-amber-400/30 rounded font-bebas text-2xl tracking-wider leading-none shadow-xs">
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
                    <Calendar className="w-3.5 h-3.5 text-[#D61F27]" />
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
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {callups.map((c: any) => {
                      const isConf = c.status === 'confirmed'
                      return (
                        <div
                          key={c.id}
                          onClick={() => setViewingCardCallup({ callup: c, match })}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all border ${
                            isConf
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                          }`}
                          title="Clique para ver o Card FIFA 3D deste atleta"
                        >
                          <div className="w-4 h-4 rounded-full overflow-hidden bg-amber-400/20 shrink-0 flex items-center justify-center text-[8px]">
                            {c.student?.photo_url ? (
                              <img
                                src={c.student.photo_url}
                                alt={c.student.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              '⭐'
                            )}
                          </div>
                          <span>{c.student?.name}</span>
                          {isConf ? (
                            <span className="text-[9px] text-emerald-600">✅</span>
                          ) : (
                            <span className="text-[9px] text-amber-500">⏳</span>
                          )}
                        </div>
                      )
                    })}

                    {callups.length === 0 && (
                      <span className="text-xs text-slate-400 italic">
                        Nenhum atleta convocado ainda. Clique em "Editar Convocação" para selecionar os jogadores.
                      </span>
                    )}
                  </div>

                  {/* Ações da Partida */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {/* Botão de Editar Convocação */}
                    <button
                      onClick={() => handleOpenEditModal(match)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border border-slate-300 cursor-pointer"
                      title="Editar adversário, data, local, taxa e lista de atletas convocados"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                      <span>Editar Convocação</span>
                    </button>

                    {/* Botão de Anunciar Convocação (só envia quando clicar aqui e confirmar) */}
                    {callups.length > 0 && (
                      <button
                        onClick={() => setAnnounceConfirmMatch(match)}
                        disabled={isPending || isDispatchingThis}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-[#D61F27] to-[#8B0D12] hover:from-[#E5232B] hover:to-[#A31016] text-white rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm border border-amber-400/40 cursor-pointer disabled:opacity-50"
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
                      <button
                        onClick={() => setSelectedMatch(match)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Ver lista de convocações individuais e figurinhas oficiais"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Figurinhas & Detalhes</span>
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[10px] max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bebas text-2xl text-slate-900 tracking-wider leading-none flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Cards FIFA & Convocação Oficial — {selectedMatch.title} vs {selectedMatch.opponent}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Envie a mensagem no WhatsApp dos pais contendo o link da figurinha 3D do atleta.
                </p>
              </div>
              <button
                onClick={() => setSelectedMatch(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Banner de Disparo Automático no Modal */}
            <div className="p-3 bg-gradient-to-r from-[#0A0A0C] to-[#1F0406] rounded-[8px] border border-amber-400/40 flex items-center justify-between gap-3 text-white">
              <div className="flex items-center gap-2.5">
                <Bot className="w-5 h-5 text-[#FFE300] shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Disparo Automático em Lote (Robô Evolution)
                  </h4>
                  <p className="text-[11px] text-slate-300">
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
                className="px-4 py-2 bg-gradient-to-r from-[#D61F27] to-[#8B0D12] hover:from-[#E5232B] hover:to-[#A31016] text-white rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm border border-amber-400/40 cursor-pointer disabled:opacity-50 shrink-0"
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

                const fee = extractMatchFee(selectedMatch.notes)
                const feeSection = fee > 0
                  ? `💰 *TAXA DE INSCRIÇÃO:* R$ ${fee.toFixed(2).replace('.', ',')} *(A ser paga diretamente na Coordenação / Secretaria)*\n⚠️ *Atenção:* Favor procurar a coordenação da escolinha para acertar o pagamento da inscrição do atleta.\n`
                  : `💰 *TAXA DE INSCRIÇÃO:* Isento / Gratuito\n`

                const msg = `🏆 *CONVOCAÇÃO OFICIAL - SPORT CLUB DO RECIFE* 🔴⚫🦁\n★ ★ ★ *FIGURINHA OFICIAL DE CONVOCADO • ÁLBUM 2026*\n\nSensacional, Sr(a). *${guardian?.name || 'Responsável'}*!\nO atleta *${c.student?.name}* foi CONVOCADO para defender o Sport Club do Recife no próximo confronto:\n\n⚔️ Partida: *${selectedMatch.title} vs ${selectedMatch.opponent}*\n📅 Data: *${selectedMatch.match_date?.split('-').reverse().join('/')}* às *${selectedMatch.match_time?.slice(0, 5)}*\n📍 Local: *${selectedMatch.location}*\n🎽 Categoria: *${selectedMatch.category?.name || 'Oficial'}*\n\n${feeSection}\n📸 *A Figurinha Oficial de Convocado do atleta foi gerada e enviada anexa acima!*\nContamos com a presença do nosso atleta em campo!\n"Pelo Sport tudo!" 🔴⚫🦁⚽`

                return (
                  <div
                    key={c.id}
                    className="p-3 bg-slate-50 rounded-[8px] border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[6px] bg-slate-900 border border-amber-400/50 flex items-center justify-center overflow-hidden shrink-0">
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
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>{c.student?.name}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              isConfirmed
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isConfirmed ? 'Confirmado' : 'Aguardando'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Resp: {guardian?.name || '—'} • {guardian?.phone || 'Sem telefone'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap justify-end">
                      <button
                        type="button"
                        onClick={() => setViewingCardCallup({ callup: c, match: selectedMatch })}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1 cursor-pointer"
                        title="Ver Figurinha Oficial de Convocado"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-500" />
                        <span>Figurinha</span>
                      </button>

                      {phone ? (
                        <>
                          <button
                            type="button"
                            disabled={sendingSingleCallupId === c.id}
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
                            className="px-3 py-1.5 bg-gradient-to-r from-[#D61F27] to-[#8B0D12] hover:from-[#E5232B] hover:to-[#A31016] text-white rounded text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-2xs border border-amber-400/30 shrink-0 cursor-pointer disabled:opacity-50"
                            title="Disparar Figurinha de Copa e anúncio oficial diretamente no WhatsApp do responsável (Robô)"
                          >
                            {sendingSingleCallupId === c.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FFE300]" />
                            ) : (
                              <Bot className="w-3.5 h-3.5 text-[#FFE300]" />
                            )}
                            <span>{sendingSingleCallupId === c.id ? 'Enviando...' : 'Robô c/ Figurinha'}</span>
                          </button>

                          <a
                            href={`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1 border border-slate-300 shrink-0"
                            title="Enviar mensagem manualmente pelo WhatsApp Web/App (sem links)"
                          >
                            <Send className="w-3 h-3 text-emerald-600" /> Manual
                          </a>
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Sem WhatsApp</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedMatch(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold uppercase cursor-pointer"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview Card FIFA */}
      {viewingCardCallup && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0A0A0C] text-white rounded-[12px] p-6 max-w-lg w-full space-y-4 border border-amber-400/40 relative max-h-[95vh] overflow-y-auto flex flex-col items-center shadow-2xl">
            <button
              onClick={() => setViewingCardCallup(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white font-bold text-lg cursor-pointer"
            >
              ✕
            </button>

            <div className="text-center space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#FFE300]">
                ★ Sport Club do Recife • Álbum de Figurinhas 2026 ★
              </span>
              <h3 className="font-bebas text-2xl text-white tracking-wider">
                Figurinha Oficial de Convocado
              </h3>
              <p className="text-[11px] text-slate-300">
                Esta é a figurinha de copa oficial em alta resolução enviada diretamente no WhatsApp dos pais.
              </p>
            </div>

            {/* Imagem Real da Figurinha de Copa */}
            <div className="max-w-[340px] w-full rounded-[16px] overflow-hidden border-2 border-amber-400/60 shadow-2xl bg-black">
              <img
                src={`/api/og/card/${viewingCardCallup.callup.id}`}
                alt="Figurinha Oficial de Convocado"
                className="w-full h-auto object-contain"
              />
            </div>

            <div className="pt-2 flex items-center gap-3 justify-center">
              <a
                href={`/api/og/card/${viewingCardCallup.callup.id}`}
                download={`figurinha_sport_${viewingCardCallup.callup.student?.name?.replace(/\s+/g, '_')}.png`}
                target="_blank"
                className="px-3.5 py-1.5 bg-gradient-to-r from-[#D61F27] to-[#8B0D12] hover:from-[#E5232B] hover:to-[#A31016] text-white rounded text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm border border-amber-400/30"
              >
                <span>Baixar Figurinha</span>
                <span>⬇</span>
              </a>
              <Link
                href={`/convocacao/${viewingCardCallup.callup.id}`}
                target="_blank"
                className="text-xs text-amber-400 hover:text-amber-300 font-bold uppercase tracking-wider underline flex items-center gap-1 justify-center"
              >
                <span>Página Pública</span>
                <span>↗</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lançar Placar */}
      {scoreModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[10px] max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="font-bebas text-2xl text-slate-900 tracking-wider leading-none">
              Lançar Placar Final
            </h3>
            <p className="text-xs text-slate-500">
              {scoreModal.title} vs {scoreModal.opponent}
            </p>

            <div className="grid grid-cols-2 gap-4 py-2 text-center">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Sport Club do Recife
                </label>
                <input
                  type="number"
                  min="0"
                  value={ourScore}
                  onChange={(e) => setOurScore(parseInt(e.target.value) || 0)}
                  className="input-escolinha text-center font-bebas text-3xl h-14 font-bold text-[#D61F27]"
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
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded text-xs font-bold uppercase cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveScore}
                disabled={isPending}
                className="px-6 py-2 bg-gradient-to-r from-[#D61F27] to-[#8B0D12] hover:from-[#E5232B] hover:to-[#A31016] text-white rounded text-xs font-bold uppercase shadow-sm flex items-center gap-1.5 border border-amber-400/30 cursor-pointer"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Salvar Placar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Anunciar Convocação */}
      {announceConfirmMatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[12px] max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-[#D61F27]/10 flex items-center justify-center text-xl shrink-0">
                📢
              </div>
              <div>
                <h3 className="font-bebas text-2xl text-slate-900 tracking-wider leading-none">
                  Anunciar Convocação Oficial
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Sport Club do Recife vs {announceConfirmMatch.opponent}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-4 rounded-[8px] border border-slate-200">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-700">⚔️ Partida:</span>
                <span className="font-medium text-slate-900">
                  {announceConfirmMatch.title} vs {announceConfirmMatch.opponent}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-700">📅 Data e Horário:</span>
                <span className="font-medium text-slate-900">
                  {announceConfirmMatch.match_date?.split('-').reverse().join('/')} às{' '}
                  {announceConfirmMatch.match_time?.slice(0, 5) || 'A definir'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-700">📍 Local:</span>
                <span className="font-medium text-slate-900 truncate max-w-[240px]">
                  {announceConfirmMatch.location}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-700">👥 Atletas Convocados:</span>
                <span className="font-bold text-[#D61F27]">
                  {announceConfirmMatch.callups?.length || 0} atleta(s)
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-bold text-slate-700">💰 Taxa de Inscrição:</span>
                <span className="font-bold text-emerald-700">
                  {extractMatchFee(announceConfirmMatch.notes) > 0
                    ? `R$ ${extractMatchFee(announceConfirmMatch.notes).toFixed(2).replace('.', ',')} (Coordenação)`
                    : 'Gratuito / Isento'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-300 rounded-[8px] text-[11px] text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <span>⚠️ O que acontece ao clicar em anunciar?</span>
              </div>
              <p>
                O robô oficial irá gerar a <strong>Figurinha Oficial de Convocado</strong> personalizada para cada um dos {announceConfirmMatch.callups?.length || 0} atletas e enviará a foto com o comunicado oficial no WhatsApp dos responsáveis elegíveis.
              </p>
              <p className="text-[10px] text-amber-800">
                * A mensagem NÃO contém links do sistema, apenas a foto oficial e os dados da partida.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAnnounceConfirmMatch(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold uppercase cursor-pointer"
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
                className="px-5 py-2 bg-gradient-to-r from-[#D61F27] to-[#8B0D12] hover:from-[#E5232B] hover:to-[#A31016] text-white rounded text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md border border-amber-400/40 cursor-pointer disabled:opacity-50"
              >
                <Bot className="w-4 h-4 text-[#FFE300]" />
                <span>Sim, Anunciar Convocação Agora 📢</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição da Convocação */}
      {editingMatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[12px] max-w-3xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#D61F27]/10 flex items-center justify-center text-[#D61F27]">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bebas text-2xl text-slate-900 tracking-wider leading-none">
                    Editar Convocação & Partida
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Altere os dados do jogo, taxa de inscrição e selecione os atletas convocados.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingMatch(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditedMatch} className="space-y-4">
              <input type="hidden" name="match_id" value={editingMatch.id} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Título do Jogo / Torneio <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    defaultValue={editingMatch.title}
                    className="input-escolinha"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Time Adversário <span className="text-red-500">*</span>
                  </label>
                  <input
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Tipo de Jogo
                  </label>
                  <select
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Categoria
                  </label>
                  <select
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Treinador Responsável
                  </label>
                  <select
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Data da Partida <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="match_date"
                    required
                    defaultValue={editingMatch.match_date}
                    className="input-escolinha"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Horário de Início
                  </label>
                  <input
                    type="time"
                    name="match_time"
                    defaultValue={editingMatch.match_time ? editingMatch.match_time.slice(0, 5) : ''}
                    className="input-escolinha"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Taxa de Inscrição (R$)
                  </label>
                  <input
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Local da Partida <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="location"
                  required
                  defaultValue={editingMatch.location}
                  className="input-escolinha"
                />
              </div>

              {/* SELEÇÃO DE ATLETAS CONVOCADOS */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#D61F27]" />
                      Atletas Convocados ({selectedStudentIdsForEdit.length} selecionados)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Marque os atletas que receberão a figurinha e o anúncio oficial.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllVisible}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold cursor-pointer"
                    >
                      Marcar Visíveis
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllVisible}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold cursor-pointer"
                    >
                      Desmarcar Visíveis
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-[8px] border border-slate-200">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar atleta por nome..."
                      value={editSearchTerm}
                      onChange={(e) => setEditSearchTerm(e.target.value)}
                      className="input-escolinha pl-8 text-xs h-9"
                    />
                  </div>

                  <div className="relative">
                    <Filter className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
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

                <div className="max-h-60 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-[8px] border border-slate-200 divide-y divide-slate-100">
                  {filteredStudentsForEdit.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 italic">
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
                          className={`pt-1.5 pb-1 px-2 rounded-[6px] flex items-center justify-between gap-3 text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-red-50/80 text-red-950 border border-[#D61F27]/30'
                              : 'hover:bg-slate-100/70 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-4 h-4 text-[#D61F27] shrink-0">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-[#D61F27]" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400" />
                              )}
                            </div>

                            <div className="w-7 h-7 rounded-full overflow-hidden bg-amber-400/20 shrink-0 flex items-center justify-center text-[10px] border border-amber-400/30">
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
                                <span className="text-[10px] font-medium text-slate-500">
                                  ({student.category?.name || 'Geral'})
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Resp: {guardian?.name || '—'} {phone ? `• ${phone}` : '• Sem tel'}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                isSelected
                                  ? 'bg-[#D61F27] text-white'
                                  : 'bg-slate-200 text-slate-600'
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

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMatch(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingMatch}
                  className="px-6 py-2 bg-gradient-to-r from-[#D61F27] to-[#8B0D12] hover:from-[#E5232B] hover:to-[#A31016] text-white rounded text-xs font-bold uppercase shadow-sm flex items-center gap-1.5 border border-amber-400/30 cursor-pointer disabled:opacity-50"
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
        </div>
      )}
    </div>
  )
}
