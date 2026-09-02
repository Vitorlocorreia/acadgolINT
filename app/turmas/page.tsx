import Link from 'next/link'
import {
  CalendarDays,
  PlusCircle,
  MapPin,
  User,
  Clock,
  ChevronRight,
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
          <h1 className="font-bebas text-3xl sm:text-4xl text-slate-900 tracking-wider leading-none flex items-center gap-2">
            <CalendarDays className="w-8 h-8 text-[#1A6B2E]" />
            Turmas & Grade de Treinos ({classes.length})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
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
              ? 'bg-[#1A6B2E] text-white border-[#1A6B2E] shadow-2xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
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
                ? 'bg-[#1A6B2E] text-white border-[#1A6B2E] shadow-2xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
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
            <div className="card-light py-16 text-center space-y-2">
              <CalendarDays className="w-12 h-12 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Nenhuma turma cadastrada nesta unidade.</p>
              <p className="text-xs text-slate-500">Crie uma nova turma ao lado para começar.</p>
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
                    className="card-light p-5 space-y-4 flex flex-col justify-between hover:border-[#1A6B2E] transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#1A6B2E]/10 text-[#0D4A1C] border border-[#1A6B2E]/20">
                            {cls.category?.name || 'Geral'}
                          </span>
                          <h3 className="font-bebas text-2xl text-slate-900 tracking-wider mt-1.5 leading-none">
                            {cls.name}
                          </h3>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-700">
                          {cls.start_time?.slice(0, 5)} - {cls.end_time?.slice(0, 5)}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#1A6B2E] shrink-0" />
                          <span>{cls.unit?.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>Prof. {cls.coach?.name || 'A definir'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-700 font-medium">
                          <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span>
                            {(cls.days_of_week || []).map((d: string) => DAYS_MAP[d] || d).join(' • ')}
                          </span>
                        </div>
                      </div>

                      {/* Barra de Ocupação */}
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500 font-medium">Atletas Matriculados</span>
                          <span className="font-mono font-bold text-slate-900">
                            {cls.active_students_count} / {cls.max_students}
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className={`h-full rounded-full transition-all ${
                              occupancyPct >= 90 ? 'bg-amber-500' : 'bg-[#1A6B2E]'
                            }`}
                            style={{ width: `${Math.min(occupancyPct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <Link
                        href={`/chamada?classId=${cls.id}`}
                        className="w-full py-2 bg-[#1A6B2E]/10 hover:bg-[#1A6B2E] hover:text-white text-[#0D4A1C] text-xs font-bold uppercase tracking-wider rounded-[4px] text-center transition-all flex items-center justify-center gap-1 cursor-pointer border border-[#1A6B2E]/20"
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
        <div className="card-light p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bebas text-2xl text-slate-900 tracking-wider leading-none flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-[#1A6B2E]" />
              Criar Nova Turma
            </h3>
            <p className="text-xs text-slate-500 mt-1">Configure os horários e capacidade</p>
          </div>

          <form action={createClassAction} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Nome da Turma <span className="text-red-500">*</span>
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Unidade <span className="text-red-500">*</span>
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Categoria de Idade <span className="text-red-500">*</span>
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
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
                    className="flex items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded text-xs cursor-pointer hover:border-slate-300"
                  >
                    <input
                      type="checkbox"
                      name="days_of_week"
                      value={d.key}
                      defaultChecked={d.key === 'ter' || d.key === 'qui'}
                      className="rounded text-[#1A6B2E] focus:ring-[#1A6B2E] border-slate-300"
                    />
                    <span className="text-slate-800 font-bold">{d.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Início <span className="text-red-500">*</span>
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Fim <span className="text-red-500">*</span>
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Capacidade Máxima (Vagas) <span className="text-red-500">*</span>
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
              className="w-full py-3 bg-[#1A6B2E] hover:bg-[#0D4A1C] text-white font-bold text-xs uppercase tracking-wider rounded-[4px] shadow-xs transition-all cursor-pointer"
            >
              Salvar Turma
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
