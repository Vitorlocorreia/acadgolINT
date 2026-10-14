'use client'

import { useTransition } from 'react'
import { Lock, Unlock, Loader2 } from 'lucide-react'
import { toggleStudentStatusAction } from './actions'

interface Props {
  studentId: string
  currentStatus: 'active' | 'paused' | string
  compact?: boolean
}

export function StudentStatusToggle({ studentId, currentStatus, compact = false }: Props) {
  const [isPending, startTransition] = useTransition()
  const isPaused = currentStatus === 'paused'

  const handleToggle = () => {
    const nextStatus = isPaused ? 'active' : 'paused'
    const confirmMsg = isPaused
      ? 'Deseja REATIVAR a matrícula deste aluno? Ele voltará a aparecer nas turmas ativas e chamadas em quadra.'
      : 'Deseja TRANCAR a matrícula deste aluno? Ele não será cobrado no próximo mês e não aparecerá na chamada de campo.'

    if (!window.confirm(confirmMsg)) return

    startTransition(async () => {
      await toggleStudentStatusAction(studentId, nextStatus)
    })
  }

  if (compact) {
    return (
      <button
        onClick={handleToggle}
        disabled={isPending}
        title={isPaused ? 'Reativar Matrícula' : 'Trancar Matrícula'}
        className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 transition-all cursor-pointer border ${
          isPaused
            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
            : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
        }`}
      >
        {isPending ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : isPaused ? (
          <>
            <Unlock className="w-3 h-3 text-emerald-600" /> Reativar
          </>
        ) : (
          <>
            <Lock className="w-3 h-3 text-amber-600" /> Trancar
          </>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 transition-all cursor-pointer border shadow-xs ${
        isPaused
          ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
          : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600'
      }`}
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isPaused ? (
        <>
          <Unlock className="w-4 h-4" /> Reativar Matrícula do Aluno
        </>
      ) : (
        <>
          <Lock className="w-4 h-4" /> Trancar Matrícula
        </>
      )}
    </button>
  )
}
