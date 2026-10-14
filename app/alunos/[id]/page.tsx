import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import {
  ChevronLeft,
  User,
  HeartPulse,
  DollarSign,
  Phone,
  Send,
  Shield,
  Star,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import { getStudentById } from '../actions'
import { StudentStatusToggle } from '../student-status-toggle'
import { StudentGuardiansList } from './student-guardians-list'
import { StudentPhotoUpload } from '../student-photo-upload'

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
      {/* Header com Voltar e Links do Portal */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <Link
          href="/alunos"
          className="px-3.5 py-1.5 rounded-[4px] bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider shadow-2xs self-start"
        >
          <ChevronLeft className="w-4 h-4 text-[#D61F27]" /> Voltar para a lista
        </Link>

        {student.portal_token && (
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/portal/${student.portal_token}`}
              target="_blank"
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-[#D61F27] border border-[#D61F27]/30 rounded text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-2xs transition-all hover:border-[#D61F27]"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-500" /> Ver Portal do Responsável
            </Link>
            {guardian?.phone && (
              <a
                href={`https://wa.me/55${guardian.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                  `🏆 *ACADEMIA DO GOL • SPORT CLUB DO RECIFE* 🔴⚫🦁\n\nOlá ${guardian.name}! Segue o link de acesso exclusivo ao Portal do Atleta ${student.name}: https://acadgoli.vercel.app/portal/${student.portal_token}\n\nLá você acompanha presença, convocações em 3D e mensalidades. Pelo Sport Tudo!`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-1.5 bg-gradient-to-r from-[#D61F27] to-[#8B0D12] hover:from-[#E5232B] hover:to-[#A31016] text-white rounded text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm border border-amber-400/40 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-[#FFE300]" /> Enviar Acesso no WhatsApp
              </a>
            )}
          </div>
        )}
      </div>

      {/* Hero / Carteirinha do Atleta - Sport Club do Recife Blend */}
      <div className="relative overflow-hidden rounded-[12px] bg-gradient-to-r from-[#0A0A0C] via-[#220406] to-[#0A0A0C] border-2 border-amber-400/40 p-6 text-white shadow-xl">
        {/* Marca d'água sutil do Escudo do Sport */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-48 h-48 opacity-10 pointer-events-none">
          <Image
            src="/sport-recife.svg"
            alt="Sport Club do Recife"
            fill
            className="object-contain"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            {/* Foto do Atleta com Borda Dourada e 3 Estrelas */}
            <div className="relative">
              <div className="w-24 h-24 rounded-[10px] bg-[#0A0A0C] text-amber-300 border-2 border-[#FFE300] flex items-center justify-center font-bebas text-4xl shadow-[0_0_15px_rgba(255,227,0,0.3)] shrink-0 overflow-hidden">
                {student.photo_url ? (
                  <img
                    src={student.photo_url}
                    alt={student.name}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  student.name.charAt(0)
                )}
              </div>
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#0A0A0C] px-1.5 py-0.5 rounded-full border border-amber-400/60 flex items-center gap-0.5 shadow-xs">
                <span className="text-[8px] text-[#FFE300]">★</span>
                <span className="text-[9px] text-[#FFE300]">★</span>
                <span className="text-[8px] text-[#D3D5D6]">★</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-bebas text-3xl sm:text-4xl tracking-wider leading-none text-white drop-shadow-md">
                  {student.name}
                </h1>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                  student.status === 'active'
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                    : student.status === 'paused'
                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-700'
                }`}>
                  {student.status === 'active' ? '● Ativo' : student.status === 'paused' ? 'Trancado' : 'Inativo'}
                </span>
                <div className="ml-1">
                  <StudentStatusToggle studentId={student.id} currentStatus={student.status} compact={true} />
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-slate-300 flex-wrap font-medium">
                <span className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-white font-bold">
                  {age} anos ({student.birth_date?.split('-').reverse().join('/')})
                </span>
                <span>•</span>
                <span className="px-2 py-0.5 rounded bg-[#D61F27]/30 border border-[#D61F27]/50 text-amber-300 font-bold">
                  {student.preferred_position || 'Atleta'}
                </span>
                <span>•</span>
                <span>Pé: {student.dominant_foot || 'Destro'}</span>
                <span>•</span>
                <span className="font-mono bg-black/50 px-2 py-0.5 rounded border border-amber-400/30 text-amber-300">
                  Uniforme: Tam {student.uniform_size || '10'}
                </span>
              </div>
            </div>
          </div>

          {/* Turma Atual no Sport */}
          {enrollment?.class && (
            <div className="p-3.5 bg-black/50 rounded-[8px] border border-amber-400/30 text-xs space-y-1 self-stretch sm:self-auto sm:min-w-[220px] backdrop-blur-md">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 block flex items-center gap-1">
                <Shield className="w-3 h-3 text-[#D61F27]" /> Turma Vinculada
              </span>
              <span className="font-bold text-white block text-sm">{enrollment.class.name}</span>
              <span className="text-slate-300 text-[11px] block">📍 {enrollment.class.unit?.name}</span>
              <span className="text-amber-300/80 text-[10px] font-mono block">
                Prof: {enrollment.class.coach?.name || 'Professor'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Foto Oficial do Atleta para Card FIFA FUT 3D */}
      <div className="card-light p-5 border-l-4 border-l-[#D61F27]">
        <StudentPhotoUpload
          studentId={student.id}
          initialPhotoUrl={student.photo_url}
          studentName={student.name}
          preferredPosition={student.preferred_position}
        />
      </div>

      {/* Grid de Informações: Responsável + Ficha Médica + Mensalidades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. DADOS DOS RESPONSÁVEIS */}
        <StudentGuardiansList studentId={student.id} guardians={student.guardian} />

        {/* 2. FICHA MÉDICA & SAÚDE */}
        <div className="card-light p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <HeartPulse className="w-4 h-4 text-[#D61F27]" />
            <h3 className="font-bebas text-xl text-slate-900 tracking-wider leading-none">
              Ficha Médica & Emergência
            </h3>
          </div>

          {medical ? (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Tipo Sanguíneo</span>
                <span className="font-bold text-[#D61F27] font-mono">{medical.blood_type || 'Não informado'}</span>
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
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
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
              <DollarSign className="w-4 h-4 text-[#D61F27]" />
              <h3 className="font-bebas text-xl text-slate-900 tracking-wider leading-none">
                Mensalidades & Pagamentos
              </h3>
            </div>
            {enrollment && (
              <span className="text-xs font-mono text-slate-700 font-bold">
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
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {isPaid ? 'Pago' : 'Pendente'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!isPaid && guardian?.phone && (
                            <a
                              href={`https://wa.me/55${guardian.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                `🔴⚫ *ACADEMIA DO GOL • SPORT RECIFE*\n\nOlá ${guardian.name}, tudo bem? Segue a mensalidade do atleta ${student.name} referente a ${inv.reference_month} no valor de ${fmt(inv.amount)}.\n\nPara facilitar o pagamento, você pode acessar direto pelo Portal: https://acadgoli.vercel.app/portal/${student.portal_token}\n\nObrigado!`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1 bg-gradient-to-r from-[#D61F27] to-[#8B0D12] hover:from-[#E5232B] hover:to-[#A31016] text-white rounded font-bold text-[11px] uppercase tracking-wider inline-flex items-center gap-1 shadow-2xs border border-amber-400/30 transition-all cursor-pointer"
                            >
                              <Send className="w-3 h-3 text-[#FFE300]" /> Cobrar no WhatsApp
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
