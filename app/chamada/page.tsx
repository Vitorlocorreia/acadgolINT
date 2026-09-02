import { CheckSquare } from 'lucide-react'
import { getClassesForAttendance, getClassStudentsAndAttendance } from './actions'
import { AttendanceClient } from './attendance-client'

interface Props {
  searchParams: Promise<{
    classId?: string
    date?: string
  }>
}

export default async function ChamadaPage({ searchParams }: Props) {
  const params = await searchParams
  const classes = await getClassesForAttendance()

  const todayStr = new Date().toISOString().slice(0, 10)
  const selectedDate = params.date || todayStr
  const selectedClassId = params.classId || (classes[0]?.id ?? '')

  let students: any[] = []
  let initialLogs: any[] = []

  if (selectedClassId) {
    const data = await getClassStudentsAndAttendance(selectedClassId, selectedDate)
    students = data.students
    initialLogs = data.logs
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-bebas text-3xl sm:text-4xl text-white tracking-wider leading-none flex items-center gap-2">
          <CheckSquare className="w-8 h-8 text-emerald-400" />
          Chamada Digital na Beira do Campo
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Marque a presença dos atletas diretamente pelo celular ou tablet na quadra.
        </p>
      </div>

      {classes.length === 0 ? (
        <div className="card-dark py-16 text-center space-y-2">
          <CheckSquare className="w-12 h-12 text-zinc-600 mx-auto" />
          <p className="text-sm font-bold text-zinc-300">Nenhuma turma cadastrada no sistema.</p>
          <p className="text-xs text-zinc-500">Cadastre turmas na aba Turmas & Grade.</p>
        </div>
      ) : (
        <AttendanceClient
          classId={selectedClassId}
          trainingDate={selectedDate}
          students={students}
          initialLogs={initialLogs}
          classes={classes}
        />
      )}
    </div>
  )
}
