"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  History,
  Loader2,
  MessageCircle,
  Printer,
  Search,
  Users,
  Volume2,
  VolumeX,
  XCircle,
} from "lucide-react";
import { Dialog } from "@/components/dialog";
import { formatDate } from "@/lib/format";
import {
  saveAttendanceAction,
  notifySingleStudentAttendanceAction,
} from "./actions";
import { playWhistle, playSuccessChime } from "@/lib/audio/sound-effects";

type Status = "present" | "absent" | "justified";
interface Student {
  id: string;
  name: string;
  photo_url?: string | null;
  preferred_position?: string;
  is_trial?: boolean;
}
interface Log {
  id: string;
  student_id: string;
  status: Status;
  coach_notes?: string | null;
  student?: { name: string };
}
interface ClassInfo {
  id: string;
  name: string;
  unit?: { name: string } | null;
  category?: { name: string } | null;
  start_time?: string;
  end_time?: string;
}
interface Session {
  key: string;
  date: string;
  classId: string;
  className: string;
  unitName: string;
  total: number;
  present: number;
  absent: number;
  justified: number;
  attendanceRate: number;
  logs: Log[];
}
interface Props {
  classId: string;
  trainingDate: string;
  students: Student[];
  initialLogs: Log[];
  classes: ClassInfo[];
  history?: Session[];
  initialTab?: string;
}
const labels: Record<Status, string> = {
  present: "Presente",
  absent: "Falta",
  justified: "Justificada",
};
const statusIcons = {
  present: CheckCircle2,
  absent: XCircle,
  justified: Clock3,
};

export function AttendanceClient({
  classId,
  trainingDate,
  students,
  initialLogs,
  classes,
  history = [],
  initialTab,
}: Props) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [tab, setTab] = useState(
    initialTab === "historico" ? "historico" : "chamada",
  );
  const [attendance, setAttendance] = useState<Record<string, Status | null>>(
    () =>
      Object.fromEntries(
        students.map((student) => [
          student.id,
          initialLogs.find((log) => log.student_id === student.id)?.status ||
            null,
        ]),
      ),
  );
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      initialLogs.map((log) => [log.student_id, log.coach_notes || ""]),
    ),
  );
  const [query, setQuery] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);
  const [sound, setSound] = useState(false);
  const [review, setReview] = useState(false);
  const [notifyAbsents, setNotifyAbsents] = useState(true);
  const [notifyPresences, setNotifyPresences] = useState(false);
  const [feedback, setFeedback] = useState<{
    error: boolean;
    text: string;
  } | null>(null);
  const [noteStudent, setNoteStudent] = useState<Student | null>(null);
  const [notifyStudent, setNotifyStudent] = useState<Student | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [nextLocation, setNextLocation] = useState<string | null>(null);
  const [saved, setSaved] = useState(() =>
    JSON.stringify(
      students.map((s) => [
        s.id,
        initialLogs.find((l) => l.student_id === s.id)?.status || null,
        initialLogs.find((l) => l.student_id === s.id)?.coach_notes || "",
      ]),
    ),
  );
  const signature = JSON.stringify(
    students.map((s) => [s.id, attendance[s.id], notes[s.id] || ""]),
  );
  const dirty = signature !== saved;
  const selectedClass = classes.find((item) => item.id === classId);
  const present = students.filter((s) => attendance[s.id] === "present").length;
  const absent = students.filter((s) => attendance[s.id] === "absent").length;
  const justified = students.filter(
    (s) => attendance[s.id] === "justified",
  ).length;
  const pending = students.length - present - absent - justified;
  const visible = students.filter(
    (s) =>
      s.name
        .toLocaleLowerCase("pt-BR")
        .includes(query.toLocaleLowerCase("pt-BR")) &&
      (!onlyPending || !attendance[s.id]),
  );

  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);

  const navigate = (nextClass: string, nextDate: string) => {
    if (!nextClass || !nextDate) return;
    const url = `/chamada?classId=${encodeURIComponent(nextClass)}&date=${encodeURIComponent(nextDate)}&tab=${tab}`;
    if (dirty) setNextLocation(url);
    else startTransition(() => router.push(url));
  };
  const mark = (student: Student, status: Status) => {
    if (sound && status === "present" && attendance[student.id] !== status)
      playWhistle();
    setAttendance((previous) => ({
      ...previous,
      [student.id]: previous[student.id] === status ? null : status,
    }));
    setFeedback(null);
  };
  const save = () => {
    if (pending || !students.length) return;
    startTransition(async () => {
      try {
        const records = students.map((student) => ({
          student_id: student.id,
          status: attendance[student.id] as Status,
          coach_notes: notes[student.id] || undefined,
        }));
        const result = await saveAttendanceAction(
          classId,
          trainingDate,
          records,
          { notifyAbsents, notifyPresences },
        );
        if (!result.success) {
          setFeedback({
            error: true,
            text:
              result.error ||
              "Não foi possível salvar. Suas marcações foram preservadas.",
          });
          setReview(false);
          return;
        }
        setSaved(signature);
        setReview(false);
        if (sound) playSuccessChime();
        const failed = result.notificationsFailed || 0;
        setFeedback({
          error: failed > 0,
          text: `Chamada salva. ${result.notificationsSent || 0} avisos aceitos pelo WhatsApp. ${result.notificationsSkipped || 0} já enviados.${failed ? ` ${failed} avisos pendentes; confira o histórico da Comunicação.` : ""}`,
        });
        router.refresh();
      } catch {
        setReview(false);
        setFeedback({
          error: true,
          text: "A conexão falhou. Suas marcações estão nesta tela; tente salvar novamente.",
        });
      }
    });
  };
  const notify = () => {
    if (!notifyStudent || !attendance[notifyStudent.id]) return;
    const student = notifyStudent;
    startTransition(async () => {
      try {
        const result = await notifySingleStudentAttendanceAction(
          student.id,
          trainingDate,
          attendance[student.id] as Status,
          classId,
        );
        setFeedback({
          error: !result.success,
          text:
            result.message ||
            result.error ||
            "Não foi possível enviar o aviso.",
        });
        setNotifyStudent(null);
      } catch {
        setNotifyStudent(null);
        setFeedback({
          error: true,
          text: "Não foi possível confirmar o envio. Verifique a conexão antes de tentar novamente.",
        });
      }
    });
  };

  return (
    <>
      <div className="screen-only space-y-5" aria-busy={busy}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="segmented"
            role="tablist"
            aria-label="Área de frequência"
          >
            <button
              id="tab-attendance"
              role="tab"
              aria-selected={tab === "chamada"}
              aria-controls="attendance-panel"
              onClick={() => setTab("chamada")}
            >
              <span className="flex items-center gap-2">
                <ClipboardCheck size={16} /> Chamada
              </span>
            </button>
            <button
              id="tab-history"
              role="tab"
              aria-selected={tab === "historico"}
              aria-controls="history-panel"
              onClick={() => setTab("historico")}
            >
              <span className="flex items-center gap-2">
                <History size={16} /> Histórico
              </span>
            </button>
          </div>
          <div className="flex gap-2">
            <button
              className="icon-button"
              aria-label={
                sound ? "Desligar sons da chamada" : "Ligar sons da chamada"
              }
              aria-pressed={sound}
              onClick={() => setSound(!sound)}
            >
              {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button
              className="button max-sm:!w-11 max-sm:!p-2"
              aria-label="Imprimir chamada"
              onClick={() => window.print()}
            >
              <Printer size={16} />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
          </div>
        </div>

        <div className="surface grid min-w-0 gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_180px]">
          <div className="min-w-0">
            <label htmlFor="attendance-class" className="field-label">
              Turma
            </label>
            <select
              id="attendance-class"
              className="field !w-full"
              value={classId}
              disabled={busy}
              onChange={(event) => navigate(event.target.value, trainingDate)}
            >
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {selectedClass?.unit && (
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                {selectedClass.unit.name}
                {selectedClass.start_time
                  ? ` · ${selectedClass.start_time.slice(0, 5)}`
                  : ""}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="attendance-date" className="field-label">
              Data do treino
            </label>
            <input
              id="attendance-date"
              type="date"
              className="field"
              value={trainingDate}
              disabled={busy}
              onChange={(event) => navigate(classId, event.target.value)}
            />
          </div>
        </div>

        {feedback && (
          <div
            role={feedback.error ? "alert" : "status"}
            className={`notice ${feedback.error ? "notice-warning" : "notice-success"}`}
          >
            <AlertCircle size={18} className="shrink-0" />
            <p>{feedback.text}</p>
          </div>
        )}
        {busy && (
          <p
            role="status"
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"
          >
            <Loader2 size={16} className="animate-spin" /> Processando, aguarde…
          </p>
        )}

        <section
          id="attendance-panel"
          role="tabpanel"
          aria-labelledby="tab-attendance"
          hidden={tab !== "chamada"}
          className="space-y-5"
        >
          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            aria-live="polite"
            aria-atomic="true"
          >
            {[
              { label: "Presentes", count: present, color: "var(--success)" },
              { label: "Faltas", count: absent, color: "var(--danger)" },
              {
                label: "Justificadas",
                count: justified,
                color: "var(--warning)",
              },
              {
                label: "Pendentes",
                count: pending,
                color: "var(--text-secondary)",
              },
            ].map((item) => (
              <div className="surface p-4" key={item.label}>
                <p className="text-xs font-semibold text-[var(--text-secondary)]">
                  {item.label}
                </p>
                <strong
                  className="mt-2 block text-2xl tabular-nums"
                  style={{ color: item.color }}
                >
                  {item.count}
                </strong>
              </div>
            ))}
          </div>

          <div className="surface overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-color)] p-4">
              <div className="relative min-w-[160px] flex-1">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-3.5 text-[var(--text-muted)]"
                />
                <input
                  type="search"
                  className="field !pl-10"
                  aria-label="Buscar atleta na chamada"
                  placeholder="Buscar atleta…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <button
                className="button"
                aria-pressed={onlyPending}
                onClick={() => setOnlyPending(!onlyPending)}
              >
                {onlyPending ? "Mostrar todos" : `Pendentes (${pending})`}
              </button>
              <button
                className="button button-quiet"
                disabled={!pending || busy}
                onClick={() => {
                  setAttendance((previous) =>
                    Object.fromEntries(
                      students.map((s) => [s.id, previous[s.id] || "present"]),
                    ),
                  );
                  setFeedback(null);
                }}
              >
                <Check size={16} /> Preencher pendentes
              </button>
            </div>
            {visible.length === 0 ? (
              <div className="empty-state">
                <Users size={28} />
                <strong>
                  {students.length === 0
                    ? "Nenhum atleta nesta turma"
                    : "Nenhum atleta neste filtro"}
                </strong>
                <p>
                  {students.length === 0
                    ? "Confira as matrículas e as aulas experimentais vinculadas."
                    : "Tente outro nome ou volte a mostrar todos os atletas."}
                </p>
                {students.length > 0 && (
                  <button
                    className="button"
                    onClick={() => {
                      setQuery("");
                      setOnlyPending(false);
                    }}
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            ) : (
              visible.map((student) => (
                <div className="attendance-row" key={student.id}>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="avatar">
                      {student.photo_url ? (
                        <img src={student.photo_url} alt="" />
                      ) : (
                        student.name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold">{student.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                        <span>{student.preferred_position || "Atleta"}</span>
                        {student.is_trial && (
                          <span className="badge badge-warning">
                            Experimental
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div
                    className="attendance-status"
                    role="group"
                    aria-label={`Presença de ${student.name}`}
                  >
                    {(["present", "absent", "justified"] as const).map(
                      (status) => {
                        const Icon = statusIcons[status];
                        return (
                          <button
                            key={status}
                            type="button"
                            data-status={status}
                            aria-label={`${labels[status]}: ${student.name}`}
                            aria-pressed={attendance[student.id] === status}
                            disabled={busy}
                            onClick={() => mark(student, status)}
                          >
                            <Icon size={16} aria-hidden="true" />
                            {labels[status]}
                          </button>
                        );
                      },
                    )}
                  </div>
                  <div className="col-span-full flex flex-wrap items-center justify-between gap-2">
                    <button
                      className="text-link !text-xs"
                      onClick={() => setNoteStudent(student)}
                    >
                      {notes[student.id]
                        ? "Editar observação"
                        : "Adicionar observação"}
                    </button>
                    <button
                      className="button button-quiet !min-h-9 !px-2 !py-1 !text-xs"
                      disabled={busy || !attendance[student.id]}
                      onClick={() => setNotifyStudent(student)}
                      aria-label={`Revisar aviso individual para responsáveis de ${student.name}`}
                    >
                      <MessageCircle size={15} /> Avisar responsável
                    </button>
                  </div>
                  {notes[student.id] && (
                    <p className="col-span-full break-words text-xs text-[var(--text-secondary)]">
                      {notes[student.id]}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="attendance-savebar">
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {students.length - pending} de {students.length} atletas
              </p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {pending
                  ? `${pending} ${pending === 1 ? "pendente" : "pendentes"} de marcação`
                  : dirty
                    ? "Alterações ainda não salvas"
                    : "Todas as marcações conferidas"}
              </p>
            </div>
            <button
              className="button button-primary shrink-0"
              disabled={busy || !students.length || pending > 0}
              onClick={() => setReview(true)}
            >
              Revisar e concluir <ArrowRight size={16} />
            </button>
          </div>
          {pending > 0 && (
            <p className="text-xs text-[var(--text-muted)]">
              Marque cada atleta antes de concluir. Atletas pendentes não serão
              registrados como falta automaticamente.
            </p>
          )}
        </section>

        <section
          id="history-panel"
          role="tabpanel"
          aria-labelledby="tab-history"
          hidden={tab !== "historico"}
        >
          <div className="surface overflow-hidden">
            <div className="surface-heading">
              <div>
                <h2 className="section-title">Treinos registrados</h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Histórico da turma selecionada
                </p>
              </div>
              <span className="badge">{history.length} treinos</span>
            </div>
            {history.length === 0 ? (
              <div className="empty-state">
                <History size={28} />
                <strong>O histórico começa no primeiro treino</strong>
                <p>As chamadas concluídas desta turma aparecerão aqui.</p>
              </div>
            ) : (
              history.map((item) => (
                <button
                  key={item.key}
                  className="flex w-full flex-wrap items-center justify-between gap-4 border-b border-[var(--border-color)] p-5 text-left last:border-0 hover:bg-[var(--bg-card-hover)]"
                  onClick={() => setSession(item)}
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {formatDate(item.date, {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {item.className}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="badge badge-success">
                      {item.present}/{item.total} presentes
                    </span>
                    <ArrowRight size={16} />
                  </div>
                </button>
              ))
            )}
          </div>
        </section>
      </div>

      <Dialog
        open={review}
        onClose={() => {
          if (!busy) setReview(false);
        }}
        title="Conferir chamada"
        description={`${selectedClass?.name || "Turma"} · ${formatDate(trainingDate, { day: "2-digit", month: "long", year: "numeric" })}`}
      >
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            [present, "Presentes"],
            [absent, "Faltas"],
            [justified, "Justificadas"],
          ].map(([count, label]) => (
            <div key={label} className="rounded-lg bg-[var(--bg-subtle)] p-3">
              <strong className="block text-2xl">{count}</strong>
              <span className="text-xs text-[var(--text-secondary)]">
                {label}
              </span>
            </div>
          ))}
        </div>
        <fieldset className="space-y-4">
          <legend className="mb-4 text-sm font-semibold">
            Avisos pelo WhatsApp
          </legend>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={notifyAbsents}
              onChange={(event) => setNotifyAbsents(event.target.checked)}
              className="mt-1 h-5 w-5 shrink-0"
            />
            <span>Avisar responsáveis sobre faltas ({absent})</span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={notifyPresences}
              onChange={(event) => setNotifyPresences(event.target.checked)}
              className="mt-1 h-5 w-5 shrink-0"
            />
            <span>Enviar check-in de presença ({present})</span>
          </label>
          <p className="text-xs text-[var(--text-muted)]">
            Somente contatos com notificações habilitadas receberão avisos.
            Repetir o envio pode gerar mensagens duplicadas.
          </p>
        </fieldset>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            className="button"
            disabled={busy}
            onClick={() => setReview(false)}
          >
            Voltar à lista
          </button>
          <button
            className="button button-primary"
            disabled={busy}
            onClick={save}
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ClipboardCheck size={16} />
            )}{" "}
            Salvar chamada
          </button>
        </div>
      </Dialog>
      <Dialog
        open={!!noteStudent}
        onClose={() => setNoteStudent(null)}
        title="Observação do treino"
        description={noteStudent?.name}
      >
        <div>
          <label className="field-label" htmlFor="coach-note">
            Observação para o registro de presença
          </label>
          <textarea
            id="coach-note"
            rows={4}
            maxLength={1500}
            className="field resize-y"
            value={noteStudent ? notes[noteStudent.id] || "" : ""}
            onChange={(event) => {
              if (noteStudent)
                setNotes({ ...notes, [noteStudent.id]: event.target.value });
            }}
          />
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            A observação será salva ao concluir a chamada.
          </p>
        </div>
        <button
          className="button button-primary justify-self-end"
          onClick={() => setNoteStudent(null)}
        >
          Concluir observação
        </button>
      </Dialog>
      <Dialog
        open={!!notifyStudent}
        onClose={() => {
          if (!busy) setNotifyStudent(null);
        }}
        title="Enviar aviso individual"
        description={
          notifyStudent
            ? `${notifyStudent.name} · ${labels[attendance[notifyStudent.id] || "present"]}`
            : ""
        }
      >
        <p className="text-sm text-[var(--text-secondary)]">
          Esta ação registra a marcação deste atleta e envia um aviso aos
          responsáveis que habilitaram notificações.
        </p>
        <div className="flex justify-end gap-2">
          <button
            className="button"
            disabled={busy}
            onClick={() => setNotifyStudent(null)}
          >
            Cancelar
          </button>
          <button
            className="button button-primary"
            disabled={busy}
            onClick={notify}
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <MessageCircle size={16} />
            )}{" "}
            Enviar aviso
          </button>
        </div>
      </Dialog>
      <Dialog
        open={!!nextLocation}
        onClose={() => setNextLocation(null)}
        title="Você tem marcações não salvas"
        description="Ao trocar a turma ou a data, as alterações desta tela serão descartadas."
      >
        <div className="flex flex-wrap justify-end gap-2">
          <button className="button" onClick={() => setNextLocation(null)}>
            Continuar editando
          </button>
          <button
            className="button button-primary"
            onClick={() => {
              const url = nextLocation;
              setNextLocation(null);
              if (url) startTransition(() => router.push(url));
            }}
          >
            Descartar e trocar
          </button>
        </div>
      </Dialog>
      <Dialog
        open={!!session}
        onClose={() => setSession(null)}
        title="Registro do treino"
        description={
          session ? `${session.className} · ${formatDate(session.date)}` : ""
        }
      >
        <div className="divide-y divide-[var(--border-color)]">
          {session?.logs.map((log) => (
            <div key={log.id} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">
                  {log.student?.name || "Atleta"}
                </span>
                <span
                  className={`badge ${log.status === "present" ? "badge-success" : log.status === "absent" ? "badge-danger" : "badge-warning"}`}
                >
                  {labels[log.status]}
                </span>
              </div>
              {log.coach_notes && (
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  {log.coach_notes}
                </p>
              )}
            </div>
          ))}
        </div>
      </Dialog>
      <section className="print-only">
        <h1>Sport Club do Recife · Chamada</h1>
        <p>
          {selectedClass?.name} ·{" "}
          {formatDate(trainingDate, {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>
        <table className="mt-5 w-full text-left text-sm">
          <thead>
            <tr>
              <th>Atleta</th>
              <th>Presença</th>
              <th>Observações</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>{student.name}</td>
                <td>
                  {attendance[student.id]
                    ? labels[attendance[student.id] as Status]
                    : "Pendente"}
                </td>
                <td>{notes[student.id]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
