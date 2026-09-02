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
      <div className="card-light p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Seletor de Turma */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-[4px] px-3 py-2 flex-1 sm:flex-initial">
            <Users className="w-4 h-4 text-[#1A6B2E]" />
            <span className="text-slate-600 text-xs font-bold uppercase">Turma:</span>
            <select
              value={selectedClassId}
              onChange={(e) => handleClassOrDateChange(e.target.value, selectedDate)}
              className="bg-transparent text-slate-800 text-xs font-bold uppercase outline-none cursor-pointer"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id} className="bg-white text-slate-900">
                  {cls.name} ({cls.unit?.name})
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Data */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-[4px] px-3 py-2">
            <Calendar className="w-4 h-4 text-purple-600" />
            <span className="text-slate-600 text-xs font-bold uppercase">Data:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleClassOrDateChange(selectedClassId, e.target.value)}
              className="bg-transparent text-slate-800 text-xs font-mono font-bold outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Botão de Marcar Todos Presentes */}
        <button
          onClick={handleMarkAllPresent}
          type="button"
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-[4px] flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200"
        >
          <Check className="w-3.5 h-3.5 text-[#1A6B2E]" />
          Marcar Todos Presentes
        </button>
      </div>

      {/* Resumo da Chamada */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-[#C8E6C9]/40 border border-[#1A6B2E]/20 rounded-[6px] text-center">
          <span className="text-[#0D4A1C] font-bebas text-3xl leading-none block">{presentCount}</span>
          <p className="text-[10px] uppercase font-bold text-[#0D4A1C] tracking-wider">Presentes</p>
        </div>
        <div className="p-3 bg-red-50 border border-red-200 rounded-[6px] text-center">
          <span className="text-red-700 font-bebas text-3xl leading-none block">{absentCount}</span>
          <p className="text-[10px] uppercase font-bold text-red-800 tracking-wider">Faltas</p>
        </div>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-[6px] text-center">
          <span className="text-amber-700 font-bebas text-3xl leading-none block">{justifiedCount}</span>
          <p className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">Justificadas</p>
        </div>
      </div>

      {feedback && (
        <div className={`p-3 rounded-[4px] text-xs font-bold flex items-center gap-2 border ${
          feedback.type === 'success'
            ? 'bg-[#C8E6C9]/50 border-[#1A6B2E]/30 text-[#0D4A1C]'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-[#1A6B2E]" /> : <XCircle className="w-4 h-4 text-red-600" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Lista de Alunos na Beira do Campo */}
      {students.length === 0 ? (
        <div className="card-light py-12 text-center space-y-2">
          <Users className="w-10 h-10 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-700">Nenhum atleta matriculado nesta turma.</p>
          <p className="text-xs text-slate-500">Matricule alunos para poder registrar presença.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {students.map((student, idx) => {
            const currentStatus = attendance[student.id] || 'present'

            return (
              <div
                key={student.id}
                className="card-light p-3.5 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 hover:border-[#1A6B2E]/50 transition-all"
              >
                {/* Atleta info */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-400 font-bold w-5">
                    #{String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="w-9 h-9 rounded-[4px] bg-[#1A6B2E]/10 border border-[#1A6B2E]/30 flex items-center justify-center font-bold text-[#1A6B2E] text-sm shrink-0">
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{student.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {student.preferred_position} • Tam {student.uniform_size || '10'}
                    </div>
                  </div>
                </div>

                {/* Botões de Ação Rápida no Celular */}
                <div className="grid grid-cols-3 gap-1.5 sm:w-80">
                  <button
                    type="button"
                    onClick={() => handleStatusChange(student.id, 'present')}
                    className={`py-2 px-3 rounded-[4px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      currentStatus === 'present'
                        ? 'bg-[#1A6B2E] text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Presente
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange(student.id, 'absent')}
                    className={`py-2 px-3 rounded-[4px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      currentStatus === 'absent'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" /> Falta
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange(student.id, 'justified')}
                    className={`py-2 px-3 rounded-[4px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      currentStatus === 'justified'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
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
            className="w-full sm:w-auto px-8 py-3.5 bg-[#1A6B2E] hover:bg-[#0D4A1C] text-white rounded-[4px] text-xs font-bold uppercase tracking-widest shadow-md shadow-[#1A6B2E]/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
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
