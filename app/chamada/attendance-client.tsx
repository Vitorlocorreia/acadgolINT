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
  Send,
  Smartphone,
  Sparkles,
} from 'lucide-react'
import { saveAttendanceAction, notifySingleStudentAttendanceAction } from './actions'
import { playWhistle, playSuccessChime } from '@/lib/audio/sound-effects'

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

  // Map of studentId -> 'present' | 'absent' | 'justified' | null
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'justified' | null>>(() => {
    const map: Record<string, 'present' | 'absent' | 'justified' | null> = {}
    students.forEach((s) => {
      const existing = initialLogs.find((l) => l.student_id === s.id)
      map[s.id] = existing ? existing.status : null // default: null (não marcado)
    })
    return map
  })

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [sendingStudentId, setSendingStudentId] = useState<string | null>(null)

  const handleStatusChange = (
    studentId: string,
    status: 'present' | 'absent' | 'justified',
    studentName?: string
  ) => {
    setAttendance((prev) => {
      const current = prev[studentId]
      // Se já estava selecionado esse mesmo status, desmarca (toggle off)!
      if (current === status) {
        setFeedback({
          type: 'success',
          message: `Atleta ${studentName || ''} desmarcado (pendente).`,
        })
        return { ...prev, [studentId]: null }
      }

      // Se marcou presente, toca apito de futebol!
      if (status === 'present') {
        playWhistle()
      }

      // Senão, marca o novo status
      const label = status === 'present' ? 'PRESENTE (Check-in)' : status === 'absent' ? 'FALTA' : 'JUSTIFICADA'
      setFeedback({
        type: 'success',
        message: `Atleta ${studentName || ''} marcado como ${label}! (Clique novamente para desmarcar)`,
      })
      return { ...prev, [studentId]: status }
    })
  }

  const handleQuickNotify = (studentId: string, studentName: string) => {
    const status = attendance[studentId]
    if (!status) {
      setFeedback({
        type: 'error',
        message: `Marque primeiro se ${studentName} está Presente ou com Falta antes de notificar.`,
      })
      return
    }

    setSendingStudentId(studentId)
    setFeedback(null)
    startTransition(async () => {
      const res = await notifySingleStudentAttendanceAction(studentId, selectedDate, status, selectedClassId)
      setSendingStudentId(null)
      if (res.success) {
        playSuccessChime()
        setFeedback({
          type: 'success',
          message: `⚽ Notificação de ${status === 'present' ? 'Presença' : status === 'absent' ? 'Falta' : 'Justificativa'} enviada com sucesso no WhatsApp do responsável de ${studentName}!`,
        })
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Erro ao enviar notificação WhatsApp.',
        })
      }
    })
  }

  const handleMarkAllPresent = () => {
    const allAlreadyPresent = students.every((s) => attendance[s.id] === 'present')
    const updated: Record<string, 'present' | 'absent' | 'justified' | null> = {}

    if (allAlreadyPresent) {
      // Desmarca todos
      students.forEach((s) => {
        updated[s.id] = null
      })
      setAttendance(updated)
      setFeedback({
        type: 'success',
        message: 'Chamada desmarcada (todos pendentes).',
      })
    } else {
      // Marca todos presentes e toca apito
      playWhistle()
      students.forEach((s) => {
        updated[s.id] = 'present'
      })
      setAttendance(updated)
      setFeedback({
        type: 'success',
        message: 'Todos os atletas marcados como presentes! Clique novamente para desmarcar todos.',
      })
    }
  }

  const handleClassOrDateChange = (newClassId: string, newDate: string) => {
    setSelectedClassId(newClassId)
    setSelectedDate(newDate)
    router.push(`/chamada?classId=${newClassId}&date=${newDate}`)
  }

  const handleSave = () => {
    setFeedback(null)
    startTransition(async () => {
      const records = students
        .filter((s) => attendance[s.id] !== null && attendance[s.id] !== undefined)
        .map((s) => ({
          student_id: s.id,
          status: attendance[s.id] as 'present' | 'absent' | 'justified',
        }))

      if (records.length === 0) {
        setFeedback({
          type: 'error',
          message: 'Marque pelo menos um atleta como presente ou falta antes de salvar.',
        })
        return
      }

      const res = await saveAttendanceAction(selectedClassId, selectedDate, records, { notifyAbsents: true, notifyPresences: true })
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `✅ Chamada salva com sucesso! ${res.notificationsSent || 0} notificações de presença/falta transmitidas via WhatsApp oficial!`,
        })
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erro ao salvar chamada.' })
      }
    })
  }

  const presentCount = Object.values(attendance).filter((st) => st === 'present').length
  const absentCount = Object.values(attendance).filter((st) => st === 'absent').length
  const justifiedCount = Object.values(attendance).filter((st) => st === 'justified').length
  const pendingCount = students.length - (presentCount + absentCount + justifiedCount)

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

      {/* Resumo da Chamada com 4 Indicadores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
        <div className="p-3 bg-slate-100 border border-slate-200 rounded-[6px] text-center">
          <span className="text-slate-600 font-bebas text-3xl leading-none block">{pendingCount}</span>
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Pendentes</p>
        </div>
      </div>

      {feedback && (
        <div className={`p-3 rounded-[4px] text-xs font-bold flex items-center gap-2 border animate-in fade-in duration-150 ${
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
            const currentStatus = attendance[student.id]

            return (
              <div
                key={student.id}
                className={`card-light p-3.5 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-all ${
                  currentStatus === 'present'
                    ? 'border-[#1A6B2E]/60 bg-[#C8E6C9]/10'
                    : currentStatus === 'absent'
                    ? 'border-red-300 bg-red-50/20'
                    : currentStatus === 'justified'
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'hover:border-slate-300'
                }`}
              >
                {/* Atleta info */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-400 font-bold w-5">
                    #{String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className={`w-9 h-9 rounded-[4px] border flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                    currentStatus === 'present'
                      ? 'bg-[#1A6B2E] text-white border-[#1A6B2E]'
                      : currentStatus === 'absent'
                      ? 'bg-red-600 text-white border-red-600'
                      : currentStatus === 'justified'
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-[#1A6B2E]/10 border-[#1A6B2E]/30 text-[#1A6B2E]'
                  }`}>
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span>{student.name}</span>
                      {currentStatus && (
                        <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider ${
                          currentStatus === 'present'
                            ? 'bg-emerald-100 text-emerald-800'
                            : currentStatus === 'absent'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {currentStatus === 'present' ? 'Presente' : currentStatus === 'absent' ? 'Falta' : 'Justif.'}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {student.preferred_position} • Tam {student.uniform_size || '10'}
                    </div>
                  </div>
                </div>

                {/* Botões de Ação Rápida no Celular */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="grid grid-cols-3 gap-1.5 sm:w-72">
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.id, 'present', student.name)}
                      className={`py-2 px-3 rounded-[4px] text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1 ${
                        currentStatus === 'present'
                          ? 'bg-[#1A6B2E] text-white shadow-xs ring-2 ring-[#1A6B2E]/40 font-extrabold scale-[1.02]'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Presente
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.id, 'absent', student.name)}
                      className={`py-2 px-3 rounded-[4px] text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1 ${
                        currentStatus === 'absent'
                          ? 'bg-red-600 text-white shadow-xs ring-2 ring-red-600/40 font-extrabold scale-[1.02]'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" /> Falta
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.id, 'justified', student.name)}
                      className={`py-2 px-3 rounded-[4px] text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1 ${
                        currentStatus === 'justified'
                          ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-500/40 font-extrabold scale-[1.02]'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" /> Justif.
                    </button>
                  </div>

                  {/* Disparo Imediato 1-Click WhatsApp */}
                  <button
                    type="button"
                    onClick={() => handleQuickNotify(student.id, student.name)}
                    disabled={isPending || sendingStudentId === student.id || !currentStatus}
                    className={`py-2 px-3 rounded-[4px] text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-xs shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                      currentStatus === 'present'
                        ? 'bg-[#1A6B2E] hover:bg-[#0D4A1C] text-white'
                        : currentStatus === 'absent'
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : currentStatus === 'justified'
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                    title={
                      !currentStatus
                        ? 'Selecione Presente ou Falta primeiro'
                        : 'Disparar notificação no WhatsApp do responsável agora'
                    }
                  >
                    {sendingStudentId === student.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {currentStatus === 'present'
                        ? 'Avisar Presença'
                        : currentStatus === 'absent'
                        ? 'Avisar Falta'
                        : currentStatus === 'justified'
                        ? 'Avisar Justif.'
                        : 'Notificar WhatsApp'}
                    </span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Botão de Salvar Flutuante / Bottom */}
      {students.length > 0 && (
        <div className="sticky bottom-4 z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-lg border border-slate-200 dark:border-zinc-800 shadow-xl">
          <div className="text-xs text-slate-600 dark:text-slate-400">
            <span className="font-bold text-slate-800 dark:text-slate-200">Automação de WhatsApp Ativa:</span> Ao salvar, o sistema dispara o aviso oficial de presença ou ausência para todos os pais.
          </div>
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
            Salvar Chamada e Notificar Pais
          </button>
        </div>
      )}
    </div>
  )
}
