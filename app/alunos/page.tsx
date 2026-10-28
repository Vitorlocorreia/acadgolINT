import { requirePage } from '@/lib/auth/session'
import Link from "next/link";
import {
  ArrowRight,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { calculateAge, schoolClock } from "@/lib/format";
import { getStudentsList } from "./actions";
import {ListPagination} from '@/components/list-pagination';
import {StudentDeleteButton} from './student-delete-button';

interface Student {
  id: string;
  name: string;
  birth_date: string | null;
  status: string;
  deleted_at?: string | null;
  photo_url?: string | null;
  preferred_position?: string;
  guardian:
    | { name: string; phone: string }[]
    | { name: string; phone: string }
    | null;
  enrollment: {
    status: string;
    class: { name: string; unit: { name: string } | null } | null;
  }[];
  overdue_count: number;
}

export default async function AlunosPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string;page?:string;classId?:string }>;
}) {
  await requirePage('students.read');
  const params = await searchParams;
  const directory = await getStudentsList({
    search: params.search,
    status: params.status,
    classId:params.classId,
    page:Number(params.page||1),
  });
  const students=directory.students as Student[];
  const selectedClass=directory.classes.find(item=>item.id===directory.classId);
  const hasFilters=Boolean(params.search||params.status||directory.classId!=='all');
  const today = schoolClock().date;
  const filterLink = (status: string) => {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (directory.classId!=='all') query.set('classId',directory.classId);
    if (status !== "all") query.set("status", status);
    return `/alunos${query.size ? `?${query}` : ""}`;
  };
  const detail = (student: Student) => {
    const guardian = Array.isArray(student.guardian)
      ? student.guardian[0]
      : student.guardian;
    const enrollment =
      student.enrollment?.find((item) =>
        ["active", "trial"].includes(item.status),
      ) || student.enrollment?.[0];
    const overdue = student.overdue_count || 0;
    const phone = guardian?.phone?.replace(/\D/g, "");
    return {
      guardian,
      enrollment,
      overdue,
      contact: phone && !student.deleted_at
        ? `https://wa.me/${phone.length <= 11 ? "55" : ""}${phone}`
        : null,
    };
  };
  const statusBadge = (student: Student) => (
    <span
      className={`badge ${student.status === "active" ? "badge-success" : student.status === "paused" || student.status === "trial" ? "badge-warning" : ""}`}
    >
      {student.deleted_at ? 'Excluído' : student.status === "active"
        ? "Ativo"
        : student.status === "paused"
          ? "Trancado"
          : student.status === "trial"
            ? "Experimental"
            : "Inativo"}
    </span>
  );
  return (
    <div className="page-container space-y-6">
      <div className="page-heading">
        <div>
          <p className="eyebrow mb-2">Nossa base</p>
          <h1 className="page-title">
            Atletas{" "}
            <span className="text-[var(--text-muted)]">
              ({directory.total})
            </span>
          </h1>
          <p className="page-subtitle">
            Cada atleta, sua turma e quem acompanha sua jornada.
          </p>
        </div>
        <Link href="/alunos/novo" className="button button-primary">
          <Plus size={17} /> Nova matrícula
        </Link>
      </div>
      <div className="surface space-y-4 p-4">
        <form key={`${params.search||''}:${params.status||''}:${directory.classId}`} className="grid items-end gap-3 md:grid-cols-[minmax(180px,1fr)_minmax(220px,1fr)_auto]" method="get">
          <div><label htmlFor="student-search" className="field-label">Atleta, responsável ou telefone</label><div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-3.5 text-[var(--text-muted)]"
          />
          <input
            id="student-search"
            type="search"
            name="search"
            defaultValue={params.search}
            placeholder="Buscar atleta ou responsável…"
            className="field !pl-10"
          />
          </div></div>
          <div><label htmlFor="student-class" className="field-label">Turma</label><select id="student-class" name="classId" className="field" defaultValue={directory.classId}>
            <option value="all">Todas as turmas</option>
            <option value="unassigned">Sem turma vinculada</option>
            {directory.classId!=='all'&&directory.classId!=='unassigned'&&!selectedClass&&<option value={directory.classId}>Turma indisponível</option>}
            {directory.classes.map(item=><option key={item.id} value={item.id}>{item.name}{item.is_active===false?' · inativa':''}</option>)}
          </select></div>
          {params.status && (
            <input type="hidden" name="status" value={params.status} />
          )}
          <button className="button button-primary" type="submit"><Search size={16}/>Aplicar filtros</button>
        </form>
        <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-1.5" aria-label="Filtrar atletas">
          {[
            ["all", "Todos"],
            ["active", "Ativos"],
            ["paused", "Trancados"],
            ["overdue", "Com pendências"],
            ["deleted", "Excluídos"],
          ].map(([value, label]) => (
            <Link
              key={value}
              href={filterLink(value)}
              aria-current={
                (params.status || "all") === value ? "page" : undefined
              }
              className={`button !min-h-10 !px-3 !text-xs ${(params.status || "all") === value ? "button-primary" : "button-quiet"}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        {hasFilters&&<Link href="/alunos" className="button button-quiet !text-xs">Limpar filtros</Link>}
        </div>
        {directory.classId!=='all'&&<div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-color)] pt-3"><p className="text-sm text-[var(--text-secondary)]"><strong>{directory.total}</strong> atleta(s) nos filtros · {directory.classId==='unassigned'?'Sem turma vinculada':selectedClass?.name||'Turma indisponível'}</p>{selectedClass&&<Link className="text-link text-sm" href={`/chamada?classId=${selectedClass.id}`}>Abrir chamada desta turma <ArrowRight size={15}/></Link>}</div>}
      </div>
      {params.status === 'deleted' && <p className="notice text-sm">Cadastros excluídos ficam fora da operação. Ao recuperar, o atleta volta como trancado. As cobranças e os pagamentos permanecem no financeiro.</p>}
      {!students.length ? (
        <div className="surface empty-state">
          <Users size={32} />
          <strong>
            {hasFilters
              ? "Nenhum atleta neste filtro"
              : "A próxima jornada começa aqui"}
          </strong>
          <p>
            {hasFilters
              ? "Confira o nome, a turma e a situação selecionados, ou remova os filtros."
              : "Cadastre um atleta para organizar a turma e acompanhar os treinos."}
          </p>
          <Link
            className="button"
            href={hasFilters ? "/alunos" : "/alunos/novo"}
          >
            {hasFilters
              ? "Limpar filtros"
              : "Nova matrícula"}
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {students.map((student) => {
              const { enrollment, overdue, contact } = detail(student);
              return (
                <article key={student.id} className="surface p-4">
                  <div className="flex items-start gap-3">
                    <div className="avatar">
                      {student.photo_url ? (
                        <img src={student.photo_url} alt="" />
                      ) : (
                        student.name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-bold">{student.name}</h2>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {calculateAge(student.birth_date, today) ?? "—"} anos ·{" "}
                        {student.preferred_position || "Atleta"}
                      </p>
                    </div>
                    {statusBadge(student)}
                  </div>
                  <p className="mt-4 text-sm font-semibold">
                    {enrollment?.class?.name || "Sem turma vinculada"}
                  </p>
                  {enrollment?.class?.unit && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <MapPin size={13} />
                      {enrollment.class.unit.name}
                    </p>
                  )}
                  {overdue > 0 && (
                    <p className="mt-3 text-xs font-semibold text-[var(--warning)]">
                      {overdue} mensalidade(s) em atraso
                    </p>
                  )}
                  <div className="mt-4 flex gap-2 border-t border-[var(--border-color)] pt-4">
                    <StudentDeleteButton studentId={student.id} studentName={student.name} deletedAt={student.deleted_at}/>
                    <Link
                      className="button flex-1"
                      href={`/alunos/${student.id}`}
                      prefetch={false}
                    >
                      Ver ficha <ArrowRight size={15} />
                    </Link>
                    {contact && (
                      <a
                        className="icon-button"
                        href={contact}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Conversar com responsável de ${student.name}`}
                      >
                        <MessageCircle size={18} />
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <div className="surface hidden overflow-hidden md:block">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Atleta</th>
                    <th scope="col">Turma</th>
                    <th scope="col">Responsável</th>
                    <th scope="col">Situação</th>
                    <th scope="col">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const { guardian, enrollment, overdue, contact } =
                      detail(student);
                    return (
                      <tr key={student.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="avatar">
                              {student.photo_url ? (
                                <img src={student.photo_url} alt="" />
                              ) : (
                                student.name.charAt(0)
                              )}
                            </div>
                            <div>
                              <Link
                                href={`/alunos/${student.id}`}
                                prefetch={false}
                                className="font-semibold hover:underline"
                              >
                                {student.name}
                              </Link>
                              <p className="mt-1 text-xs text-[var(--text-muted)]">
                                {calculateAge(student.birth_date, today) ?? "—"}{" "}
                                anos · {student.preferred_position || "Atleta"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <p className="font-semibold">
                            {enrollment?.class?.name || "Sem turma vinculada"}
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            {enrollment?.class?.unit?.name}
                          </p>
                        </td>
                        <td>
                          <p>{guardian?.name || "Não informado"}</p>
                          {contact && (
                            <a
                              href={contact}
                              target="_blank"
                              rel="noreferrer"
                              className="text-link mt-1 !text-xs"
                            >
                              <MessageCircle size={13} /> {guardian?.phone}
                            </a>
                          )}
                        </td>
                        <td>
                          {statusBadge(student)}
                          {overdue > 0 && (
                            <p className="mt-2 text-xs text-[var(--warning)]">
                              {overdue} mensalidade(s) em atraso
                            </p>
                          )}
                        </td>
                        <td className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                          <StudentDeleteButton studentId={student.id} studentName={student.name} deletedAt={student.deleted_at}/>
                          <Link
                            href={`/alunos/${student.id}`}
                            prefetch={false}
                            className="button whitespace-nowrap"
                          >
                            Ver ficha <ArrowRight size={14} />
                          </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      <ListPagination {...directory} path="/alunos" filters={{search:params.search,status:params.status,classId:directory.classId==='all'?undefined:directory.classId}}/>
    </div>
  );
}
