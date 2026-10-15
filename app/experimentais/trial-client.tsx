'use client'

import { useState, useTransition } from 'react'
import {
  Target,
  Calendar,
  Phone,
  Send,
  UserPlus,
} from 'lucide-react'
import Link from 'next/link'
import { updateTrialStatusAction } from './actions'

interface Props {
  trials: any[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Agendada', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  attended: { label: 'Compareceu', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  enrolled: { label: 'Matriculado!', color: 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]/20' },
  missed: { label: 'Faltou', color: 'bg-red-50 text-red-700 border-red-200' },
}

export function TrialClient({ trials }: Props) {
  const [isPending, startTransition] = useTransition()
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [feedback, setFeedback] = useState<string | null>(null)

  const handleStatusChange = (trialId: string, newStatus: string) => {
    startTransition(async () => {
      setFeedback(null)
      try {
        const result = await updateTrialStatusAction(trialId, newStatus)
        setFeedback(result.success ? 'Presença atualizada.' : 'Não foi possível atualizar a presença. Tente novamente.')
      } catch { setFeedback('A atualização não foi concluída. Tente novamente.') }
    })
  }

  const filtered = selectedFilter === 'all'
    ? trials
    : trials.filter((t) => t.status === selectedFilter)

  return (
    <div className="space-y-4">
      {feedback && <p role="status" className="notice">{feedback}</p>}
      {/* Abas de Filtro de Funil */}
      <div className="filter-bar" aria-label="Filtrar aulas por situação">
        <button aria-pressed={selectedFilter === 'all'}
          onClick={() => setSelectedFilter('all')}
          className={`button px-3 py-1.5 rounded-lg text-xs font-bold  tracking-normal border transition-all cursor-pointer ${
            selectedFilter === 'all'
              ? 'bg-[#c81930] text-white border-[#c81930]'
              : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-card-hover)]'
          }`}
        >
          Todas ({trials.length})
        </button>
        <button aria-pressed={selectedFilter === 'scheduled'}
          onClick={() => setSelectedFilter('scheduled')}
          className={`button px-3 py-1.5 rounded-lg text-xs font-bold  tracking-normal border transition-all cursor-pointer ${
            selectedFilter === 'scheduled'
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-card-hover)]'
          }`}
        >
          Agendadas ({trials.filter((t) => t.status === 'scheduled').length})
        </button>
        <button aria-pressed={selectedFilter === 'attended'}
          onClick={() => setSelectedFilter('attended')}
          className={`button px-3 py-1.5 rounded-lg text-xs font-bold  tracking-normal border transition-all cursor-pointer ${
            selectedFilter === 'attended'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-card-hover)]'
          }`}
        >
          Compareceram ({trials.filter((t) => t.status === 'attended').length})
        </button>
        <button aria-pressed={selectedFilter === 'enrolled'}
          onClick={() => setSelectedFilter('enrolled')}
          className={`button px-3 py-1.5 rounded-lg text-xs font-bold  tracking-normal border transition-all cursor-pointer ${
            selectedFilter === 'enrolled'
              ? 'bg-[#c81930] text-white border-[#c81930]'
              : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-card-hover)]'
          }`}
        >
          Matriculados ({trials.filter((t) => t.status === 'enrolled').length})
        </button>
      </div>

      {/* Lista de Aulas Experimentais */}
      {filtered.length === 0 ? (
        <div className="card-light py-16 text-center space-y-2">
          <Target className="w-12 h-12 text-[var(--text-muted)] mx-auto" />
          <p className="text-sm font-bold text-[var(--text-secondary)]">Nenhuma aula experimental neste status.</p>
          <p className="text-xs text-[var(--text-muted)]">Agende novas aulas testes pelo formulário ao lado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filtered.map((trial) => {
            const cfg = STATUS_CONFIG[trial.status] || STATUS_CONFIG.scheduled
            const cleanPhone = String(trial.guardian_phone || '').replace(/\D/g, '')
            const whatsappMsg = `Olá ${trial.guardian_name}, tudo bem? Aqui é da Escolinha do Sport! Confirmamos a aula experimental gratuita do ${trial.student_name} agendada para ${trial.scheduled_date?.split('-').reverse().join('/')} às ${trial.scheduled_time?.slice(0, 5) || 'horário do treino'} na unidade ${trial.unit?.name || 'Escolinha do Sport'}. Esperamos vocês!`

            return (
              <div
                key={trial.id}
                className="card-light p-4 space-y-3 flex flex-col justify-between hover:border-[#c81930]/50 transition-all shadow-xs"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-[var(--text-primary)] text-sm">{trial.student_name}</h4>
                      <p className="text-xs text-[var(--text-muted)]">
                        {trial.student_age ? `${trial.student_age} anos` : 'Idade a confirmar'} • {trial.category?.name || 'Geral'}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold tracking-normal border ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-xs space-y-1">
                    <div className="flex items-center justify-between text-[var(--text-muted)]">
                      <span>Data do Treino:</span>
                      <span className="font-mono font-bold text-[var(--text-primary)]">
                        {trial.scheduled_date?.split('-').reverse().join('/')} {trial.scheduled_time ? `às ${trial.scheduled_time.slice(0, 5)}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[var(--text-muted)]">
                      <span>Unidade:</span>
                      <span className="text-[var(--text-secondary)] font-medium">{trial.unit?.name || 'A definir'}</span>
                    </div>
                    {trial.class_info && (
                      <div className="flex items-center justify-between text-[var(--text-muted)]">
                        <span>Turma Vinculada:</span>
                        <span className="font-bold text-[#c81930] bg-[#c81930]/10 px-1.5 py-0.5 rounded text-xs">
                          ⚽ {trial.class_info.name}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[var(--text-muted)] pt-1 border-t border-[var(--border-color)]">
                      <span>Responsável:</span>
                      <span className="font-bold text-[var(--text-primary)]">{trial.guardian_name}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between gap-2 flex-wrap">
                  <a
                    href={`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(whatsappMsg)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="button px-2.5 py-1.5 bg-[#c81930]/10 hover:bg-[#c81930]/20 text-[#c81930] border border-[#c81930]/30 rounded text-xs font-bold tracking-normal inline-flex items-center gap-1 transition-all"
                  >
                    <Send className="w-3 h-3" /> WhatsApp
                  </a>

                  <div className="flex items-center gap-1.5">
                    {trial.class_id && (
                      <Link
                        href={`/chamada?classId=${trial.class_id}&date=${trial.scheduled_date}`}
                        className="button px-2.5 py-1.5 bg-[var(--bg-subtle)] hover:bg-slate-200 text-[var(--text-secondary)] border border-[var(--border-color)] rounded text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                        title="Ver lista de presença desta turma"
                      >
                        <span>📋 Chamada</span>
                      </Link>
                    )}

                    {trial.status === 'scheduled' && (
                      <button
                        disabled={isPending}
                        onClick={() => handleStatusChange(trial.id, 'attended')}
                        className="button px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 rounded text-xs font-bold  cursor-pointer"
                      >
                        ✓ Veio
                      </button>
                    )}

                    {trial.status === 'attended' && (
                      <Link
                        href={`/alunos/novo?trialId=${trial.id}`}
                        className="button px-2.5 py-1.5 bg-[#c81930] hover:bg-[#a71327] text-white rounded text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <UserPlus className="w-3 h-3" /> Matricular
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
