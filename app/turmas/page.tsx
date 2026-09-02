import Link from 'next/link'
import {
  CalendarDays,
  PlusCircle,
  Users,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import { getClassesList, getUnitsAndCategoriesForClasses, createClassAction } from './actions'

interface Props {
  searchParams: Promise<{ unitId?: string }>
}

const DAYS_MAP: Record<string, string> = {
  seg: 'Segunda',
  ter: 'Terça',
  qua: 'Quarta',
  qui: 'Quinta',
  sex: 'Sexta',
  sab: 'Sábado',
  dom: 'Domingo',
}

export default async function TurmasPage({ searchParams }: Props) {
  const params = await searchParams
  const classes = await getClassesList(params.unitId)
  const { units, categories, coaches } = await getUnitsAndCategoriesForClasses()

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-bebas text-3xl sm:text-4xl text-white tracking-wider leading-none flex items-center gap-2">
            <CalendarDays className="w-8 h-8 text-emerald-400" />
            Turmas & Grade de Treinos ({classes.length})
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Gestão das escalas de treino, categorias, professores e capacidade de atletas.
          </p>
        </div>
      </div>

      {/* Filtro por Unidade */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Link
          href="/turmas"
          className={`px-3.5 py-1.5 rounded-[4px] text-xs font-bold uppercase tracking-wider whitespace-nowrap border transition-all ${
            !params.unitId || params.unitId === 'all'
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
          }`}
        >
          📍 Todas as Unidades
        </Link>
        {units.map((u: any) => (
          <Link
            key={u.id}
            href={`/turmas?unitId=${u.id}`}
            className={`px-3.5 py-1.5 rounded-[4px] text-xs font-bold uppercase tracking-wider whitespace-nowrap border transition-all ${
              params.unitId === u.id
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
            }`}
          >
            {u.name.replace('Academia do Gol - ', '')}
          </Link>
        ))}
      </div>

      {/* Grid Principal: Turmas Existentes + Criar Nova Turma */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Turmas */}
        <div className="lg:col-span-2 space-y-4">
          {classes.length === 0 ? (
            <div className="card-dark py-16 text-center space-y-2">
              <CalendarDays className="w-12 h-12 text-zinc-600 mx-auto" />
              <p className="text-sm font-bold text-zinc-300">Nenhuma turma cadastrada nesta unidade.</p>
              <p className="text-xs text-zinc-500">Crie uma nova turma ao lado para começar.</p>
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
                    className="card-dark p-5 space-y-4 flex flex-col justify-between hover:border-emerald-500/40 transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {cls.category?.name || 'Geral'}
                          </span>
                          <h3 className="font-bebas text-2xl text-white tracking-wider mt-1 leading-none">
                            {cls.name}
                          </h3>
                        </div>
                        <span className="text-xs font-mono font-bold text-zinc-300">
                          {cls.start_time?.slice(0, 5)} - {cls.end_time?.slice(0, 5)}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{cls.unit?.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>Prof. {cls.coach?.name || 'A definir'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-300 font-medium">
                          <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span>
                            {(cls.days_of_week || []).map((d: string) => DAYS_MAP[d] || d).join(' • ')}
                          </span>
                        </div>
                      </div>

                      {/* Barra de Ocupação */}
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-zinc-400">Atletas Matriculados</span>
                          <span className="font-mono font-bold text-white">
                            {cls.active_students_count} / {cls.max_students}
                          </span>
                        </div>
                        <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                          <div
                            className={`h-full rounded-full transition-all ${
                              occupancyPct >= 90 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(occupancyPct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                      <Link
                        href={`/chamada?classId=${cls.id}`}
                        className="w-full py-2 bg-zinc-800 hover:bg-emerald-500 hover:text-zinc-950 text-white text-xs font-bold uppercase tracking-wider rounded-[3px] text-center transition-all flex items-center justify-center gap-1 cursor-pointer"
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
        <div className="card-dark p-6 space-y-4">
          <div className="border-b border-zinc-800 pb-3">
            <h3 className="font-bebas text-2xl text-white tracking-wider leading-none flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-400" />
              Criar Nova Turma
            </h3>
            <p className="text-xs text-zinc-400 mt-1">Configure os horários e capacidade</p>
          </div>

          <form action={createClassAction} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Nome da Turma <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="Ex: Sub-09 Manhã (Ter/Qui)"
                className="input-escolinha"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Unidade <span className="text-red-400">*</span>
              </label>
              <select name="unit_id" required className="input-escolinha cursor-pointer">
                {units.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Categoria de Idade <span className="text-red-400">*</span>
              </label>
              <select name="category_id" required className="input-escolinha cursor-pointer">
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.min_age} a {c.max_age} anos)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Professor / Treinador Responsável
              </label>
              <select name="coach_id" className="input-escolinha cursor-pointer">
                <option value="">A definir</option>
                {coaches.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Dias da Semana <span className="text-red-400">*</span>
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
                    className="flex items-center gap-1.5 p-2 bg-zinc-950 border border-zinc-800 rounded text-xs cursor-pointer hover:border-zinc-700"
                  >
                    <input
                      type="checkbox"
                      name="days_of_week"
                      value={d.key}
                      defaultChecked={d.key === 'ter' || d.key === 'qui'}
                      className="rounded text-emerald-500 focus:ring-emerald-400 bg-zinc-900 border-zinc-700"
                    />
                    <span className="text-zinc-300 font-bold">{d.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Início <span className="text-red-400">*</span>
                </label>
                <input
                  type="time"
                  name="start_time"
                  defaultValue="08:30"
                  required
                  className="input-escolinha font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Fim <span className="text-red-400">*</span>
                </label>
                <input
                  type="time"
                  name="end_time"
                  defaultValue="09:45"
                  required
                  className="input-escolinha font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Capacidade Máxima (Vagas) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                name="max_students"
                defaultValue="20"
                min="5"
                max="50"
                required
                className="input-escolinha font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-[4px] shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all cursor-pointer"
            >
              Salvar Turma
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
