import { requirePage } from '@/lib/auth/session'
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  MapPin,
  Plus,
  Trophy,
  Users,
  Wallet,
  AlertCircle,
  Target,
} from "lucide-react";
import { getDashboardData } from "./actions";
import { formatDate, formatMoney, formatMonth } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requirePage('dashboard.read');
  const data = await getDashboardData();
  const revenue = data.currentMonthRevenue;
  const month = formatMonth(data.today.slice(0, 7));
  const metrics = [
    {
      label: "Atletas ativos",
      value: data.activeStudents ?? "—",
      detail:
        data.totalStudents === null
          ? "Dados indisponíveis"
          : `${data.totalStudents} atletas cadastrados`,
      icon: Users,
      href: "/alunos?status=active",
    },
    {
      label: "Treinos hoje",
      value: data.errors.includes("turmas") ? "—" : data.classesToday.length,
      detail: "Confira os horários abaixo",
      icon: ClipboardCheck,
      href: "/chamada",
    },
    {
      label: "Recebido no mês",
      value: revenue ? formatMoney(revenue.collected) : "—",
      detail: revenue
        ? `${formatMoney(revenue.total)} previstos`
        : "Dados indisponíveis",
      icon: Wallet,
      href: "/financeiro",
    },
    {
      label: "Mensalidades em atraso",
      value: revenue ? formatMoney(revenue.overdue) : "—",
      detail: revenue
        ? `${revenue.overdueCount} cobranças no mês`
        : "Dados indisponíveis",
      icon: AlertCircle,
      href: "/financeiro?tab=inadimplentes",
    },
  ];
  return (
    <div className="page-container space-y-7">
      <div className="page-heading">
        <div>
          <p className="eyebrow mb-2">O jogo começa na formação</p>
          <h1 className="page-title">Hoje na escolinha</h1>
          <p className="page-subtitle capitalize">
            {formatDate(data.today, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/chamada" className="button">
            <ClipboardCheck size={17} /> Fazer chamada
          </Link>
          <Link href="/alunos/novo" className="button button-primary">
            <Plus size={17} /> Nova matrícula
          </Link>
        </div>
      </div>

      {data.errors.length > 0 && (
        <div className="notice notice-warning" role="alert">
          <AlertCircle size={19} className="shrink-0" />
          <p>
            Não foi possível carregar {data.errors.join(", ")}. Os dados
            indisponíveis estão sinalizados; tente atualizar a página.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-5">
        {metrics.map(({ label, value, detail, icon: Icon, href }) => (
          <Link
            href={href}
            className="surface group p-4 transition-colors hover:border-[var(--border-subtle)] sm:p-5"
            key={label}
          >
            <div className="mb-5 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                {label}
              </span>
              <Icon
                size={18}
                className="shrink-0 text-[var(--text-muted)]"
                aria-hidden="true"
              />
            </div>
            <div className="stat-number !text-[clamp(23px,2.4vw,32px)]">
              {value}
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">{detail}</p>
          </Link>
        ))}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
        <div className="space-y-6">
          <section
            className="surface overflow-hidden"
            aria-labelledby="today-trainings"
          >
            <div className="surface-heading">
              <div className="flex items-center gap-3">
                <span className="stat-icon">
                  <CalendarDays size={20} />
                </span>
                <div>
                  <h2 className="section-title" id="today-trainings">
                    Treinos de hoje
                  </h2>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Sua agenda dentro de campo
                  </p>
                </div>
              </div>
              <Link href="/turmas" className="text-link shrink-0">
                Ver grade <ArrowUpRight size={15} />
              </Link>
            </div>
            {data.errors.includes("turmas") ? (
              <div className="empty-state">
                <AlertCircle size={28} />
                <strong>Agenda indisponível</strong>
                <p>Não foi possível consultar as turmas agora.</p>
              </div>
            ) : data.classesToday.length === 0 ? (
              <div className="empty-state">
                <CalendarDays size={30} />
                <strong>Sem treinos programados para hoje</strong>
                <p>Os próximos encontros continuam na grade da escolinha.</p>
                <Link href="/turmas" className="button">
                  Consultar horários <ArrowRight size={15} />
                </Link>
              </div>
            ) : (
              data.classesToday.map((item) => (
                <div key={item.id} className="dashboard-training">
                  <div className="min-w-[54px] text-center">
                    <p className="text-lg font-bold tracking-tight">
                      {item.start_time?.slice(0, 5)}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {item.end_time?.slice(0, 5)}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{item.name}</h3>
                      {item.category && (
                        <span className="badge">{item.category.name}</span>
                      )}
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                      <MapPin size={13} className="shrink-0" />
                      {item.unit?.name || "Local a confirmar"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {item.coach?.name || "Professor a definir"}
                    </p>
                  </div>
                  <Link
                    href={`/chamada?classId=${item.id}&date=${data.today}`}
                    className="button shrink-0"
                  >
                    Abrir chamada <ArrowRight size={15} />
                  </Link>
                </div>
              ))
            )}
          </section>

          <section
            className="surface overflow-hidden"
            aria-labelledby="next-matches"
          >
            <div className="surface-heading">
              <div className="flex items-center gap-3">
                <span className="stat-icon">
                  <Trophy size={20} />
                </span>
                <h2 id="next-matches" className="section-title">
                  Próximos jogos
                </h2>
              </div>
              <Link href="/jogos" className="text-link">
                Ver jogos <ArrowUpRight size={15} />
              </Link>
            </div>
            {data.upcomingMatches.length === 0 ? (
              <div className="empty-state">
                <Trophy size={28} />
                <strong>
                  {data.errors.includes("jogos")
                    ? "Jogos indisponíveis"
                    : "O próximo desafio está por vir"}
                </strong>
                <p>
                  {data.errors.includes("jogos")
                    ? "Tente consultar a agenda novamente."
                    : "Agende uma partida para organizar os atletas e as convocações."}
                </p>
                <Link href="/jogos" className="button">
                  Ir para jogos
                </Link>
              </div>
            ) : (
              data.upcomingMatches.map((match) => (
                <Link
                  key={match.id}
                  href="/jogos"
                  className="dashboard-training hover:bg-[var(--bg-card-hover)]"
                >
                  <span className="stat-icon shrink-0">
                    <Trophy size={19} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{match.title}</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      vs. {match.opponent}
                    </p>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      {formatDate(match.match_date)}{" "}
                      {match.match_time && `· ${match.match_time.slice(0, 5)}`}{" "}
                      {match.category && `· ${match.category.name}`}
                    </p>
                  </div>
                  <ArrowUpRight
                    size={17}
                    className="shrink-0 text-[var(--text-muted)]"
                  />
                </Link>
              ))
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section
            className="surface overflow-hidden"
            aria-labelledby="next-trials"
          >
            <div className="surface-heading">
              <div>
                <p className="eyebrow mb-1">Novos talentos</p>
                <h2 className="section-title" id="next-trials">
                  Aulas experimentais
                </h2>
              </div>
              <Target size={21} className="text-[var(--brand)]" />
            </div>
            {data.trialClassesPending.length === 0 ? (
              <div className="empty-state">
                <strong>
                  {data.errors.includes("aulas experimentais")
                    ? "Agenda indisponível"
                    : "Nenhuma aula futura agendada"}
                </strong>
                <p>Consulte o acompanhamento das aulas experimentais.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-color)] px-5">
                {data.trialClassesPending.map((trial) => (
                  <div key={trial.id} className="py-4">
                    <p className="text-sm font-semibold">
                      {trial.student_name}
                    </p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                      <Clock3 size={13} />
                      {formatDate(trial.scheduled_date)}{" "}
                      {trial.scheduled_time &&
                        `· ${trial.scheduled_time.slice(0, 5)}`}
                    </p>
                    {trial.category && (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {trial.category.name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-[var(--border-color)] p-4">
              <Link href="/experimentais" className="button w-full">
                Acompanhar experimentais <ArrowRight size={15} />
              </Link>
            </div>
          </section>
          <section className="surface p-5">
            <h2 className="section-title">Financeiro do mês</h2>
            <p className="mt-1 text-xs capitalize text-[var(--text-muted)]">
              {month}
            </p>
            <div className="my-5 flex items-end justify-between gap-3">
              <span className="text-sm text-[var(--text-secondary)]">
                Arrecadação
              </span>
              <strong className="text-xl tabular-nums">
                {revenue
                  ? `${Math.round(revenue.total ? (revenue.collected / revenue.total) * 100 : 0)}%`
                  : "—"}
              </strong>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-[var(--bg-subtle)]"
              role="progressbar"
              aria-label="Arrecadação mensal"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={
                revenue
                  ? Math.min(
                      100,
                      Math.round(
                        revenue.total
                          ? (revenue.collected / revenue.total) * 100
                          : 0,
                      ),
                    )
                  : undefined
              }
            >
              <div
                className="h-full rounded-full bg-[#c81930]"
                style={{
                  width: `${revenue && revenue.total ? Math.min(100, (revenue.collected / revenue.total) * 100) : 0}%`,
                }}
              />
            </div>
            <Link href="/financeiro" className="text-link mt-5">
              Abrir financeiro <ArrowRight size={15} />
            </Link>
          </section>
          <div className="relative overflow-hidden rounded-xl bg-[#161a24] p-6 text-white">
            <Image
              src="/sport-stadium-hero.jpg"
              alt=""
              fill
              sizes="400px"
              className="object-cover opacity-15"
            />
            <div className="relative">
              <Image src="/sport-recife.svg" alt="" width={28} height={36} />
              <p className="font-bebas mt-4 text-2xl">Formando novos leões.</p>
              <p className="mt-2 max-w-[28ch] text-xs leading-relaxed text-[#b8c2d5]">
                Cada treino é um passo na história de um atleta.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
