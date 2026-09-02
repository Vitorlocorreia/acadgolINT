import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ChevronLeft,
  User,
  HeartPulse,
  DollarSign,
  Phone,
  Send,
} from 'lucide-react'
import { getStudentById } from '../actions'

interface Props {
  params: Promise<{ id: string }>
}

function fmt(val: number) {
  return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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

export default async function AlunoProfilePage({ params }: Props) {
  const { id } = await params
  const student = await getStudentById(id)

  if (!student) {
    notFound()
  }

  const age = calculateAge(student.birth_date)
  const enrollment = Array.isArray(student.enrollment) ? student.enrollment[0] : student.enrollment
  const guardian = Array.isArray(student.guardian) ? student.guardian[0] : student.guardian
  const medical = Array.isArray(student.medical_record) ? student.medical_record[0] : student.medical_record

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header com Voltar */}
      <div className="flex items-center justify-between">
        <Link
          href="/alunos"
          className="px-3 py-1.5 rounded-[6px] bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider shadow-2xs"
        >
          <ChevronLeft className="w-4 h-4" /> Voltar para a lista
        </Link>
      </div>

      {/* Hero / Carteirinha do Atleta */}
      <div className="card-light p-6 relative overflow-hidden bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-900 border border-emerald-700 text-white shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-[8px] bg-white text-emerald-900 border-2 border-white/60 flex items-center justify-center font-bebas text-4xl shadow-md shrink-0">
              {student.name.charAt(0)}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="font-bebas text-3xl sm:text-4xl tracking-wider leading-none">
                  {student.name}
                </h1>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                  student.status === 'active'
                    ? 'bg-white/20 text-white border-white/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {student.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-emerald-100 flex-wrap font-medium">
                <span className="text-white font-bold">{age} anos ({student.birth_date?.split('-').reverse().join('/')})</span>
                <span>•</span>
                <span className="text-emerald-200 font-bold">{student.preferred_position}</span>
                <span>•</span>
                <span>Pé: {student.dominant_foot}</span>
                <span>•</span>
                <span className="font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-white/20 text-white">
                  Uniforme: Tam {student.uniform_size || '10'}
                </span>
              </div>
            </div>
          </div>

          {/* Turma Atual */}
          {enrollment?.class && (
            <div className="p-3 bg-white/10 rounded-[6px] border border-white/20 text-xs space-y-1 self-stretch sm:self-auto sm:min-w-[220px] backdrop-blur-xs">
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-200 block">
                Turma Vinculada
              </span>
              <span className="font-bold text-white block">{enrollment.class.name}</span>
              <span className="text-emerald-100 text-[11px] block">📍 {enrollment.class.unit?.name}</span>
              <span className="text-emerald-200 text-[10px] font-mono block">
                Prof: {enrollment.class.coach?.name || 'Professor'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Grid de Informações: Responsável + Ficha Médica + Mensalidades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. DADOS DO RESPONSÁVEL */}
        <div className="card-light p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-4 h-4 text-blue-600" />
            <h3 className="font-bebas text-xl text-slate-900 tracking-wider leading-none">
              Responsável Legal
            </h3>
          </div>

          {guardian ? (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Nome</span>
                <span className="font-bold text-slate-800">{guardian.name} ({guardian.relationship})</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">WhatsApp</span>
                <a
                  href={`https://wa.me/55${guardian.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-emerald-700 hover:underline flex items-center gap-1 font-mono"
                >
                  <Phone className="w-3 h-3" /> {guardian.phone}
                </a>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">CPF</span>
                <span className="font-mono text-slate-700">{guardian.cpf}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">E-mail</span>
                <span className="text-slate-700">{guardian.email || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Endereço</span>
                <span className="text-slate-700 text-right">{guardian.address || 'Recife - PE'}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4">Nenhum responsável cadastrado.</p>
          )}
        </div>

        {/* 2. FICHA MÉDICA & SAÚDE */}
        <div className="card-light p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <HeartPulse className="w-4 h-4 text-red-600" />
            <h3 className="font-bebas text-xl text-slate-900 tracking-wider leading-none">
              Ficha Médica & Emergência
            </h3>
          </div>

          {medical ? (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Tipo Sanguíneo</span>
                <span className="font-bold text-red-600 font-mono">{medical.blood_type || 'Não informado'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Plano de Saúde</span>
                <span className="font-bold text-slate-800">{medical.health_insurance || 'Nenhum'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Alergias / Restrições</span>
                <span className="font-medium text-amber-700">{medical.allergies || 'Nenhuma'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Emergência Adicional</span>
                <span className="text-slate-700">
                  {medical.emergency_contact_name ? `${medical.emergency_contact_name} (${medical.emergency_contact_phone})` : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Uso de Imagem (LGPD)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {medical.image_use_authorized ? '✓ Autorizado' : 'Não'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4">Ficha médica não preenchida.</p>
          )}
        </div>

        {/* 3. HISTÓRICO DE MENSALIDADES */}
        <div className="card-light p-5 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bebas text-xl text-slate-900 tracking-wider leading-none">
                Mensalidades & Pagamentos
              </h3>
            </div>
            {enrollment && (
              <span className="text-xs font-mono text-slate-600 font-bold">
                Plano: {enrollment.plan?.name || 'Mensal'} • {fmt(enrollment.monthly_fee)}/mês
              </span>
            )}
          </div>

          {(student.invoices || []).length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Nenhuma fatura gerada para este atleta.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold">
                  <tr>
                    <th className="px-4 py-2.5">Mês Ref.</th>
                    <th className="px-4 py-2.5">Vencimento</th>
                    <th className="px-4 py-2.5">Valor</th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                    <th className="px-4 py-2.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(student.invoices || []).map((inv: any) => {
                    const isPaid = inv.status === 'paid'
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{inv.reference_month}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">
                          {inv.due_date?.split('-').reverse().join('/')}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{fmt(inv.amount)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {isPaid ? 'Pago' : 'Pendente'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!isPaid && guardian?.phone && (
                            <a
                              href={`https://wa.me/55${guardian.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                `Olá ${guardian.name}, tudo bem? Segue a mensalidade da Academia do Gol do atleta ${student.name} referente a ${inv.reference_month} no valor de ${fmt(inv.amount)}. Obrigado!`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] uppercase tracking-wider inline-flex items-center gap-1 shadow-2xs"
                            >
                              <Send className="w-3 h-3" /> Cobrar no WhatsApp
                            </a>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
