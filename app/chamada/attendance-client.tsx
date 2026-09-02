'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Save,
  Users,
  Calendar,
  Sparkles,
  Loader2,
  Check,
} from 'lucide-react'
import { saveAttendanceAction } from './actions'

interface Props {
  classId: string
  trainingDate: string
  students: any[]
  initialLogs: any[]
  classes: any[]
}

export function AttendanceClient({
  classId,
  trainingDate,
  students,
  initialLogs,
  classes,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedDate, setSelectedDate] = useState(trainingDate)
  const [selectedClassId, setSelectedClassId] = useState(classId)

  // Map of studentId -> 'present' | 'absent' | 'justified'
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'justified'>>(() => {
    const map: Record<string, 'present' | 'absent' | 'justified'> = {}
    students.forEach((s) => {
      const existing = initialLogs.find((l) => l.student_id === s.id)
      map[s.id] = existing ? existing.status : 'present' // default: presente
    })
    return map
  })

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'justified') => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }))
  }

  const handleMarkAllPresent = () => {
    const updated: Record<string, 'present' | 'absent' | 'justified'> = {}
    students.forEach((s) => {
      updated[s.id] = 'present'
    })
    setAttendance(updated)
  }

  const handleClassOrDateChange = (newClassId: string, newDate: string) => {
    setSelectedClassId(newClassId)
    setSelectedDate(newDate)
    router.push(`/chamada?classId=${newClassId}&date=${newDate}`)
  }

  const handleSave = () => {
    setFeedback(null)
    startTransition(async () => {
      const records = students.map((s) => ({
        student_id: s.id,
        status: attendance[s.id] || 'present',
      }))

      const res = await saveAttendanceAction(selectedClassId, selectedDate, records)
      if (res.success) {
        setFeedback({ type: 'success', message: 'Chamada salva com sucesso!' })
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erro ao salvar chamada.' })
      }
    })
  }

  const presentCount = Object.values(attendance).filter((st) => st === 'present').length
  const absentCount = Object.values(attendance).filter((st) => st === 'absent').length
  const justifiedCount = Object.values(attendance).filter((st) => st === 'justified').length

  return (
    <div className="space-y-6">
      {/* Seletor de Turma e Data */}
      <div className="card-dark p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Seletor de Turma */}
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 flex-1 sm:flex-initial">
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="text-zinc-400 text-xs font-bold uppercase">Turma:</span>
            <select
              value={selectedClassId}
              onChange={(e) => handleClassOrDateChange(e.target.value, selectedDate)}
              className="bg-transparent text-white text-xs font-bold uppercase outline-none cursor-pointer"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id} className="bg-zinc-900 text-white">
                  {cls.name} ({cls.unit?.name})
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Data */}
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded px-3 py-2">
            <Calendar className="w-4 h-4 text-purple-400" />
            <span className="text-zinc-400 text-xs font-bold uppercase">Data:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleClassOrDateChange(selectedClassId, e.target.value)}
              className="bg-transparent text-white text-xs font-mono font-bold outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Botão de Marcar Todos Presentes */}
        <button
          onClick={handleMarkAllPresent}
          type="button"
          className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold uppercase tracking-wider rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          Marcar Todos Presentes
        </button>
      </div>

      {/* Resumo da Chamada */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-[4px] text-center">
          <span className="text-emerald-400 font-bebas text-2xl leading-none">{presentCount}</span>
          <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Presentes</p>
        </div>
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-[4px] text-center">
          <span className="text-red-400 font-bebas text-2xl leading-none">{absentCount}</span>
          <p className="text-[10px] uppercase font-bold text-red-400 tracking-wider">Faltas</p>
        </div>
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-[4px] text-center">
          <span className="text-amber-400 font-bebas text-2xl leading-none">{justifiedCount}</span>
          <p className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Justificadas</p>
        </div>
      </div>

      {feedback && (
        <div className={`p-3 rounded-[4px] text-xs font-bold flex items-center gap-2 border ${
          feedback.type === 'success'
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/15 border-red-500/30 text-red-400'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Lista de Alunos na Beira do Campo */}
      {students.length === 0 ? (
        <div className="card-dark py-12 text-center space-y-2">
          <Users className="w-10 h-10 text-zinc-600 mx-auto" />
          <p className="text-sm font-bold text-zinc-300">Nenhum atleta matriculado nesta turma.</p>
          <p className="text-xs text-zinc-500">Matricule alunos para poder registrar presença.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {students.map((student, idx) => {
            const currentStatus = attendance[student.id] || 'present'

            return (
              <div
                key={student.id}
                className="card-dark p-3.5 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 hover:border-zinc-700 transition-all"
              >
                {/* Atleta info */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-zinc-600 font-bold w-5">
                    #{String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-sm shrink-0">
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">{student.name}</div>
                    <div className="text-[10px] text-zinc-400">
                      {student.preferred_position} • Tam {student.uniform_size || '10'}
                    </div>
                  </div>
                </div>

                {/* Botões de Ação Rápida no Celular */}
                <div className="grid grid-cols-3 gap-1.5 sm:w-80">
                  <button
                    type="button"
                    onClick={() => handleStatusChange(student.id, 'present')}
                    className={`py-2 px-3 rounded-[3px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      currentStatus === 'present'
                        ? 'bg-emerald-500 text-zinc-950 shadow-[0_0_12px_rgba(34,197,94,0.3)]'
                        : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Presente
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange(student.id, 'absent')}
                    className={`py-2 px-3 rounded-[3px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      currentStatus === 'absent'
                        ? 'bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                        : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-white'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" /> Falta
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange(student.id, 'justified')}
                    className={`py-2 px-3 rounded-[3px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      currentStatus === 'justified'
                        ? 'bg-amber-500 text-zinc-950 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                        : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-white'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> Justif.
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Botão de Salvar Flutuante / Bottom */}
      {students.length > 0 && (
        <div className="sticky bottom-4 z-20 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 rounded-[4px] text-xs font-bold uppercase tracking-widest shadow-[0_0_25px_rgba(34,197,94,0.4)] flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar Chamada do Treino
          </button>
        </div>
      )}
    </div>
  )
}
