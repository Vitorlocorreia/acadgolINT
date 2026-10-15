import { requirePage } from '@/lib/auth/session'
import { CheckSquare } from "lucide-react";
import {
  getClassesForAttendance,
  getClassStudentsAndAttendance,
  getAttendanceHistory,
} from "./actions";
import { AttendanceClient } from "./attendance-client";
import { schoolClock } from "@/lib/format";

interface Props {
  searchParams: Promise<{
    classId?: string;
    date?: string;
    tab?: string;
  }>;
}

export default async function ChamadaPage({ searchParams }: Props) {
  await requirePage('attendance.read');
  const params = await searchParams;
  const classes = await getClassesForAttendance();

  const todayStr = schoolClock().date;
  const selectedDate =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
      ? params.date
      : todayStr;
  const selectedClassId = params.classId || (classes[0]?.id ?? "");

  let students: any[] = [];
  let initialLogs: any[] = [];

  if (selectedClassId) {
    const data = await getClassStudentsAndAttendance(
      selectedClassId,
      selectedDate,
    );
    students = data.students;
    initialLogs = data.logs;
  }

  const history = await getAttendanceHistory(selectedClassId);

  return (
    <div className="page-container !max-w-6xl space-y-6">
      {/* Header */}
      <div className="screen-only">
        <p className="eyebrow mb-2">Dentro de campo</p>
        <h1 className="page-title">Chamada do treino</h1>
        <p className="page-subtitle">
          Cada atleta conta. Confira a turma e registre as presenças.
        </p>
      </div>

      {classes.length === 0 ? (
        <div className="card-light py-16 text-center space-y-2">
          <CheckSquare className="w-12 h-12 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-700">
            Nenhuma turma cadastrada no sistema.
          </p>
          <p className="text-xs text-slate-500">
            Cadastre turmas na aba Turmas & Grade.
          </p>
        </div>
      ) : (
        <AttendanceClient
          key={`${selectedClassId}:${selectedDate}`}
          classId={selectedClassId}
          trainingDate={selectedDate}
          students={students}
          initialLogs={initialLogs}
          classes={classes}
          history={history}
          initialTab={params.tab || "chamada"}
        />
      )}
    </div>
  );
}
