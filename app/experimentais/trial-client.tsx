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
  enrolled: { label: 'Matriculado!', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  missed: { label: 'Faltou', color: 'bg-red-50 text-red-700 border-red-200' },
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
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Todas ({trials.length})
        </button>
        <button
          onClick={() => setSelectedFilter('scheduled')}
          className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
            selectedFilter === 'scheduled'
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Agendadas ({trials.filter((t) => t.status === 'scheduled').length})
        </button>
        <button
          onClick={() => setSelectedFilter('attended')}
          className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
            selectedFilter === 'attended'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Compareceram ({trials.filter((t) => t.status === 'attended').length})
        </button>
        <button
          onClick={() => setSelectedFilter('enrolled')}
          className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
            selectedFilter === 'enrolled'
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Matriculados ({trials.filter((t) => t.status === 'enrolled').length})
        </button>
      </div>

      {/* Lista de Aulas Experimentais */}
      {filtered.length === 0 ? (
        <div className="card-light py-16 text-center space-y-2">
          <Target className="w-12 h-12 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-700">Nenhuma aula experimental neste status.</p>
          <p className="text-xs text-slate-500">Agende novas aulas testes pelo formulário ao lado.</p>
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
                className="card-light p-4 space-y-3 flex flex-col justify-between hover:border-emerald-400 transition-all shadow-xs"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{trial.student_name}</h4>
                      <p className="text-xs text-slate-500">
                        {trial.student_age ? `${trial.student_age} anos` : 'Idade a confirmar'} • {trial.category?.name || 'Geral'}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Data do Treino:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {trial.scheduled_date?.split('-').reverse().join('/')} {trial.scheduled_time ? `às ${trial.scheduled_time.slice(0, 5)}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Unidade:</span>
                      <span className="text-slate-700 font-medium">{trial.unit?.name || 'A definir'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200">
                      <span>Responsável:</span>
                      <span className="font-bold text-slate-800">{trial.guardian_name}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <a
                    href={`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(whatsappMsg)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1 transition-all"
                  >
                    <Send className="w-3 h-3" /> WhatsApp
                  </a>

                  <div className="flex items-center gap-1.5">
                    {trial.status === 'scheduled' && (
                      <button
                        onClick={() => handleStatusChange(trial.id, 'attended')}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 rounded text-[10px] font-bold uppercase cursor-pointer"
                      >
                        ✓ Veio
                      </button>
                    )}

                    {trial.status === 'attended' && (
                      <Link
                        href="/alunos/novo"
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer shadow-xs"
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
