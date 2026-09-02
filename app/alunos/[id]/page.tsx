import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ChevronLeft,
  User,
  HeartPulse,
  DollarSign,
  CalendarDays,
  Award,
  Phone,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  QrCode,
  ShieldCheck,
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

  const totalPresences = (student.attendance || []).filter((a: any) => a.status === 'present').length
  const attendanceRate =
    (student.attendance || []).length > 0
      ? (totalPresences / student.attendance.length) * 100
      : 100

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header com Voltar */}
      <div className="flex items-center justify-between">
        <Link
          href="/alunos"
          className="px-3 py-1.5 rounded-[4px] bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
        >
          <ChevronLeft className="w-4 h-4" /> Voltar para a lista
        </Link>
      </div>

      {/* Hero / Carteirinha do Atleta */}
      <div className="card-dark p-6 relative overflow-hidden bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-[8px] bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center font-bebas text-4xl text-emerald-400 shadow-[0_0_25px_rgba(34,197,94,0.2)] shrink-0">
              {student.name.charAt(0)}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="font-bebas text-3xl sm:text-4xl text-white tracking-wider leading-none">
                  {student.name}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-[2px] text-[10px] font-bold uppercase tracking-wider border ${
                  student.status === 'active'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}>
                  {student.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap font-medium">
                <span className="text-zinc-200 font-bold">{age} anos ({student.birth_date?.split('-').reverse().join('/')})</span>
                <span>•</span>
                <span className="text-emerald-400 font-bold">{student.preferred_position}</span>
                <span>•</span>
                <span>Pé: {student.dominant_foot}</span>
                <span>•</span>
                <span className="font-mono bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 text-zinc-300">
                  Uniforme: Tam {student.uniform_size || '10'}
                </span>
              </div>
            </div>
          </div>

          {/* Turma Atual */}
          {enrollment?.class && (
            <div className="p-3 bg-zinc-950/80 rounded-[4px] border border-zinc-800 text-xs space-y-1 self-stretch sm:self-auto sm:min-w-[220px]">
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 block">
                Turma Vinculada
              </span>
              <span className="font-bold text-white block">{enrollment.class.name}</span>
              <span className="text-zinc-400 text-[11px] block">📍 {enrollment.class.unit?.name}</span>
              <span className="text-zinc-500 text-[10px] font-mono block">
                Prof: {enrollment.class.coach?.name || 'Professor'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Grid de Informações: Responsável + Ficha Médica + Frequência + Mensalidades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. DADOS DO RESPONSÁVEL */}
        <div className="card-dark p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <User className="w-4 h-4 text-blue-400" />
            <h3 className="font-bebas text-xl text-white tracking-wider leading-none">
              Responsável Legal
            </h3>
          </div>

          {guardian ? (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-zinc-800/60 pb-2">
                <span className="text-zinc-400 font-medium">Nome</span>
                <span className="font-bold text-white">{guardian.name} ({guardian.relationship})</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800/60 pb-2">
                <span className="text-zinc-400 font-medium">WhatsApp</span>
                <a
                  href={`https://wa.me/55${guardian.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                >
                  <Phone className="w-3 h-3" /> {guardian.phone}
                </a>
              </div>
              <div className="flex justify-between border-b border-zinc-800/60 pb-2">
                <span className="text-zinc-400 font-medium">CPF</span>
                <span className="font-mono text-zinc-300">{guardian.cpf}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800/60 pb-2">
                <span className="text-zinc-400 font-medium">E-mail</span>
                <span className="text-zinc-300">{guardian.email || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 font-medium">Endereço</span>
                <span className="text-zinc-300 text-right">{guardian.address || 'Recife - PE'}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-500 py-4">Nenhum responsável cadastrado.</p>
          )}
        </div>

        {/* 2. FICHA MÉDICA & SAÚDE */}
        <div className="card-dark p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <HeartPulse className="w-4 h-4 text-red-400" />
            <h3 className="font-bebas text-xl text-white tracking-wider leading-none">
              Ficha Médica & Emergência
            </h3>
          </div>

          {medical ? (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-zinc-800/60 pb-2">
                <span className="text-zinc-400 font-medium">Tipo Sanguíneo</span>
                <span className="font-bold text-red-400 font-mono">{medical.blood_type || 'Não informado'}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800/60 pb-2">
                <span className="text-zinc-400 font-medium">Plano de Saúde</span>
                <span className="font-bold text-zinc-300">{medical.health_insurance || 'Nenhum'}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800/60 pb-2">
                <span className="text-zinc-400 font-medium">Alergias / Restrições</span>
                <span className="font-medium text-amber-400">{medical.allergies || 'Nenhuma'}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800/60 pb-2">
                <span className="text-zinc-400 font-medium">Emergência Adicional</span>
                <span className="text-zinc-300">
                  {medical.emergency_contact_name ? `${medical.emergency_contact_name} (${medical.emergency_contact_phone})` : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 font-medium">Uso de Imagem (LGPD)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {medical.image_use_authorized ? '✓ Autorizado' : 'Não'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-500 py-4">Ficha médica não preenchida.</p>
          )}
        </div>

        {/* 3. HISTÓRICO DE MENSALIDADES */}
        <div className="card-dark p-5 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bebas text-xl text-white tracking-wider leading-none">
                Mensalidades & Pagamentos
              </h3>
            </div>
            {enrollment && (
              <span className="text-xs font-mono text-zinc-400 font-bold">
                Plano: {enrollment.plan?.name || 'Mensal'} • {fmt(enrollment.monthly_fee)}/mês
              </span>
            )}
          </div>

          {(student.invoices || []).length === 0 ? (
            <p className="text-xs text-zinc-500 py-6 text-center">Nenhuma fatura gerada para este atleta.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950 border-b border-zinc-800 text-zinc-500 uppercase font-bold">
                  <tr>
                    <th className="px-4 py-2.5">Mês Ref.</th>
                    <th className="px-4 py-2.5">Vencimento</th>
                    <th className="px-4 py-2.5">Valor</th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                    <th className="px-4 py-2.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {(student.invoices || []).map((inv: any) => {
                    const isPaid = inv.status === 'paid'
                    return (
                      <tr key={inv.id} className="hover:bg-zinc-900/40">
                        <td className="px-4 py-3 font-mono font-bold text-white">{inv.reference_month}</td>
                        <td className="px-4 py-3 font-mono text-zinc-300">
                          {inv.due_date?.split('-').reverse().join('/')}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-white">{fmt(inv.amount)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-[2px] text-[10px] font-bold uppercase tracking-wider border ${
                            isPaid
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
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
                              className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 rounded font-bold text-[11px] uppercase tracking-wider inline-flex items-center gap-1"
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
