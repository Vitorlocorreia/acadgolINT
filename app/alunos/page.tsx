import Link from 'next/link'
import {
  Users,
  PlusCircle,
  Search,
  ChevronRight,
  Phone,
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
          <h1 className="font-bebas text-3xl sm:text-4xl text-slate-900 tracking-wider leading-none flex items-center gap-2">
            <Users className="w-8 h-8 text-[#1A6B2E]" />
            Alunos & Atletas ({students.length})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Cadastro completo de atletas, responsáveis, fichas médicas e controle de matrículas.
          </p>
        </div>

        <Link
          href="/alunos/novo"
          className="px-4 py-2.5 bg-[#1A6B2E] hover:bg-[#0D4A1C] text-white font-bold text-xs uppercase tracking-wider rounded-[4px] flex items-center gap-2 shadow-xs transition-all shrink-0 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          Nova Matrícula
        </Link>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="card-light p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <form method="GET" className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-[4px] px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            name="search"
            defaultValue={params.search || ''}
            placeholder="Buscar por nome do aluno, responsável ou WhatsApp..."
            className="bg-transparent text-slate-800 text-xs w-full outline-none placeholder:text-slate-400"
          />
        </form>

        <div className="flex items-center gap-2">
          <Link
            href="/alunos"
            className={`px-3 py-1.5 rounded-[4px] text-xs font-bold uppercase tracking-wider border transition-all ${
              !params.status || params.status === 'all'
                ? 'bg-[#1A6B2E] text-white border-[#1A6B2E]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Todos
          </Link>
          <Link
            href="/alunos?status=active"
            className={`px-3 py-1.5 rounded-[4px] text-xs font-bold uppercase tracking-wider border transition-all ${
              params.status === 'active'
                ? 'bg-[#1A6B2E] text-white border-[#1A6B2E]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Ativos
          </Link>
          <Link
            href="/alunos?status=paused"
            className={`px-3 py-1.5 rounded-[4px] text-xs font-bold uppercase tracking-wider border transition-all ${
              params.status === 'paused'
                ? 'bg-[#1A6B2E] text-white border-[#1A6B2E]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Trancados
          </Link>
        </div>
      </div>

      {/* Lista de Alunos */}
      {students.length === 0 ? (
        <div className="card-light py-16 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-[#1A6B2E]/10 border border-[#1A6B2E]/20 flex items-center justify-center mx-auto text-[#1A6B2E]">
            <Users className="w-8 h-8" />
          </div>
          <p className="text-base font-bold text-slate-800">Nenhum aluno encontrado</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Comece cadastrando o primeiro aluno da escolinha de futebol com a ficha completa.
          </p>
          <div className="pt-2">
            <Link
              href="/alunos/novo"
              className="px-4 py-2 bg-[#1A6B2E] hover:bg-[#0D4A1C] text-white text-xs font-bold uppercase tracking-wider rounded-[4px] inline-flex items-center gap-1.5 shadow-xs"
            >
              <PlusCircle className="w-4 h-4" /> Cadastrar Primeiro Atleta
            </Link>
          </div>
        </div>
      ) : (
        <div className="card-light overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold">
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
              <tbody className="divide-y divide-slate-100">
                {students.map((st: any) => {
                  const age = calculateAge(st.birth_date)
                  const enrollment = Array.isArray(st.enrollment) ? st.enrollment[0] : st.enrollment

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Atleta */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-[4px] bg-[#1A6B2E]/10 border border-[#1A6B2E]/30 flex items-center justify-center font-bold text-[#1A6B2E] text-sm shrink-0">
                            {st.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{st.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Nasc: {st.birth_date?.split('-').reverse().join('/')}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Idade / Posição */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-800">{age} anos</div>
                        <div className="text-[10px] text-[#1A6B2E] font-semibold">
                          {st.preferred_position} • {st.dominant_foot}
                        </div>
                      </td>

                      {/* Turma / Categoria */}
                      <td className="px-5 py-4">
                        {enrollment?.class ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-800 block">{enrollment.class.name}</span>
                            <span className="text-[10px] text-slate-500 block">
                              📍 {enrollment.class.unit?.name || 'Unidade'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Sem turma vinculada</span>
                        )}
                      </td>

                      {/* Responsável */}
                      <td className="px-5 py-4">
                        {st.guardian ? (
                          <div>
                            <span className="font-bold text-slate-800 block">{st.guardian.name}</span>
                            <a
                              href={`https://wa.me/55${st.guardian.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-[#1A6B2E] font-semibold hover:underline flex items-center gap-1 font-mono"
                            >
                              <Phone className="w-3 h-3" /> {st.guardian.phone}
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Uniforme */}
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[11px] text-slate-700 font-bold">
                          Tam {st.uniform_size || '10'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          st.status === 'active'
                            ? 'bg-[#C8E6C9] text-[#0D4A1C] border-[#1A6B2E]/20'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {st.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>

                      {/* Ação */}
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/alunos/${st.id}`}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-[#1A6B2E]/10 hover:text-[#0D4A1C] text-slate-700 border border-slate-200 rounded text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1 transition-all"
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
