import { appUrl } from '@/lib/app-url'
import { FamilyAccessControls } from '../family-access-controls'
import { requirePage } from '@/lib/auth/session'
import { calculateAge } from '@/lib/format'
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
import { getStudentById, getFormDataForEnrollment } from '../actions'
import {ImportedEnrollment} from '../imported-enrollment'
import { StudentStatusToggle } from '../student-status-toggle'
import { StudentGuardiansList } from './student-guardians-list'
import { StudentPhotoUpload } from '../student-photo-upload'

interface Props {
  params: Promise<{ id: string }>
}

function fmt(val: number) {
  return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default async function AlunoProfilePage({ params }: Props) {
  await requirePage('students.read');
  const { id } = await params
  const student = await getStudentById(id)

  if (!student) {
    notFound()
  }

  const age = calculateAge(student.birth_date)
  const enrollment = Array.isArray(student.enrollment) ? student.enrollment[0] : student.enrollment
  const guardian = Array.isArray(student.guardian) ? student.guardian[0] : student.guardian
  const medical = Array.isArray(student.medical_record) ? student.medical_record[0] : student.medical_record
  const importOptions=enrollment?.import_source?await getFormDataForEnrollment():null

  return (
    <div className="page-container space-y-6">
      {/* Header com Voltar e Links do Portal */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <Link
          href="/alunos"
          className="button px-3.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all inline-flex items-center gap-1.5 text-xs font-bold tracking-normal shadow-2xs self-start"
        >
          <ChevronLeft className="w-4 h-4 text-[#c81930]" /> Voltar para a lista
        </Link>

        {student.portal_token && (
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/portal/${student.portal_token}`}
              target="_blank"
              className="button px-3.5 py-1.5 bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[#c81930] border border-[#c81930]/30 rounded text-xs font-bold tracking-normal inline-flex items-center gap-1.5 shadow-2xs transition-all hover:border-[#c81930]"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-500" /> Ver Portal do Responsável
            </Link>
            {guardian?.phone && (
              <a
                href={`https://wa.me/55${guardian.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                  `🏆 *ESCOLINHA DE FUTEBOL • SPORT CLUB DO RECIFE* 🔴⚫🦁\n\nOlá ${guardian.name}! Segue o link de acesso exclusivo ao Portal do Atleta ${student.name}: ${appUrl()}/portal/${student.portal_token}\n\nLá você acompanha presença, convocações em 3D e mensalidades. Pelo Sport Tudo!`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="button px-4 py-1.5 bg-gradient-to-r from-[#c81930] to-[#a71327] hover:from-[#c81930] hover:to-[#a71327] text-white rounded text-xs font-bold tracking-normal inline-flex items-center gap-1.5 shadow-sm border border-amber-400/40 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-[#FFE300]" /> Enviar Acesso no WhatsApp
              </a>
            )}
          </div>
        )}
      </div>

      {/* Hero / Carteirinha do Atleta - Sport Club do Recife Blend */}
      <section className="record-hero" aria-labelledby="athlete-name">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div className="record-avatar">{student.photo_url ? <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover" /> : student.name.charAt(0)}</div>
          <div className="min-w-0 flex-1">
            <p className="eyebrow mb-2">Ficha do atleta</p>
            <h1 id="athlete-name" className="page-title">{student.name}</h1>
            <div className="record-facts"><span>{age} anos · {student.birth_date?.split('-').reverse().join('/')}</span><span>{student.preferred_position || 'Posição a definir'}</span><span>{student.dominant_foot || 'Pé dominante não informado'}</span></div>
            {enrollment?.class && <div className="mt-4 rounded-lg bg-[var(--bg-subtle)] p-3 text-sm"><strong>{enrollment.class.name}</strong><p className="mt-1 text-[var(--text-secondary)]">{enrollment.class.unit?.name} · {enrollment.class.coach?.name || 'Treinador a definir'}</p></div>}
          </div>
          <div className="flex flex-wrap sm:flex-col gap-3 items-start"><span className={`badge ${student.status === 'active' ? 'badge-success' : 'badge-warning'}`}>{student.status === 'active' ? 'Ativo' : student.status === 'paused' ? 'Trancado' : 'Inativo'}</span><StudentStatusToggle studentId={student.id} currentStatus={student.status} compact /></div>
        </div>
      </section>

      <FamilyAccessControls studentId={student.id} enabled={student.portal_access_enabled} expiresAt={student.portal_token_expires_at}/>
      {enrollment?.import_source&&importOptions&&<ImportedEnrollment studentId={student.id} enrollment={enrollment} classes={importOptions.classes} plans={importOptions.plans}/>}
      {/* Foto Oficial do Atleta para Card FIFA FUT 3D */}
      <div className="card-light p-5">
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
          <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
            <HeartPulse className="w-4 h-4 text-[#c81930]" />
            <h3 className="section-title text-xl text-[var(--text-primary)] tracking-tight leading-tight">
              Ficha Médica & Emergência
            </h3>
          </div>

          {medical ? (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-[var(--border-color)] pb-2">
                <span className="text-[var(--text-muted)] font-medium">Tipo Sanguíneo</span>
                <span className="font-bold text-[#c81930] font-mono">{medical.blood_type || 'Não informado'}</span>
              </div>
              <div className="flex justify-between border-b border-[var(--border-color)] pb-2">
                <span className="text-[var(--text-muted)] font-medium">Plano de Saúde</span>
                <span className="font-bold text-[var(--text-primary)]">{medical.health_insurance || 'Nenhum'}</span>
              </div>
              <div className="flex justify-between border-b border-[var(--border-color)] pb-2">
                <span className="text-[var(--text-muted)] font-medium">Alergias / Restrições</span>
                <span className="font-medium text-amber-700">{medical.allergies || 'Nenhuma'}</span>
              </div>
              <div className="flex justify-between border-b border-[var(--border-color)] pb-2">
                <span className="text-[var(--text-muted)] font-medium">Emergência Adicional</span>
                <span className="text-[var(--text-secondary)]">
                  {medical.emergency_contact_name ? `${medical.emergency_contact_name} (${medical.emergency_contact_phone})` : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center"><span className="text-[var(--text-muted)] font-medium">Atestado médico</span><strong>{medical.has_medical_clearance?'Conferido':'Pendente de conferência'}</strong></div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)] font-medium">Uso de Imagem (LGPD)</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                  {medical.image_use_authorized ? '✓ Autorizado' : 'Não'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted)] py-4">Ficha médica não preenchida.</p>
          )}
        </div>

        {/* 3. HISTÓRICO DE MENSALIDADES */}
        <div className="card-light p-5 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#c81930]" />
              <h3 className="section-title text-xl text-[var(--text-primary)] tracking-tight leading-tight">
                Mensalidades & Pagamentos
              </h3>
            </div>
            {enrollment && (
              <span className="text-xs font-mono text-[var(--text-secondary)] font-bold">
                Plano: {enrollment.plan?.name || 'Mensal'} • {fmt(enrollment.monthly_fee)}/mês
              </span>
            )}
          </div>

          {(student.invoices || []).length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-6 text-center">Nenhuma fatura gerada para este atleta.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table mobile-data-table">
                <thead className="bg-[var(--bg-card-hover)] border-b border-[var(--border-color)] text-[var(--text-secondary)]  font-bold">
                  <tr>
                    <th className="px-4 py-2.5">Mês Ref.</th>
                    <th className="px-4 py-2.5">Vencimento</th>
                    <th className="px-4 py-2.5">Valor</th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                    <th className="px-4 py-2.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {(student.invoices || []).map((inv: any) => {
                    const isPaid = inv.status === 'paid'
                    return (
                      <tr key={inv.id} className="hover:bg-[var(--bg-card-hover)]/80">
                        <td data-label="Mês Ref." className="px-4 py-3 font-mono font-bold text-[var(--text-primary)]">{inv.reference_month}<p className="text-xs font-normal mt-1">{inv.charge_type==='registration'?'Matrícula':'Mensalidade'}</p></td>
                        <td data-label="Vencimento" className="px-4 py-3 font-mono text-[var(--text-secondary)]">
                          {inv.due_date?.split('-').reverse().join('/')}
                        </td>
                        <td data-label="Valor" className="px-4 py-3 font-mono font-bold text-[var(--text-primary)]">{fmt(inv.amount)}{isPaid&&!inv.settled_before_import&&<p className="text-xs font-normal mt-1">Recebido: {fmt(inv.paid_amount??inv.amount)}{Number(inv.paid_amount??inv.amount)<Number(inv.amount)?' · com desconto':''}</p>}{inv.settled_before_import&&<p className="text-xs font-normal mt-1">Sem nova entrada no caixa</p>}</td>
                        <td data-label="Status" className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold tracking-normal border ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {isPaid ? (inv.settled_before_import?'Quitado na importação':'Pago') : inv.status==='unconfirmed'?'A confirmar':'Pendente'}
                          </span>
                        </td>
                        <td data-label="Ação" className="px-4 py-3 text-right">
                          {!isPaid && inv.status!=='unconfirmed' && guardian?.phone && (
                            <a
                              href={`https://wa.me/55${guardian.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                `🔴⚫ *ESCOLINHA DE FUTEBOL • SPORT RECIFE*\n\nOlá ${guardian.name}, tudo bem? Segue a mensalidade do atleta ${student.name} referente a ${inv.reference_month} no valor de ${fmt(inv.amount)}.\n\nPara facilitar o pagamento, você pode acessar direto pelo Portal: ${appUrl()}/portal/${student.portal_token}\n\nObrigado!`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="button px-3 py-1 bg-gradient-to-r from-[#c81930] to-[#a71327] hover:from-[#c81930] hover:to-[#a71327] text-white rounded font-bold text-xs tracking-normal inline-flex items-center gap-1 shadow-2xs border border-amber-400/30 transition-all cursor-pointer"
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
