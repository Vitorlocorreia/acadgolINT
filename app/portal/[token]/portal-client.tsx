"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  CreditCard,
  Home,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Dialog } from "@/components/dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { FifaCard, type FifaCardProps } from "@/components/fifa-card";
import {
  calculateAge,
  formatDate,
  formatMoney,
  formatMonth,
  nextTraining,
  schoolClock,
} from "@/lib/format";

interface Invoice {
  id: string;
  reference_month: string;
  due_date: string;
  amount: number;
  charge_type?: 'monthly'|'registration';
  paid_amount?: number|null;
  settled_before_import?: boolean;
  status: string;
  pix_code?: string | null;
  paid_at?: string | null;
}
interface Match {
  id: string;
  title: string;
  opponent: string;
  match_date: string;
  match_time?: string | null;
  location?: string;
  status?: string;
}
interface Callup {
  id: string;
  access_token: string;
  status: string;
  match: Match | null;
}
export interface SchoolClass {
  name: string;
  days_of_week?: string[];
  start_time?: string;
  end_time?: string;
  unit?: { name: string } | null;
  coach?: { name: string; phone?: string } | null;
}
export interface PortalData {
  student: {
    name: string;
    birth_date: string;
    status: string;
    photo_url?: string | null;
    preferred_position?: string;
    dominant_foot?: string;
    uniform_size?: string;
    enrollment: {
      status: string;
      class: SchoolClass | null;
      plan?: { name: string } | null;
    }[];
    invoices: Invoice[];
  };
  attendance: { id: string; training_date: string; status: string }[];
  callups: Callup[];
  evaluation: FifaCardProps["evaluation"];
  asOf: string;
  errors: string[];
}
const tabs = [
  { id: "inicio", label: "Início", icon: Home },
  { id: "presenca", label: "Presença", icon: ClipboardCheck },
  { id: "jogos", label: "Jogos", icon: Trophy },
  { id: "financeiro", label: "Mensalidades", icon: CreditCard },
] as const;
type Tab = (typeof tabs)[number]["id"];

export function PortalClient({ data }: { data: PortalData }) {
  const { student, attendance, callups } = data;
  const [tab, setTab] = useState<Tab>("inicio");
  const [copied, setCopied] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [card, setCard] = useState<Callup | null>(null);
  const [passOpen, setPassOpen] = useState(false);
  const today = schoolClock(new Date(data.asOf)).date;
  const enrollment =
    student.enrollment?.find(
      (item) => item.status === "active" || item.status === "trial",
    ) || student.enrollment?.[0];
  const schoolClass = enrollment?.class;
  const next =
    student.status === "active" || student.status === "trial"
      ? nextTraining(
          schoolClass?.days_of_week,
          schoolClass?.start_time,
          new Date(data.asOf),
        )
      : null;
  const age = calculateAge(student.birth_date, today);
  const present = attendance.filter((log) => log.status === "present").length;
  const rate = attendance.length
    ? Math.round((present / attendance.length) * 100)
    : null;
  const pending = [...(student.invoices || [])]
    .filter((invoice) => ["pending", "overdue"].includes(invoice.status))
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const invoices = [...(student.invoices || [])].sort((a, b) =>
    b.reference_month.localeCompare(a.reference_month),
  );
  const matches = [...callups].sort((a, b) =>
    (a.match?.match_date || "").localeCompare(b.match?.match_date || ""),
  );
  const upcoming = matches.filter(
    (callup) =>
      callup.match &&
      callup.match.match_date >= today &&
      callup.match.status !== "cancelled",
  );
  const phone = schoolClass?.coach?.phone?.replace(/\D/g, "");
  const contact = phone
    ? `https://wa.me/${phone.length <= 11 ? "55" : ""}${phone}`
    : null;
  const activeStatus =
    student.status === "active"
      ? "Ativo"
      : student.status === "trial"
        ? "Experimental"
        : student.status === "paused"
          ? "Matrícula trancada"
          : "Inativo";
  const copyPix = async (invoice: Invoice) => {
    if (!invoice.pix_code) return;
    try {
      await navigator.clipboard.writeText(invoice.pix_code);
      setCopied(invoice.id);
      setFeedback(
        "Código PIX copiado. O pagamento deve ser realizado no aplicativo do seu banco.",
      );
      setTimeout(() => setCopied(null), 3000);
    } catch {
      setFeedback(
        "Não foi possível copiar automaticamente. Selecione o código exibido para copiá-lo.",
      );
    }
  };
  const showTab = (nextTab: Tab) => {
    setTab(nextTab);
    setFeedback(null);
  };
  const attendanceBlock = (
    <div className="surface overflow-hidden">
      <div className="surface-heading">
        <div>
          <h2 className="section-title">Presenças nos treinos</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Últimos {attendance.length || "10"} registros disponíveis
          </p>
        </div>
        <span className="badge badge-success">
          {rate === null ? "Sem registros" : `${rate}% de presença`}
        </span>
      </div>
      {attendance.length === 0 ? (
        <div className="empty-state">
          <ClipboardCheck size={28} />
          <strong>
            {data.errors.includes("presenças")
              ? "Presenças indisponíveis"
              : "O primeiro treino vem aí"}
          </strong>
          <p>
            {data.errors.includes("presenças")
              ? "Não foi possível consultar os registros agora."
              : "As presenças aparecerão aqui após o registro do professor."}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-color)]">
          {attendance.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between gap-3 px-5 py-4"
            >
              <div>
                <p className="text-sm font-semibold capitalize">
                  {formatDate(log.training_date, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Treino da escolinha
                </p>
              </div>
              <span
                className={`badge ${log.status === "present" ? "badge-success" : log.status === "absent" ? "badge-danger" : "badge-warning"}`}
              >
                {log.status === "present" ? (
                  <Check size={13} />
                ) : (
                  <AlertCircle size={13} />
                )}
                {log.status === "present"
                  ? "Presente"
                  : log.status === "absent"
                    ? "Falta"
                    : "Justificada"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const matchRow = (callup: Callup) =>
    callup.match && (
      <article className="surface p-5" key={callup.id}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <span className="eyebrow">Convocação</span>
          <span
            className={`badge ${callup.status === "confirmed" ? "badge-success" : "badge-warning"}`}
          >
            {callup.status === "confirmed"
              ? "Presença confirmada"
              : callup.status === "declined"
                ? "Não participará"
                : "Aguardando confirmação"}
          </span>
        </div>
        <h3 className="section-title">{callup.match.title}</h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Sport × {callup.match.opponent}
        </p>
        <div className="mt-4 grid gap-2 text-sm text-[var(--text-secondary)]">
          <p className="flex items-center gap-2">
            <CalendarDays size={16} />
            {formatDate(callup.match.match_date)}
            {callup.match.match_time &&
              ` · ${callup.match.match_time.slice(0, 5)}`}
          </p>
          {callup.match.location && (
            <p className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0" />
              {callup.match.location}
            </p>
          )}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={`/convocacao/${callup.access_token}`}
            className="button button-primary"
          >
            Ver convocação <ArrowRight size={15} />
          </Link>
          <button className="button" onClick={() => setCard(callup)}>
            <Sparkles size={15} /> Figurinha do atleta
          </button>
        </div>
      </article>
    );

  return (
    <div className="portal">
      <a href="#portal-content" className="skip-link">
        Ir para o conteúdo
      </a>
      <header className="portal-header">
        <div className="mx-auto flex max-w-[920px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/sport-recife.svg"
              alt="Escudo do Sport"
              width={34}
              height={43}
              priority
            />
            <div>
              <p className="text-sm font-bold tracking-tight">
                Sport Club do Recife
              </p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Portal da família
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <nav className="portal-nav" role="tablist" aria-label="Portal da família">
        {tabs.map(({ id, label, icon: Icon }, index) => (
          <button
            type="button"
            role="tab"
            id={`portal-tab-${id}`}
            aria-controls="portal-content"
            aria-selected={tab === id}
            tabIndex={tab === id ? 0 : -1}
            key={id}
            onClick={() => showTab(id)}
            onKeyDown={(event) => {
              const nextIndex =
                event.key === "ArrowRight"
                  ? (index + 1) % tabs.length
                  : event.key === "ArrowLeft"
                    ? (index + tabs.length - 1) % tabs.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? tabs.length - 1
                        : -1;
              if (nextIndex >= 0) {
                event.preventDefault();
                showTab(tabs[nextIndex].id);
                document
                  .getElementById(`portal-tab-${tabs[nextIndex].id}`)
                  ?.focus();
              }
            }}
          >
            <Icon size={19} aria-hidden="true" />
            <span>{label}</span>
            {id === "financeiro" && pending.length > 0 && (
              <span className="sr-only">, {pending.length} pendências</span>
            )}
          </button>
        ))}
      </nav>
      <main className="portal-main">
        <div
          id="portal-content"
          role="tabpanel"
          aria-labelledby={`portal-tab-${tab}`}
          tabIndex={-1}
          className="space-y-5 outline-none"
        >
          {data.errors.length > 0 && (
            <div role="alert" className="notice notice-warning">
              <AlertCircle size={18} className="shrink-0" />
              <p>
                Não foi possível carregar {data.errors.join(", ")}. Atualize a
                página para tentar novamente.
              </p>
            </div>
          )}
          {feedback && (
            <div role="status" className="notice">
              <Copy size={18} className="shrink-0" />
              <p>{feedback}</p>
            </div>
          )}
          {tab === "inicio" && (
            <>
              <div>
                <p className="eyebrow mb-2">Juntos em cada conquista</p>
                <h1 className="page-title">Olá, família!</h1>
                <p className="page-subtitle">
                  Acompanhe os próximos passos de {student.name.split(" ")[0]}.
                </p>
              </div>
              <section className="athlete-pass">
                <div className="relative z-10 flex items-center gap-4">
                  <div className="avatar !h-[64px] !w-[64px] !rounded-xl !bg-white/10 !text-2xl !text-white">
                    {student.photo_url ? (
                      <img src={student.photo_url} alt="" />
                    ) : (
                      student.name.charAt(0)
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[#f4cd79]">
                      Atleta do Sport
                    </span>
                    <h2 className="mt-1 text-xl font-bold leading-snug tracking-tight">
                      {student.name}
                    </h2>
                    <p className="mt-1 text-xs text-[#b8c2d5]">
                      {age === null ? "" : `${age} anos · `}
                      {student.preferred_position || "Em formação"}
                    </p>
                  </div>
                </div>
                <div className="relative z-10 mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                  <span className="text-xs font-semibold text-[#cbd4e3]">
                    {activeStatus}
                  </span>
                  <button
                    className="flex min-h-9 items-center gap-2 text-xs font-semibold text-white"
                    onClick={() => setPassOpen(true)}
                  >
                    Ver carteirinha <ArrowRight size={14} />
                  </button>
                </div>
              </section>
              <div className="grid gap-5 sm:grid-cols-2">
                <section className="surface p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="stat-icon">
                      <CalendarDays size={20} />
                    </span>
                    <h2 className="section-title">Próximo treino</h2>
                  </div>
                  {next ? (
                    <>
                      <p className="text-xl font-bold capitalize tracking-tight">
                        {formatDate(next.date, {
                          weekday: "long",
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[var(--brand)]">
                        {next.time}
                        {schoolClass?.end_time &&
                          ` – ${schoolClass.end_time.slice(0, 5)}`}
                      </p>
                      <p className="mt-4 text-sm font-semibold">
                        {schoolClass?.name}
                      </p>
                      <p className="mt-2 flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                        <MapPin size={15} className="shrink-0" />
                        {schoolClass?.unit?.name || "Local a confirmar"}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold">
                        Horário a confirmar
                      </p>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        {schoolClass?.name ||
                          "A secretaria pode ajudar com a turma e os horários."}
                      </p>
                    </>
                  )}
                  {contact && (
                    <a
                      href={contact}
                      target="_blank"
                      rel="noreferrer"
                      className="text-link mt-5"
                    >
                      <MessageCircle size={16} /> Falar com o professor
                    </a>
                  )}
                </section>
                <section className="surface p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="stat-icon">
                      <CreditCard size={20} />
                    </span>
                    <h2 className="section-title">Mensalidades</h2>
                  </div>
                  {pending.length ? (
                    <>
                      <span className="badge badge-warning">
                        {pending.length}{" "}
                        {pending.length === 1
                          ? "mensalidade em aberto"
                          : "mensalidades em aberto"}
                      </span>
                      <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight">
                        {formatMoney(
                          pending.reduce(
                            (sum, invoice) => sum + Number(invoice.amount),
                            0,
                          ),
                        )}
                      </p>
                      <p className="mt-2 text-xs text-[var(--text-muted)]">
                        {pending[0].due_date < today
                          ? "Vencimento mais antigo"
                          : "Próximo vencimento"}
                        : {formatDate(pending[0].due_date)}
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="badge badge-success">
                        <CheckCircle2 size={13} /> Tudo em dia
                      </span>
                      <p className="mt-4 text-sm text-[var(--text-secondary)]">
                        Nenhuma mensalidade em aberto neste momento.
                      </p>
                    </>
                  )}
                  <button
                    className="text-link mt-5"
                    onClick={() => showTab("financeiro")}
                  >
                    Ver mensalidades <ArrowRight size={15} />
                  </button>
                </section>
              </div>
              {upcoming[0] && (
                <section>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="section-title">O próximo desafio</h2>
                    <button
                      className="text-link"
                      onClick={() => showTab("jogos")}
                    >
                      Ver jogos <ArrowRight size={15} />
                    </button>
                  </div>
                  {matchRow(upcoming[0])}
                </section>
              )}
              <section className="surface flex items-center justify-between gap-4 p-5">
                <div>
                  <h2 className="text-sm font-semibold">
                    Cada treino faz a diferença
                  </h2>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {attendance.length
                      ? `${present} presenças nos últimos ${attendance.length} registros.`
                      : "O histórico aparece após o primeiro registro."}
                  </p>
                </div>
                <button
                  className="icon-button shrink-0"
                  aria-label="Ver histórico de presenças"
                  onClick={() => showTab("presenca")}
                >
                  <ArrowRight size={18} />
                </button>
              </section>
            </>
          )}
          {tab === "presenca" && (
            <>
              <div>
                <p className="eyebrow mb-2">Constância para evoluir</p>
                <h1 className="page-title">Presença nos treinos</h1>
                <p className="page-subtitle">
                  Acompanhe a frequência de {student.name.split(" ")[0]}.
                </p>
              </div>
              {schoolClass && (
                <div className="surface p-5">
                  <p className="font-semibold">{schoolClass.name}</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {schoolClass.unit?.name}
                    {schoolClass.coach && ` · ${schoolClass.coach.name}`}
                  </p>
                </div>
              )}
              {attendanceBlock}
            </>
          )}
          {tab === "jogos" && (
            <>
              <div>
                <p className="eyebrow mb-2">Vestindo o rubro-negro</p>
                <h1 className="page-title">Jogos e convocações</h1>
                <p className="page-subtitle">
                  Datas, locais e a figurinha do seu atleta.
                </p>
              </div>
              {matches.length ? (
                <div className="space-y-4">{matches.map(matchRow)}</div>
              ) : (
                <div className="surface empty-state">
                  <Trophy size={30} />
                  <strong>
                    {data.errors.includes("convocações")
                      ? "Convocações indisponíveis"
                      : "Novos desafios estão chegando"}
                  </strong>
                  <p>
                    As convocações de {student.name.split(" ")[0]} aparecerão
                    aqui.
                  </p>
                </div>
              )}
            </>
          )}
          {tab === "financeiro" && (
            <>
              <div>
                <p className="eyebrow mb-2">Organização fora de campo</p>
                <h1 className="page-title">Mensalidades</h1>
                <p className="page-subtitle">
                  Consulte vencimentos e o histórico de pagamentos.
                </p>
              </div>
              {pending.length > 0 && (
                <div className="notice notice-warning">
                  <AlertCircle size={18} className="shrink-0" />
                  <p>
                    {pending.length}{" "}
                    {pending.length === 1
                      ? "mensalidade em aberto"
                      : "mensalidades em aberto"}
                    . A confirmação aparece após a conferência do pagamento.
                  </p>
                </div>
              )}
              {invoices.length === 0 ? (
                <div className="surface empty-state">
                  <CreditCard size={28} />
                  <strong>Nenhuma mensalidade disponível</strong>
                  <p>As cobranças emitidas pela secretaria aparecerão aqui.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invoices.map((invoice) => {
                    const isPending = ["pending", "overdue"].includes(
                      invoice.status,
                    );
                    const late = isPending && invoice.due_date < today;
                    return (
                      <article key={invoice.id} className="surface p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h2 className="text-base font-bold capitalize">
                              {invoice.charge_type==='registration'?'Matrícula · ':''}{formatMonth(invoice.reference_month)}
                            </h2>
                            <p className="mt-1 text-xs text-[var(--text-secondary)]">
                              Vencimento em {formatDate(invoice.due_date)}
                            </p>
                          </div>
                          <span
                            className={`badge ${invoice.status === "paid" ? "badge-success" : late ? "badge-danger" : isPending ? "badge-warning" : ""}`}
                          >
                            {invoice.status === "paid"
                              ? (invoice.settled_before_import?"Quitado na importação":"Pago")
                              : invoice.status === 'unconfirmed' ? 'A confirmar com a secretaria'
                              : invoice.status === "cancelled"
                                ? "Cancelada"
                                : late
                                  ? "Em atraso"
                                  : "Em aberto"}
                          </span>
                        </div>
                        <p className="mt-5 text-2xl font-bold tracking-tight tabular-nums">
                          {formatMoney(invoice.amount)}
                        </p>
                        {invoice.status==='paid'&&!invoice.settled_before_import&&<p className="text-sm mt-2">Recebido: <strong>{formatMoney(Number(invoice.paid_amount??invoice.amount))}</strong>{Number(invoice.paid_amount??invoice.amount)<Number(invoice.amount)&&<span> · com desconto de {formatMoney(Number(invoice.amount)-Number(invoice.paid_amount))}</span>}</p>}
                        {invoice.settled_before_import&&<p className="text-sm mt-2">Quitação informada na planilha anterior.</p>}
                        {isPending && (
                          <div className="mt-5 border-t border-[var(--border-color)] pt-4">
                            {invoice.pix_code ? (
                              <>
                                <button
                                  className="button button-primary w-full sm:w-auto"
                                  onClick={() => copyPix(invoice)}
                                >
                                  {copied === invoice.id ? (
                                    <Check size={16} />
                                  ) : (
                                    <Copy size={16} />
                                  )}
                                  {copied === invoice.id
                                    ? "Código copiado"
                                    : "Copiar código PIX"}
                                </button>
                                <details className="mt-3 text-xs text-[var(--text-secondary)]">
                                  <summary className="cursor-pointer py-2">
                                    Exibir código para copiar manualmente
                                  </summary>
                                  <p className="mt-2 break-all rounded-lg bg-[var(--bg-subtle)] p-3 font-mono select-all">
                                    {invoice.pix_code}
                                  </p>
                                </details>
                                <p className="mt-3 text-xs text-[var(--text-muted)]">
                                  Copiar o código não confirma o pagamento.
                                </p>
                              </>
                            ) : (
                              <p className="text-sm text-[var(--text-secondary)]">
                                Código PIX ainda não disponibilizado. Consulte a
                                secretaria para pagar.
                              </p>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
        <footer className="mt-8 flex items-center justify-center gap-2 py-5 text-xs text-[var(--text-muted)]">
          <ShieldCheck size={15} />
          Sport Club do Recife · Escolinha do Sport
        </footer>
      </main>
      <Dialog
        open={passOpen}
        onClose={() => setPassOpen(false)}
        title="Carteirinha do atleta"
        description="Escolinha do Sport · Sport Club do Recife"
      >
        <div className="athlete-pass">
          <div className="flex items-center justify-between">
            <Image src="/sport-recife.svg" alt="Sport" width={38} height={48} />
            <span className="text-xs text-[#f4cd79]">{activeStatus}</span>
          </div>
          <div className="my-6 flex items-center gap-4">
            <div className="avatar !h-20 !w-20 !bg-white/10 !text-white">
              {student.photo_url ? (
                <img src={student.photo_url} alt="" />
              ) : (
                student.name.charAt(0)
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold">{student.name}</h3>
              <p className="mt-2 text-sm text-[#bac4d5]">
                {age === null ? "" : `${age} anos · `}
                {student.preferred_position}
              </p>
            </div>
          </div>
          <p className="border-t border-white/10 pt-4 text-sm text-[#bac4d5]">
            {schoolClass?.name || "Turma a definir"}
          </p>
        </div>
      </Dialog>
      <Dialog
        open={!!card}
        onClose={() => setCard(null)}
        title="Figurinha do atleta"
        description="Uma lembrança de cada convocação."
      >
        {card && (
          <FifaCard
            className="portal-figurinha"
            student={student}
            match={{ ...card.match, location: card.match?.location || "" }}
            evaluation={data.evaluation}
            interactive={true}
            edition="sport_leao"
          />
        )}
      </Dialog>
    </div>
  );
}
