import Link from 'next/link'
import {
  Users,
  PlusCircle,
  Search,
  Filter,
  ShieldAlert,
  ChevronRight,
  Phone,
  Calendar,
  Sparkles,
  Award,
} from 'lucide-react'
import { getStudentsList } from './actions'

interface Props {
  searchParams: Promise<{
    search?: string
    status?: string
  }>
}

function calculateAge(birthDateStr: string) {
  if (!birthDateStr) return 0
  const birth = new Date(birthDateStr)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--
  }
  return age
}

export default async function AlunosPage({ searchParams }: Props) {
  const params = await searchParams
  const students = await getStudentsList({
    search: params.search,
    status: params.status,
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-bebas text-3xl sm:text-4xl text-white tracking-wider leading-none flex items-center gap-2">
            <Users className="w-8 h-8 text-emerald-400" />
            Alunos & Atletas ({students.length})
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Cadastro completo de atletas, responsáveis, fichas médicas e controle de matrículas.
          </p>
        </div>

        <Link
          href="/alunos/novo"
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-[4px] flex items-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all shrink-0 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          Nova Matrícula
        </Link>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="card-dark p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <form method="GET" className="flex-1 flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-[4px] px-3 py-2">
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            type="text"
            name="search"
            defaultValue={params.search || ''}
            placeholder="Buscar por nome do aluno, responsável ou WhatsApp..."
            className="bg-transparent text-white text-xs w-full outline-none placeholder:text-zinc-600"
          />
        </form>

        <div className="flex items-center gap-2">
          <Link
            href="/alunos"
            className={`px-3 py-1.5 rounded-[3px] text-xs font-bold uppercase tracking-wider border transition-all ${
              !params.status || params.status === 'all'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
            }`}
          >
            Todos
          </Link>
          <Link
            href="/alunos?status=active"
            className={`px-3 py-1.5 rounded-[3px] text-xs font-bold uppercase tracking-wider border transition-all ${
              params.status === 'active'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
            }`}
          >
            Ativos
          </Link>
          <Link
            href="/alunos?status=paused"
            className={`px-3 py-1.5 rounded-[3px] text-xs font-bold uppercase tracking-wider border transition-all ${
              params.status === 'paused'
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
            }`}
          >
            Trancados
          </Link>
        </div>
      </div>

      {/* Lista de Alunos */}
      {students.length === 0 ? (
        <div className="card-dark py-16 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-600">
            <Users className="w-8 h-8" />
          </div>
          <p className="text-base font-bold text-zinc-300">Nenhum aluno encontrado</p>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Comece cadastrando o primeiro aluno da escolinha de futebol com a ficha completa.
          </p>
          <div className="pt-2">
            <Link
              href="/alunos/novo"
              className="px-4 py-2 bg-emerald-500 text-zinc-950 text-xs font-bold uppercase tracking-wider rounded-[4px] inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" /> Cadastrar Primeiro Atleta
            </Link>
          </div>
        </div>
      ) : (
        <div className="card-dark overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-5 py-3.5">Atleta</th>
                  <th className="px-5 py-3.5">Idade / Posição</th>
                  <th className="px-5 py-3.5">Turma / Categoria</th>
                  <th className="px-5 py-3.5">Responsável / Contato</th>
                  <th className="px-5 py-3.5">Uniforme</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {students.map((st: any) => {
                  const age = calculateAge(st.birth_date)
                  const enrollment = Array.isArray(st.enrollment) ? st.enrollment[0] : st.enrollment

                  return (
                    <tr key={st.id} className="hover:bg-zinc-900/50 transition-colors">
                      {/* Atleta */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-sm shrink-0">
                            {st.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{st.name}</div>
                            <div className="text-[10px] text-zinc-500 font-mono">
                              Nasc: {st.birth_date?.split('-').reverse().join('/')}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Idade / Posição */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-zinc-200">{age} anos</div>
                        <div className="text-[10px] text-emerald-400 font-medium">
                          {st.preferred_position} • {st.dominant_foot}
                        </div>
                      </td>

                      {/* Turma / Categoria */}
                      <td className="px-5 py-4">
                        {enrollment?.class ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-zinc-300 block">{enrollment.class.name}</span>
                            <span className="text-[10px] text-zinc-500 block">
                              📍 {enrollment.class.unit?.name || 'Unidade'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-600 italic">Sem turma vinculada</span>
                        )}
                      </td>

                      {/* Responsável */}
                      <td className="px-5 py-4">
                        {st.guardian ? (
                          <div>
                            <span className="font-bold text-zinc-300 block">{st.guardian.name}</span>
                            <a
                              href={`https://wa.me/55${st.guardian.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                            >
                              <Phone className="w-3 h-3" /> {st.guardian.phone}
                            </a>
                          </div>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      {/* Uniforme */}
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded font-mono text-[11px] text-zinc-300 font-bold">
                          Tam {st.uniform_size || '10'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-[2px] text-[10px] font-bold uppercase tracking-wider border ${
                          st.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}>
                          {st.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>

                      {/* Ação */}
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/alunos/${st.id}`}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-[3px] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1 transition-all"
                        >
                          Ver Ficha <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
