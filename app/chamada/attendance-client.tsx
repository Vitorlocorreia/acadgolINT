'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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
  Printer,
  History,
  ClipboardList,
  ChevronRight,
  TrendingUp,
  FileText,
  UserCheck,
  Clock,
} from 'lucide-react'
import { saveAttendanceAction, notifySingleStudentAttendanceAction } from './actions'
import { playWhistle, playSuccessChime } from '@/lib/audio/sound-effects'

interface SessionHistoryItem {
  key: string
  date: string
  classId: string
  className: string
  unitName: string
  categoryName: string
  coachName: string
  total: number
  present: number
  absent: number
  justified: number
  attendanceRate: number
  logs: any[]
}

interface Props {
  classId: string
  trainingDate: string
  students: any[]
  initialLogs: any[]
  classes: any[]
  history?: SessionHistoryItem[]
  initialTab?: string
}

export function AttendanceClient({
  classId,
  trainingDate,
  students,
  initialLogs,
  classes,
  history = [],
  initialTab = 'chamada',
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<'chamada' | 'historico'>((initialTab as any) || 'chamada')
  const [selectedDate, setSelectedDate] = useState(trainingDate)
  const [selectedClassId, setSelectedClassId] = useState(classId)
  const [selectedHistorySession, setSelectedHistorySession] = useState<SessionHistoryItem | null>(null)

  // Map of studentId -> 'present' | 'absent' | 'justified' | null
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'justified' | null>>(() => {
    const map: Record<string, 'present' | 'absent' | 'justified' | null> = {}
    students.forEach((s) => {
      const existing = initialLogs.find((l) => l.student_id === s.id)
      map[s.id] = existing ? existing.status : null
    })
    return map
  })

  const [coachNotes, setCoachNotes] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    initialLogs.forEach((l) => {
      if (l.coach_notes) map[l.student_id] = l.coach_notes
    })
    return map
  })

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [sendingStudentId, setSendingStudentId] = useState<string | null>(null)

  // Opções de disparo em lote
  const [notifyAbsents, setNotifyAbsents] = useState(true)
  const [notifyPresences, setNotifyPresences] = useState(true)

  const selectedClass = classes.find((c) => c.id === selectedClassId) || classes[0]

  const handleClassOrDateChange = (newClassId: string, newDate: string) => {
    setSelectedClassId(newClassId)
    setSelectedDate(newDate)
    router.push(`/chamada?classId=${newClassId}&date=${newDate}&tab=${activeTab}`)
  }

  const handleStatusChange = (
    studentId: string,
    status: 'present' | 'absent' | 'justified',
    studentName?: string
  ) => {
    setAttendance((prev) => {
      const current = prev[studentId]
      if (current === status) {
        setFeedback({
          type: 'success',
          message: `Atleta ${studentName || ''} desmarcado.`,
        })
        return { ...prev, [studentId]: null }
      }

      if (status === 'present') {
        playWhistle()
      }

      const label = status === 'present' ? 'PRESENTE (Check-in)' : status === 'absent' ? 'FALTA' : 'JUSTIFICADA'
      setFeedback({
        type: 'success',
        message: `Atleta ${studentName || ''} marcado como ${label}!`,
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
        setFeedback({ type: 'success', message: res.message || 'WhatsApp enviado com sucesso!' })
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erro ao enviar notificação.' })
      }
    })
  }

  const handleMarkAllPresent = () => {
    playWhistle()
    const map: Record<string, 'present' | 'absent' | 'justified' | null> = {}
    students.forEach((s) => {
      map[s.id] = 'present'
    })
    setAttendance(map)
    setFeedback({
      type: 'success',
      message: `Todos os ${students.length} atletas marcados como PRESENTES!`,
    })
  }

  const handleSaveAttendance = () => {
    setFeedback(null)

    const records = students.map((s) => ({
      student_id: s.id as string,
      status: (attendance[s.id] || 'absent') as 'present' | 'absent' | 'justified',
      coach_notes: coachNotes[s.id] || undefined,
    }))

    startTransition(async () => {
      const res = await saveAttendanceAction(selectedClassId, selectedDate, records, {
        notifyAbsents,
        notifyPresences,
      })

      if (res.success) {
        playSuccessChime()
        setFeedback({
          type: 'success',
          message: `Chamada salva com sucesso! ${res.notificationsSent || 0} aviso(s) disparado(s) no WhatsApp dos responsáveis.`,
        })
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Falha ao salvar chamada.',
        })
      }
    })
  }

  const handlePrint = () => {
    window.print()
  }

  // Contadores
  const presentCount = Object.values(attendance).filter((s) => s === 'present').length
  const absentCount = Object.values(attendance).filter((s) => s === 'absent').length
  const justifiedCount = Object.values(attendance).filter((s) => s === 'justified').length
  const pendingCount = students.length - (presentCount + absentCount + justifiedCount)
  const attendancePct = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0
  const trialCount = students.filter((s) => s.is_trial).length

  return (
    <div className="space-y-6">
      {/* NAVEGAÇÃO ENTRE CHAMADA E HISTÓRICO */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 print:hidden">
        <button
          onClick={() => setActiveTab('chamada')}
          className={`px-4 py-2 rounded-t-[6px] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'chamada'
              ? 'bg-[#D61F27] text-white border-b-2 border-[#8B0D12] shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Fazer Chamada em Campo</span>
        </button>

        <button
          onClick={() => setActiveTab('historico')}
          className={`px-4 py-2 rounded-t-[6px] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'historico'
              ? 'bg-purple-700 text-white border-b-2 border-purple-900 shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4 text-purple-400" />
          <span>Histórico de Treinos ({history.length})</span>
        </button>
      </div>

      {/* FEEDBACK */}
      {feedback && (
        <div
          className={`p-4 rounded-[6px] text-xs font-bold flex items-center gap-2 print:hidden ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-950 border border-emerald-300'
              : 'bg-red-50 text-red-950 border border-red-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#1A6B2E]" />
          ) : (
            <XCircle className="w-4 h-4 text-red-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 1: FAZER CHAMADA EM CAMPO */}
      {/* ========================================================= */}
      {activeTab === 'chamada' && (
        <div className="space-y-6">
          {/* Barra Superior: Seleção de Turma, Data e Ações */}
          <div className="card-light p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 print:hidden">
            <div className="flex flex-wrap items-center gap-3">
              {/* Seletor de Turma */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-[4px] px-3 py-2">
                <Users className="w-4 h-4 text-[#D61F27]" />
                <span className="text-slate-600 text-xs font-bold uppercase">Turma:</span>
                <select
                  value={selectedClassId}
                  onChange={(e) => handleClassOrDateChange(e.target.value, selectedDate)}
                  className="bg-transparent text-slate-800 text-xs font-bold outline-none cursor-pointer"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
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

            <div className="flex items-center gap-2 flex-wrap">
              {/* Botão Imprimir Ficha de Prancheta */}
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-[4px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5 text-slate-300" />
                Imprimir Lista
              </button>

              {/* Botão de Marcar Todos Presentes */}
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-[4px] flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200"
              >
                <Check className="w-3.5 h-3.5 text-[#1A6B2E]" />
                Todos Presentes
              </button>
            </div>
          </div>

          {/* Banner Informativo de Alunos Experimentais */}
          {trialCount > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-[6px] flex items-center justify-between gap-3 text-xs text-amber-900 shadow-xs print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-base">🧪</span>
                <span>
                  Esta turma possui <strong>{trialCount} atleta(s) em Aula Experimental</strong> hoje ({students.length - trialCount} matriculados regulares).
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-400 text-black border border-amber-500 shrink-0">
                {trialCount} Experimental
              </span>
            </div>
          )}

          {/* Resumo da Chamada com 4 Indicadores */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
            <div className="p-3 bg-[#C8E6C9]/40 border border-[#1A6B2E]/20 rounded-[6px] text-center">
              <span className="text-[#0D4A1C] font-bebas text-3xl leading-none block">{presentCount}</span>
              <p className="text-[10px] uppercase font-bold text-[#0D4A1C] tracking-wider">
                Presentes ({attendancePct}%)
              </p>
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

          {/* LISTA DE ALUNOS PARA CHECK-IN EM QUADRA */}
          <div className="card-light divide-y divide-slate-100 overflow-hidden print:hidden">
            {students.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Nenhum aluno ativo matriculado nesta turma.
              </div>
            ) : (
              students.map((student, idx) => {
                const status = attendance[student.id]
                const isSending = sendingStudentId === student.id

                return (
                  <div
                    key={student.id}
                    className={`p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-colors ${
                      status === 'present'
                        ? 'bg-emerald-50/40'
                        : status === 'absent'
                        ? 'bg-red-50/40'
                        : status === 'justified'
                        ? 'bg-amber-50/40'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Dados do Aluno */}
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center font-mono text-xs font-bold text-slate-400">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bebas text-lg font-bold shrink-0 overflow-hidden border border-slate-300">
                        {student.photo_url ? (
                          <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover" />
                        ) : (
                          student.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-2 flex-wrap">
                          <span>{student.name}</span>
                          {student.is_trial && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-amber-400 text-black border border-amber-500 shadow-xs flex items-center gap-1">
                              <span>🧪</span>
                              <span>EXPERIMENTAL</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span>{student.preferred_position || 'Atleta'}</span>
                          {student.is_trial ? (
                            <>
                              <span>•</span>
                              <span className="text-amber-800 font-bold">Aula Teste</span>
                            </>
                          ) : student.uniform_size ? (
                            <>
                              <span>•</span>
                              <span>Tam: {student.uniform_size}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Botões de Presença / Falta / Justificada + WhatsApp */}
                    <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(student.id, 'present', student.name)}
                        className={`px-3 py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                          status === 'present'
                            ? 'bg-[#1A6B2E] text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Presente
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusChange(student.id, 'absent', student.name)}
                        className={`px-3 py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                          status === 'absent'
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <XCircle className="w-4 h-4" />
                        Falta
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusChange(student.id, 'justified', student.name)}
                        className={`px-3 py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                          status === 'justified'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Justificada
                      </button>

                      {/* Notificar Individualmente no WhatsApp */}
                      <button
                        type="button"
                        onClick={() => handleQuickNotify(student.id, student.name)}
                        disabled={isSending || isPending}
                        title="Disparar aviso individual de presença ou falta no WhatsApp"
                        className="p-2 rounded bg-emerald-50 hover:bg-emerald-100 text-[#0D4A1C] border border-[#1A6B2E]/30 transition-all cursor-pointer shrink-0"
                      >
                        {isSending ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#1A6B2E]" />
                        ) : (
                          <Send className="w-4 h-4 text-[#1A6B2E]" />
                        )}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Barra Inferior de Gravação */}
          <div className="card-light p-4 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyAbsents}
                  onChange={(e) => setNotifyAbsents(e.target.checked)}
                  className="rounded text-[#1A6B2E] accent-[#1A6B2E]"
                />
                <span>Enviar aviso de falta no WhatsApp dos responsáveis com ausência</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyPresences}
                  onChange={(e) => setNotifyPresences(e.target.checked)}
                  className="rounded text-[#1A6B2E] accent-[#1A6B2E]"
                />
                <span>Enviar aviso de check-in / presença no WhatsApp dos responsáveis</span>
              </label>
            </div>

            <button
              type="button"
              onClick={handleSaveAttendance}
              disabled={isPending}
              className="px-6 py-2.5 bg-[#1A6B2E] hover:bg-[#0D4A1C] text-white rounded-[4px] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Chamada & Disparar Avisos
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 2: HISTÓRICO DE TREINOS & PRESENÇAS */}
      {/* ========================================================= */}
      {activeTab === 'historico' && (
        <div className="space-y-5 print:hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bebas text-2xl text-slate-900 tracking-wider leading-none flex items-center gap-2">
                <History className="w-5 h-5 text-purple-700" />
                Histórico de Chamadas Registradas
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Consulte a frequência e os registros de presenças de treinos passados.
              </p>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir Relatório
            </button>
          </div>

          {history.length === 0 ? (
            <div className="card-light py-16 text-center space-y-2">
              <ClipboardList className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Nenhum treino registrado no histórico ainda.</p>
              <p className="text-xs text-slate-500">
                Assim que você salvar uma chamada na quadra, o registro aparecerá automaticamente aqui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {history.map((sess) => {
                const dateStr = sess.date.split('-').reverse().join('/')

                return (
                  <div
                    key={sess.key}
                    className="card-light p-4 space-y-3 hover:border-purple-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div>
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-purple-600" />
                          <span>Treino de {dateStr}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {sess.className} • {sess.unitName}
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            sess.attendanceRate >= 80
                              ? 'bg-emerald-100 text-emerald-800'
                              : sess.attendanceRate >= 50
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {sess.attendanceRate}% Presença
                        </span>
                      </div>
                    </div>

                    {/* Indicadores de presença do treino */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-1.5 bg-emerald-50 rounded border border-emerald-200">
                        <span className="font-bebas text-xl text-emerald-800 leading-none block">
                          {sess.present}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-emerald-700">Presentes</span>
                      </div>

                      <div className="p-1.5 bg-red-50 rounded border border-red-200">
                        <span className="font-bebas text-xl text-red-800 leading-none block">
                          {sess.absent}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-red-700">Faltas</span>
                      </div>

                      <div className="p-1.5 bg-amber-50 rounded border border-amber-200">
                        <span className="font-bebas text-xl text-amber-800 leading-none block">
                          {sess.justified}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-amber-700">Justif.</span>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedHistorySession(sess)}
                        className="text-purple-700 hover:text-purple-900 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        Ver Lista Nominal ({sess.total}) <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleClassOrDateChange(sess.classId, sess.date)}
                        className="text-slate-600 hover:text-slate-900 text-[11px] font-bold"
                      >
                        Reabrir no Campo
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE DETALHES DO TREINO HISTÓRICO */}
      {selectedHistorySession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-[8px] max-w-lg w-full p-5 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h4 className="font-bebas text-xl text-slate-900 tracking-wider leading-none">
                  Treino: {selectedHistorySession.date.split('-').reverse().join('/')} — {selectedHistorySession.className}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {selectedHistorySession.present} presentes, {selectedHistorySession.absent} faltas (
                  {selectedHistorySession.attendanceRate}% de presença)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHistorySession(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="divide-y divide-slate-100 text-xs max-h-96 overflow-y-auto">
              {selectedHistorySession.logs.map((log: any) => {
                const isPresent = log.status === 'present'
                const isAbsent = log.status === 'absent'

                return (
                  <div key={log.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900">{log.student?.name}</div>
                      <div className="text-[10px] text-slate-400">{log.student?.preferred_position || 'Atleta'}</div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        isPresent
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : isAbsent
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {isPresent ? 'Presente' : isAbsent ? 'Falta' : 'Justificada'}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedHistorySession(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold uppercase text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* FICHA OFICIAL DE QUADRA PARA IMPRESSÃO (@media print) */}
      {/* ========================================================= */}
      <div className="hidden print:block text-black bg-white p-6 space-y-4 font-sans">
        {/* Cabeçalho Oficial */}
        <div className="border-b-2 border-black pb-3 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-wider uppercase text-black">Sport Club do Recife</h1>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
              Ficha Oficial de Chamada & Frequência de Treino
            </h2>
          </div>
          <div className="text-right text-xs font-mono">
            <div>Data do Treino: <strong>{selectedDate.split('-').reverse().join('/')}</strong></div>
            <div>Impresso em: {new Date().toLocaleDateString('pt-BR')}</div>
          </div>
        </div>

        {/* Metadados da Turma */}
        <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-100 border border-slate-300 text-xs">
          <div>Turma: <strong>{selectedClass?.name || 'Geral'}</strong></div>
          <div>Unidade: <strong>{selectedClass?.unit?.name || 'Principal'}</strong></div>
          <div>Horário: <strong>{selectedClass?.start_time || '—'} às {selectedClass?.end_time || '—'}</strong></div>
        </div>

        {/* Tabela de Atletas para marcar na prancheta */}
        <table className="w-full text-left text-xs border border-black border-collapse">
          <thead>
            <tr className="bg-slate-200 border-b border-black font-bold uppercase">
              <th className="p-2 border-r border-black w-8 text-center">Nº</th>
              <th className="p-2 border-r border-black">Nome do Atleta</th>
              <th className="p-2 border-r border-black w-24">Posição</th>
              <th className="p-2 border-r border-black text-center w-12">P</th>
              <th className="p-2 border-r border-black text-center w-12">F</th>
              <th className="p-2 border-r border-black text-center w-12">J</th>
              <th className="p-2">Assinatura / Visto do Treinador</th>
            </tr>
          </thead>
          <tbody>
            {students.map((st, i) => {
              const status = attendance[st.id]

              return (
                <tr key={st.id} className="border-b border-slate-300">
                  <td className="p-2 border-r border-black text-center font-mono font-bold">{i + 1}</td>
                  <td className="p-2 border-r border-black font-bold">
                    <span>{st.name}</span>
                    {st.is_trial && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-extrabold uppercase bg-amber-200 border border-amber-400 text-black">
                        [EXPERIMENTAL]
                      </span>
                    )}
                  </td>
                  <td className="p-2 border-r border-black">{st.preferred_position || '—'}</td>
                  <td className="p-2 border-r border-black text-center font-bold">
                    {status === 'present' ? '✓' : ''}
                  </td>
                  <td className="p-2 border-r border-black text-center font-bold">
                    {status === 'absent' ? '✗' : ''}
                  </td>
                  <td className="p-2 border-r border-black text-center font-bold">
                    {status === 'justified' ? 'J' : ''}
                  </td>
                  <td className="p-2 border-r border-black text-slate-400"></td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Rodapé com Totais e Assinatura */}
        <div className="pt-6 grid grid-cols-2 gap-8 text-xs">
          <div className="p-3 border border-slate-300 bg-slate-50 space-y-1">
            <div className="font-bold uppercase text-[10px] text-slate-500">Estatísticas do Treino:</div>
            <div>
              Total de Atletas na Turma: <strong>{students.length}</strong>{' '}
              {trialCount > 0 && <span>({trialCount} experimental)</span>}
            </div>
            <div>Presentes: <strong>{presentCount}</strong> ({attendancePct}%)</div>
            <div>Ausentes / Faltas: <strong>{absentCount}</strong></div>
            <div>Faltas Justificadas: <strong>{justifiedCount}</strong></div>
          </div>

          <div className="flex flex-col justify-end text-center space-y-1">
            <div className="border-b border-black w-3/4 mx-auto"></div>
            <div className="font-bold uppercase">Assinatura do Treinador / Professor</div>
            <div className="text-[10px] text-slate-500">Sport Club do Recife — Escolinha Oficial</div>
          </div>
        </div>
      </div>
    </div>
  )
}
