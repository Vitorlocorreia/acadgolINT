import Link from 'next/link'
import {
  Users,
  Calendar,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  PlusCircle,
  Flame,
  ChevronRight,
} from 'lucide-react'
import { getDashboardData } from './actions'

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  const collectionRate =
    data.currentMonthRevenue.total > 0
      ? (data.currentMonthRevenue.collected / data.currentMonthRevenue.total) * 100
      : 0

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#0D4A1C] via-[#1A6B2E] to-[#0D4A1C] border border-[#0D4A1C] p-6 rounded-[6px] shadow-xs relative overflow-hidden text-white">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-white/20 text-white border border-white/30 backdrop-blur-xs">
              Temporada 2026
            </span>
            <span className="text-xs text-[#C8E6C9] font-medium">Unidades Recife & Região Metropolitana</span>
          </div>
          <h1 className="font-bebas text-3xl sm:text-4xl tracking-wider leading-none">
            Painel Geral da Escolinha
          </h1>
          <p className="text-xs text-white/90">
            Controle de atletas, chamadas em quadra, mensalidades e desenvolvimento técnico.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2.5 flex-wrap relative z-10">
          <Link
            href="/alunos/novo"
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-[#0D4A1C] rounded-[4px] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-[#1A6B2E]" />
            Nova Matrícula
          </Link>
          <Link
            href="/chamada"
            className="px-4 py-2.5 bg-[#0D4A1C]/80 hover:bg-[#0D4A1C] text-white rounded-[4px] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border border-white/20 transition-all cursor-pointer"
          >
            <Clock className="w-4 h-4 text-[#C8E6C9]" />
            Fazer Chamada
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Alunos */}
        <div className="card-light p-5 space-y-3 hover:border-[#1A6B2E]/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Atletas Ativos</span>
            <div className="w-9 h-9 rounded-[4px] bg-[#1A6B2E]/10 border border-[#1A6B2E]/20 flex items-center justify-center text-[#1A6B2E]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="font-bebas text-4xl text-slate-900 leading-none tracking-wider">
              {data.activeStudents} <span className="text-sm font-sans text-slate-400 font-bold">/ {data.totalStudents} total</span>
            </div>
            <p className="text-[11px] text-[#1A6B2E] font-semibold mt-1 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" /> 8 categorias em atividade
            </p>
          </div>
        </div>

        {/* Faturamento do Mês */}
        <div className="card-light p-5 space-y-3 hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Mensalidades do Mês</span>
            <div className="w-9 h-9 rounded-[4px] bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="font-bebas text-4xl text-slate-900 leading-none tracking-wider">
              {fmt(data.currentMonthRevenue.collected)}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Previsto: {fmt(data.currentMonthRevenue.total)}
            </p>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1A6B2E] rounded-full transition-all"
              style={{ width: `${Math.min(collectionRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Inadimplência */}
        <div className="card-light p-5 space-y-3 hover:border-amber-300 transition-all border-amber-200 bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Em Atraso</span>
            <div className="w-9 h-9 rounded-[4px] bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="font-bebas text-4xl text-amber-700 leading-none tracking-wider">
              {fmt(data.currentMonthRevenue.overdue)}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              {data.currentMonthRevenue.overdueCount} mensalidade(s) pendente(s)
            </p>
          </div>
          <Link
            href="/financeiro?filter=overdue"
            className="text-[11px] font-bold text-amber-700 hover:underline flex items-center gap-1"
          >
            Cobrar no WhatsApp <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Aulas Experimentais */}
        <div className="card-light p-5 space-y-3 hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Aulas Experimentais</span>
            <div className="w-9 h-9 rounded-[4px] bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="font-bebas text-4xl text-slate-900 leading-none tracking-wider">
              {data.trialClassesPending.length}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Novos atletas agendados para esta semana
            </p>
          </div>
          <Link
            href="/experimentais"
            className="text-[11px] font-bold text-purple-700 hover:underline flex items-center gap-1"
          >
            Ver Leads <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Main Grid: Treinos de Hoje + Aulas Experimentais + Ações Rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Treinos de Hoje (Chamada na Quadra) */}
        <div className="lg:col-span-2 card-light p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-bebas text-2xl text-slate-900 tracking-wider leading-none">
                ⚽ Treinos & Turmas de Hoje
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Clique na turma para abrir a chamada digital e registrar as presenças na quadra.
              </p>
            </div>
            <Link
              href="/chamada"
              className="text-xs font-bold uppercase tracking-wider text-[#1A6B2E] hover:underline flex items-center gap-1"
            >
              Ver Todas <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {data.classesToday.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Calendar className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">Nenhum treino escalado para o dia de hoje.</p>
              <p className="text-xs text-slate-500">Confira a grade semanal completa na aba de turmas.</p>
              <div className="pt-2">
                <Link
                  href="/turmas"
                  className="px-4 py-2 bg-[#1A6B2E] hover:bg-[#0D4A1C] text-xs font-bold uppercase tracking-wider text-white rounded-[4px] inline-block shadow-xs"
                >
                  Gerenciar Grade de Turmas
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {data.classesToday.map((cls) => (
                <div
                  key={cls.id}
                  className="p-4 rounded-[4px] bg-slate-50 border border-slate-200 flex items-center justify-between gap-4 hover:border-[#1A6B2E] transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{cls.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#1A6B2E]/10 text-[#0D4A1C] border border-[#1A6B2E]/20">
                        {cls.category?.name || 'Geral'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3">
                      <span>📍 {cls.unit?.name}</span>
                      <span>👨‍🏫 {cls.coach?.name || 'Sem professor'}</span>
                      <span className="font-mono text-slate-700 font-semibold">
                        ⏰ {cls.start_time?.slice(0, 5)} - {cls.end_time?.slice(0, 5)}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/chamada?classId=${cls.id}`}
                    className="px-3.5 py-1.5 bg-[#1A6B2E] hover:bg-[#0D4A1C] text-white rounded-[4px] text-xs font-bold uppercase tracking-wider shrink-0 shadow-xs cursor-pointer"
                  >
                    Fazer Chamada
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card Lateral: Aulas Experimentais & Atalhos */}
        <div className="space-y-6">
          {/* Aulas Experimentais Recentes */}
          <div className="card-light p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bebas text-xl text-slate-900 tracking-wider leading-none flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-purple-600" /> Aulas Experimentais
              </h3>
              <Link href="/experimentais" className="text-xs text-purple-700 font-bold hover:underline">
                Ver Todas
              </Link>
            </div>

            {data.trialClassesPending.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Nenhuma aula teste agendada no momento.</p>
            ) : (
              <div className="space-y-2.5">
                {data.trialClassesPending.map((tc) => (
                  <div key={tc.id} className="p-3 bg-slate-50 rounded-[4px] border border-slate-200 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{tc.student_name} ({tc.student_age || '?'} anos)</span>
                      <span className="text-[10px] text-purple-700 font-mono font-bold">
                        {tc.scheduled_date?.split('-').reverse().join('/')}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      Resp: {tc.guardian_name} • {tc.guardian_phone}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Atalhos Rápidos */}
          <div className="card-light p-6 space-y-3">
            <h3 className="font-bebas text-xl text-slate-900 tracking-wider leading-none">
              ⚡ Gestão Rápida
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <Link
                href="/alunos/novo"
                className="p-3 bg-slate-50 hover:bg-[#1A6B2E]/10 hover:text-[#0D4A1C] border border-slate-200 rounded-[4px] flex items-center justify-between text-xs font-bold text-slate-700 transition-all"
              >
                <span>➕ Matricular Novo Atleta</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
              <Link
                href="/financeiro"
                className="p-3 bg-slate-50 hover:bg-[#1A6B2E]/10 hover:text-[#0D4A1C] border border-slate-200 rounded-[4px] flex items-center justify-between text-xs font-bold text-slate-700 transition-all"
              >
                <span>💬 Cobrar Mensalidades no WhatsApp</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
              <Link
                href="/avaliacoes"
                className="p-3 bg-slate-50 hover:bg-[#1A6B2E]/10 hover:text-[#0D4A1C] border border-slate-200 rounded-[4px] flex items-center justify-between text-xs font-bold text-slate-700 transition-all"
              >
                <span>⭐ Emitir Boletim / Scout do Atleta</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
