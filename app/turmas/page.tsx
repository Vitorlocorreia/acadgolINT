import { requirePage } from '@/lib/auth/session'
export const dynamic = 'force-dynamic'
import { CreatePanel } from '@/components/create-panel'
import { SubmitButton } from '@/components/submit-button'
import { PageHeader } from '@/components/page-header'
import { weekDayLabel } from '@/lib/format'
import Link from 'next/link'
import {
  CalendarDays,
  PlusCircle,
  User,
  Clock,
  ChevronRight,
} from 'lucide-react'
import { getClassesList, getUnitsAndCategoriesForClasses, createClassAction } from './actions'
import { CategorySelect } from './category-select'
import { classScheduleLabel } from '@/lib/class-schedule'
import { EditClass } from './edit-class'

export default async function TurmasPage() {
  const {staff}=await requirePage('classes.read');
  const classes = await getClassesList()
  const { categories, coaches } = await getUnitsAndCategoriesForClasses()

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <PageHeader eyebrow="Dentro de campo" title="Turmas e horários" description="Organize os treinos, acompanhe as vagas e encontre sua próxima chamada." />

      {/* Grid Principal: Turmas Existentes + Criar Nova Turma */}
      <div className="workspace-layout">
        {/* Lista de Turmas */}
        <div className="lg:col-span-2 space-y-4">
          {classes.length === 0 ? (
            <div className="card-light py-16 text-center space-y-2">
              <CalendarDays className="w-12 h-12 text-[var(--text-muted)] mx-auto" />
              <p className="text-sm font-bold text-[var(--text-secondary)]">Nenhuma turma cadastrada.</p>
              <p className="text-xs text-[var(--text-muted)]">Crie uma nova turma ao lado para começar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {classes.map((cls: any) => {
                const occupancyPct = cls.max_students > 0
                  ? (cls.active_students_count / cls.max_students) * 100
                  : 0

                return (
                  <div
                    key={cls.id}
                    className="card-light p-5 space-y-4 flex flex-col justify-between hover:border-[#c81930] transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="px-2 py-0.5 rounded text-xs font-bold tracking-normal bg-[#c81930]/10 text-[#a71327] border border-[#c81930]/20">
                            {cls.category?.name || 'Categoria a confirmar'}
                          </span>
                          <h3 className="section-title  text-[var(--text-primary)] tracking-tight mt-1.5 leading-tight">
                            {cls.name}
                          </h3>
                        </div>
                        <span className="text-xs font-mono font-bold text-[var(--text-secondary)]">
                          {classScheduleLabel(cls)}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>Prof. {cls.coach?.name || 'A definir'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-medium">
                          <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span>
                            {(cls.days_of_week || []).map(weekDayLabel).join(' • ')}
                          </span>
                        </div>
                      </div>

                      {/* Barra de Ocupação */}
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--text-muted)] font-medium">Atletas Matriculados</span>
                          <span className="font-mono font-bold text-[var(--text-primary)]">
                            {cls.active_students_count}{cls.max_students != null ? ` / ${cls.max_students}` : ' ativos · capacidade a confirmar'}
                          </span>
                        </div>
                        {cls.max_students != null && <div className="h-1.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden border border-[var(--border-color)]">
                          <div
                            className={`h-full rounded-full transition-all ${
                              occupancyPct >= 90 ? 'bg-amber-500' : 'bg-[#c81930]'
                            }`}
                            style={{ width: `${Math.min(occupancyPct, 100)}%` }}
                          />
                        </div>}
                      </div>
                      {cls.import_source && <p className="text-xs text-[var(--text-muted)]">Organização por dias e turno da planilha. Confira os horários e a divisão por idade com a equipe.</p>}
                    </div>

                    <div className="pt-3 border-t border-[var(--border-color)] space-y-2">
                      {staff.role !== 'treinador' && <EditClass value={cls} categories={categories} coaches={coaches} />}
                      <Link
                        href={`/chamada?classId=${cls.id}`}
                        className="button w-full py-2 bg-[#c81930]/10 hover:bg-[#c81930] hover:text-white text-[#a71327] text-xs font-bold tracking-normal rounded-lg text-center transition-all flex items-center justify-center gap-1 cursor-pointer border border-[#c81930]/20"
                      >
                        Fazer Chamada <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Formulário: Criar Nova Turma */}
        {staff.role!=='treinador'&&<CreatePanel key={classes.length} title="Nova turma">
          <div className="border-b border-[var(--border-color)] pb-3">
            <h3 className="section-title  text-[var(--text-primary)] tracking-tight leading-tight flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-[#c81930]" />
              Criar Nova Turma
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">Configure os horários e capacidade</p>
          </div>

          <form action={createClassAction} className="space-y-4">
            <div>
              <label htmlFor="field-appturmaspagetsx-101" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                Nome da Turma <span className="text-red-500">*</span>
              </label>
              <input id="field-appturmaspagetsx-101"
                type="text"
                name="name"
                required
                placeholder="Ex: Sub-09 Manhã (Ter/Qui)"
                className="input-escolinha"
              />
            </div>

            <CategorySelect initialCategories={categories} />

            <div>
              <label htmlFor="turmas-field-3" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                Professor / Treinador Responsável
              </label>
              <select id="turmas-field-3" name="coach_id" className="input-escolinha cursor-pointer">
                <option value="">A definir</option>
                {coaches.map((c) => (
                  <option key={c.user_id} value={c.id}>
                    {c.name} (@{c.username})
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--text-muted)] mt-2">{coaches.length ? 'Usuários ativos com cargo de treinador.' : 'Nenhum usuário treinador ativo disponível.'} Cadastre ou confira o acesso em <Link href="/equipe" target="_blank" rel="noopener noreferrer" className="text-link">Equipe e acessos ↗</Link>.</p>
            </div>

            <div>
              <label className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1.5">
                Dias da Semana <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'seg', label: 'Seg' },
                  { key: 'ter', label: 'Ter' },
                  { key: 'qua', label: 'Qua' },
                  { key: 'qui', label: 'Qui' },
                  { key: 'sex', label: 'Sex' },
                  { key: 'sab', label: 'Sáb' },
                ].map((d) => (
                  <label
                    key={d.key}
                    className="flex items-center gap-1.5 p-2 bg-[var(--bg-card-hover)] border border-[var(--border-color)] rounded text-xs cursor-pointer hover:border-[var(--border-color)]"
                  >
                    <input
                      type="checkbox"
                      name="days_of_week"
                      value={d.key}
                      defaultChecked={d.key === 'ter' || d.key === 'qui'}
                      className="rounded text-[#c81930] focus:ring-[#c81930] border-[var(--border-color)]"
                    />
                    <span className="text-[var(--text-primary)] font-bold">{d.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="field-appturmaspagetsx-102" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                  Início <span className="text-red-500">*</span>
                </label>
                <input id="field-appturmaspagetsx-102"
                  type="time"
                  name="start_time"
                  defaultValue="08:30"
                  required
                  className="input-escolinha font-mono"
                />
              </div>

              <div>
                <label htmlFor="field-appturmaspagetsx-103" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                  Fim <span className="text-red-500">*</span>
                </label>
                <input id="field-appturmaspagetsx-103"
                  type="time"
                  name="end_time"
                  defaultValue="09:45"
                  required
                  className="input-escolinha font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="field-appturmaspagetsx-104" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                Capacidade Máxima (Vagas) <span className="text-red-500">*</span>
              </label>
              <input id="field-appturmaspagetsx-104"
                type="number"
                name="max_students"
                defaultValue="20"
                min="5"
                max="50"
                required
                className="input-escolinha font-mono"
              />
            </div>

            <SubmitButton>
              Salvar Turma
            </SubmitButton>
          </form>
        </CreatePanel>}
      </div>
    </div>
  )
}
