'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import { ChevronDown, Download, Filter, Loader2, RefreshCw, ShieldCheck } from 'lucide-react'
import { roleLabels, type StaffRole } from '@/lib/auth/permissions'
import { formatDate, formatMoney, formatMonth, SCHOOL_TIME_ZONE } from '@/lib/format'
import { paymentMethodLabels } from '@/lib/finance/payment-parts'
import type { FinancialAuditEntry, FinancialAuditFilters, FinancialAuditPage } from '@/lib/finance/audit'
import { getFinancialAuditAction } from './actions'
import {CashDayAudit} from './cash-day-closure-panel'

const actionLabels = { created: 'Cobrança criada', payment: 'Baixa de pagamento', reversal: 'Estorno' }
const dateTime = (value: string) => new Date(value).toLocaleString('pt-BR', { timeZone: SCHOOL_TIME_ZONE, dateStyle: 'short', timeStyle: 'short' })
function monthFilters(month: string): FinancialAuditFilters {
  const [year, number] = month.split('-').map(Number)
  return { start: `${month}-01`, end: new Date(Date.UTC(year, number, 0)).toISOString().slice(0, 10), action: 'all', student: '', actor: '' }
}

function AuditDetails({ entry }: { entry: FinancialAuditEntry }) {
  return <div className="rounded-xl bg-[var(--bg-subtle)] p-4 space-y-3 text-sm text-left">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <p><span className="text-[var(--text-muted)]">Valor {entry.event_type === 'created' && entry.details_source === 'current_invoice' ? 'atual da cobrança' : 'acordado'}:</span> <strong>{formatMoney(entry.agreed_amount)}</strong></p>
      <p><span className="text-[var(--text-muted)]">Registrado no sistema:</span> {dateTime(entry.recorded_at)}</p>
      {entry.paid_at && <p><span className="text-[var(--text-muted)]">Pagamento informado:</span> {dateTime(entry.paid_at)}</p>}
      {entry.discount_amount > 0 && <p><span className="text-[var(--text-muted)]">Desconto concedido:</span> <strong>{formatMoney(entry.discount_amount)}</strong></p>}
      {entry.event_type === 'created' && <p><span className="text-[var(--text-muted)]">Vencimento {entry.details_source === 'current_invoice' ? 'atual' : 'na criação'}:</span> {formatDate(entry.due_date, { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>}
    </div>
    {entry.payment_parts.length > 0 && <div><p className="text-xs font-semibold text-[var(--text-muted)] mb-1">{entry.event_type === 'reversal' ? 'Formas do recebimento estornado' : 'Formas de pagamento'}</p>{entry.payment_parts.map((part, index) => <p key={`${part.method}-${index}`}>{paymentMethodLabels[part.method] || part.method}: {formatMoney(part.amount)}</p>)}</div>}
    {(entry.reason || entry.discount_amount > 0) && <p className="whitespace-pre-wrap break-words"><strong>{entry.event_type === 'reversal' ? 'Motivo do estorno' : 'Justificativa do desconto'}:</strong> {entry.reason || 'Não informada (opcional).'}</p>}
    {entry.notes && <p className="whitespace-pre-wrap break-words"><strong>Observação:</strong> {entry.notes}</p>}
    {entry.actor.source === 'snapshot' && <p className="text-xs text-[var(--text-muted)]">Nome, usuário e cargo preservados no momento da operação.</p>}
    {entry.actor.source === 'current_profile' && <p className="text-xs text-[var(--text-muted)]">Identificação atual da conta. O registro antigo não preservou nome e cargo da época.</p>}
    {entry.actor.source === 'unverified' && <p className="text-xs text-[var(--text-muted)]">A autoria original deste registro não foi comprovada.</p>}
    {entry.legacy && <p className="text-xs text-[var(--text-muted)]">Recebimento importado do sistema anterior. A data de registro corresponde à importação.</p>}
    {entry.event_type === 'created' && entry.details_source === 'current_invoice' && <p className="text-xs text-[var(--text-muted)]">Os valores originais da criação não foram preservados; os detalhes mostram a cobrança atual.</p>}
    {entry.event_type === 'payment' && entry.reversed && <p className="text-amber-700 font-medium">Este recebimento foi estornado. Seu registro e comprovante foram preservados.</p>}
    {entry.proof_name && entry.payment_id && <a className="button text-xs" href={`/api/financeiro/comprovantes/${entry.payment_id}`} target="_blank" rel="noreferrer"><Download size={15} />{entry.proof_name}</a>}
    {entry.payment_id && <p className="text-xs text-[var(--text-muted)]">Recebimento #{entry.payment_id.slice(0, 8)}</p>}
  </div>
}

export function AuditTab({ initialMonth }: { initialMonth: string }) {
  const [initial] = useState(() => monthFilters(initialMonth))
  const [draft, setDraft] = useState<FinancialAuditFilters>(initial)
  const [applied, setApplied] = useState<FinancialAuditFilters>(initial)
  const [audit, setAudit] = useState<FinancialAuditPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const request = useRef(0)

  useEffect(() => {
    const sequence = request
    const ticket = ++sequence.current
    getFinancialAuditAction(initial).then(result => {
      if (ticket !== sequence.current) return
      setAudit(result.audit)
      setError(result.error)
    }).catch(() => { if (ticket === sequence.current) setError('Não foi possível carregar a auditoria. Tente novamente.') })
      .finally(() => { if (ticket === sequence.current) setLoading(false) })
    return () => { sequence.current++ }
  }, [initial])

  async function load(filters: FinancialAuditFilters, offset = 0, append = false) {
    const ticket = ++request.current
    setLoading(true)
    setError('')
    if (!append) { setAudit(null); setExpanded(null) }
    try {
      const result = await getFinancialAuditAction(filters, offset)
      if (ticket !== request.current) return
      if (result.error || !result.audit) { setError(result.error || 'Não foi possível carregar a auditoria.'); return }
      const page = result.audit
      setAudit(previous => append && previous ? { ...page, entries: [...previous.entries, ...page.entries.filter(entry => !previous.entries.some(saved => saved.id === entry.id))] } : page)
    } catch { if (ticket === request.current) setError('Não foi possível carregar a auditoria. Confira a conexão e tente novamente.') }
    finally { if (ticket === request.current) setLoading(false) }
  }

  return <section className="space-y-5" aria-label="Auditoria financeira">
    <CashDayAudit/>
    <div className="surface p-5 flex flex-wrap justify-between items-start gap-4">
      <div><h2 className="section-title flex items-center gap-2"><ShieldCheck size={21} className="text-[#c81930]" />Auditoria financeira</h2><p className="text-sm text-[var(--text-secondary)] mt-2">Consulte quem registrou cada cobrança, baixa e estorno. Horários de Recife.</p></div>
      <button type="button" className="button" disabled={loading} onClick={() => void load(applied)}><RefreshCw size={16} />Atualizar registros</button>
    </div>
    <form className="surface p-5" onSubmit={event => { event.preventDefault(); setApplied(draft); void load(draft) }}>
      <fieldset disabled={loading} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <div><label htmlFor="audit-start" className="field-label">Registro a partir de</label><input id="audit-start" type="date" value={draft.start} max={draft.end || undefined} onChange={event => setDraft({ ...draft, start: event.target.value })} className="field" /></div>
          <div><label htmlFor="audit-end" className="field-label">Registro até</label><input id="audit-end" type="date" value={draft.end} min={draft.start || undefined} onChange={event => setDraft({ ...draft, end: event.target.value })} className="field" /></div>
          <div><label htmlFor="audit-action" className="field-label">Operação</label><select id="audit-action" value={draft.action} onChange={event => setDraft({ ...draft, action: event.target.value as FinancialAuditFilters['action'] })} className="field"><option value="all">Todas as operações</option><option value="created">Cobranças criadas</option><option value="payment">Baixas de pagamento</option><option value="discount">Baixas com desconto</option><option value="reversal">Estornos</option></select></div>
          <div><label htmlFor="audit-student" className="field-label">Atleta</label><input id="audit-student" value={draft.student} maxLength={120} placeholder="Nome do atleta" onChange={event => setDraft({ ...draft, student: event.target.value })} className="field" /></div>
          <div><label htmlFor="audit-actor" className="field-label">Responsável pelo registro</label><input id="audit-actor" value={draft.actor} maxLength={120} placeholder="Nome ou usuário" onChange={event => setDraft({ ...draft, actor: event.target.value })} className="field" /></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[var(--text-muted)]">O período usa a data de registro no sistema. Limpe os filtros para consultar todo o histórico.</p><div className="flex flex-wrap gap-2"><button type="button" className="button" onClick={() => { const all: FinancialAuditFilters = { start: '', end: '', action: 'all', student: '', actor: '' }; setDraft(all); setApplied(all); void load(all) }}>Limpar filtros</button><button type="submit" className="button button-primary"><Filter size={15} />Aplicar filtros</button></div></div>
      </fieldset>
    </form>
    {error && <div className="notice notice-error" role="alert"><p>{error}</p>{!audit && <button type="button" className="button mt-2" onClick={() => void load(applied)}>Tentar novamente</button>}</div>}
    {loading && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 size={18} className="animate-spin" />Carregando registros…</p>}
    {audit && <div className="surface overflow-hidden">
      <div className="p-4 border-b border-[var(--border-color)]"><p className="font-semibold text-sm" role="status">{audit.total} {audit.total === 1 ? 'registro encontrado' : 'registros encontrados'}</p><p className="text-xs text-[var(--text-muted)] mt-1">Mais recentes primeiro · {applied.start ? formatDate(applied.start) : 'Desde o início'} até {applied.end ? formatDate(applied.end) : 'o registro mais recente'}</p></div>
      {!audit.entries.length ? <div className="empty-state"><ShieldCheck size={32} /><strong>Nenhum registro para estes filtros</strong><p>Ajuste o período, o responsável ou a operação para consultar outros registros.</p></div> : <div className="table-responsive"><table className="data-table mobile-data-table"><thead><tr><th>Data do registro</th><th>Responsável</th><th>Operação</th><th>Atleta / cobrança</th><th>Valor</th><th>Detalhes</th></tr></thead><tbody>{audit.entries.map(entry => <Fragment key={entry.id}>
        <tr>
          <td data-label="Data do registro" className="text-xs">{dateTime(entry.recorded_at)}</td>
          <td data-label="Responsável"><p className="font-semibold text-sm">{entry.actor.source === 'system' ? 'Sistema' : entry.actor.name || 'Autor não verificado'}</p>{entry.actor.username && <p className="text-xs text-[var(--text-muted)]">@{entry.actor.username}</p>}{entry.actor.role && <p className="text-xs text-[var(--text-muted)]">{roleLabels[entry.actor.role as StaffRole] || entry.actor.role}</p>}</td>
          <td data-label="Operação"><span className={`badge ${entry.event_type === 'reversal' ? 'badge-danger' : entry.event_type === 'payment' ? 'badge-success' : ''}`}>{entry.legacy ? 'Recebimento importado' : actionLabels[entry.event_type]}</span>{entry.discount_amount > 0 && <p className="text-xs mt-1">Com desconto</p>}{entry.event_type === 'payment' && entry.reversed && <p className="text-xs text-amber-700 mt-1">Posteriormente estornado</p>}</td>
          <td data-label="Atleta / cobrança"><p className="font-medium">{entry.student_name || 'Atleta'}</p><p className="text-xs text-[var(--text-muted)]">{entry.charge_type === 'registration' ? 'Matrícula' : 'Mensalidade'} · {formatMonth(entry.reference_month)}</p></td>
          <td data-label="Valor" className="font-semibold whitespace-nowrap">{entry.event_type === 'reversal' ? '− ' : ''}{formatMoney(entry.event_type === 'created' ? entry.agreed_amount : entry.received_amount ?? 0)}{entry.discount_amount > 0 && <p className="text-xs text-[var(--text-muted)] font-normal mt-1">Desconto: {formatMoney(entry.discount_amount)}</p>}</td>
          <td data-label="Detalhes"><button type="button" className="button text-xs" aria-expanded={expanded === entry.id} onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}>Detalhes<ChevronDown size={15} className={expanded === entry.id ? 'rotate-180' : ''} /></button></td>
        </tr>
        {expanded === entry.id && <tr><td colSpan={6} data-label="Registro completo"><AuditDetails entry={entry} /></td></tr>}
      </Fragment>)}</tbody></table></div>}
      {audit.nextOffset !== null && <div className="p-4 border-t border-[var(--border-color)]"><button type="button" className="button w-full" disabled={loading} onClick={() => void load(applied, audit.nextOffset!, true)}>Carregar mais registros</button></div>}
      <p className="p-4 text-xs text-[var(--text-muted)]">Exibindo {audit.entries.length} de {audit.total} registros. Recebimentos e estornos são eventos separados; os valores desta lista não devem ser somados como saldo de caixa.</p>
    </div>}
  </section>
}
