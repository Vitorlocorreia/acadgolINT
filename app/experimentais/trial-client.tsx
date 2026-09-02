'use client'

import { useState, useTransition } from 'react'
import {
  Target,
  Calendar,
  Phone,
  CheckCircle2,
  XCircle,
  Sparkles,
  Send,
  Loader2,
  ChevronRight,
  UserPlus,
} from 'lucide-react'
import Link from 'next/link'
import { updateTrialStatusAction } from './actions'

interface Props {
  trials: any[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Agendada', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  attended: { label: 'Compareceu', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  enrolled: { label: 'Matriculado!', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  missed: { label: 'Faltou', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
}

export function TrialClient({ trials }: Props) {
  const [isPending, startTransition] = useTransition()
  const [selectedFilter, setSelectedFilter] = useState<string>('all')

  const handleStatusChange = (trialId: string, newStatus: string) => {
    startTransition(async () => {
      await updateTrialStatusAction(trialId, newStatus)
    })
  }

  const filtered = selectedFilter === 'all'
    ? trials
    : trials.filter((t) => t.status === selectedFilter)

  return (
    <div className="space-y-4">
      {/* Abas de Filtro de Funil */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedFilter('all')}
          className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
            selectedFilter === 'all'
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
          }`}
        >
          Todas ({trials.length})
        </button>
        <button
          onClick={() => setSelectedFilter('scheduled')}
          className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
            selectedFilter === 'scheduled'
              ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
              : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
          }`}
        >
          Agendadas ({trials.filter((t) => t.status === 'scheduled').length})
        </button>
        <button
          onClick={() => setSelectedFilter('attended')}
          className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
            selectedFilter === 'attended'
              ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
              : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
          }`}
        >
          Compareceram ({trials.filter((t) => t.status === 'attended').length})
        </button>
        <button
          onClick={() => setSelectedFilter('enrolled')}
          className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
            selectedFilter === 'enrolled'
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
          }`}
        >
          Matriculados ({trials.filter((t) => t.status === 'enrolled').length})
        </button>
      </div>

      {/* Lista de Aulas Experimentais */}
      {filtered.length === 0 ? (
        <div className="card-dark py-16 text-center space-y-2">
          <Target className="w-12 h-12 text-zinc-600 mx-auto" />
          <p className="text-sm font-bold text-zinc-300">Nenhuma aula experimental neste status.</p>
          <p className="text-xs text-zinc-500">Agende novas aulas testes pelo formulário ao lado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filtered.map((trial) => {
            const cfg = STATUS_CONFIG[trial.status] || STATUS_CONFIG.scheduled
            const cleanPhone = trial.guardian_phone.replace(/\D/g, '')
            const whatsappMsg = `Olá ${trial.guardian_name}, tudo bem? Aqui é da Academia do Gol! Confirmamos a aula experimental gratuita do ${trial.student_name} agendada para ${trial.scheduled_date?.split('-').reverse().join('/')} às ${trial.scheduled_time?.slice(0, 5) || 'horário do treino'} na unidade ${trial.unit?.name || 'Academia do Gol'}. Esperamos vocês!`

            return (
              <div
                key={trial.id}
                className="card-dark p-4 space-y-3 flex flex-col justify-between hover:border-zinc-700 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-white text-sm">{trial.student_name}</h4>
                      <p className="text-xs text-zinc-400">
                        {trial.student_age ? `${trial.student_age} anos` : 'Idade a confirmar'} • {trial.category?.name || 'Geral'}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-[2px] text-[10px] font-bold uppercase tracking-wider border ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800/80 text-xs space-y-1">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>Data do Treino:</span>
                      <span className="font-mono font-bold text-white">
                        {trial.scheduled_date?.split('-').reverse().join('/')} {trial.scheduled_time ? `às ${trial.scheduled_time.slice(0, 5)}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>Unidade:</span>
                      <span className="text-zinc-300 font-medium">{trial.unit?.name || 'A definir'}</span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-400 pt-1 border-t border-zinc-800/60">
                      <span>Responsável:</span>
                      <span className="font-bold text-zinc-200">{trial.guardian_name}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-2">
                  <a
                    href={`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(whatsappMsg)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1 transition-all"
                  >
                    <Send className="w-3 h-3" /> WhatsApp
                  </a>

                  <div className="flex items-center gap-1.5">
                    {trial.status === 'scheduled' && (
                      <button
                        onClick={() => handleStatusChange(trial.id, 'attended')}
                        className="px-2.5 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded text-[10px] font-bold uppercase cursor-pointer"
                      >
                        ✓ Veio
                      </button>
                    )}

                    {trial.status === 'attended' && (
                      <Link
                        href="/alunos/novo"
                        className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 rounded text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer"
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
