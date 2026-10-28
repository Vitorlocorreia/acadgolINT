'use client'

import { ModalFrame } from '@/components/modal-frame'
import {InvoiceProofsButton} from './invoice-proofs-button'
import {AuditTab} from './audit-tab'
import {ManualPaymentDialog} from './manual-payment-dialog'
import {AdvancePaymentDialog} from './advance-payment-dialog'
import {paymentPartsLabel} from '@/lib/finance/payment-parts'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { financeHref, defaultFinanceFilters, normalizeFinanceFilters, type FinanceFilters } from '@/lib/finance/filters'
import { FinanceFilterPanel } from './finance-filters'
import {
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Send,
  RefreshCw,
  Loader2,
  Check,
  Calendar,
  Zap,
  Smartphone,
  Receipt,
  Printer,
  Clock,
  CreditCard,
  Wallet,
  Banknote,
  FileText,
  TrendingUp,
  UserCheck,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  ArrowUpRight,
  Paperclip,
  X,
} from 'lucide-react'
import {
  revertInvoicePaymentAction,
  generateMonthlyInvoicesAction,
} from './actions'
import { calculateOverdueCharges, getPaymentOriginDetails, getBrDateStr } from './calc'

interface Props {
  operatorName:string
  canReverse:boolean
  invoices: any[]
  stats: {
    total: number
    collected: number
    pending: number
    overdue: number
    openingPaid: number
    openingPaidCount: number
    unconfirmed: number
    unconfirmedCount: number
  }
  currentMonth: string
  currentStatus: string
  pagination:{page:number;pageSize:number;total:number;pages:number}
  filterCounts:Record<'all'|'pending'|'paid'|'unconfirmed'|'overdue',number>
  monthCounts:Record<'all'|'pending'|'paid'|'unconfirmed'|'overdue',number>
  filters:FinanceFilters
  classOptions:{id:string;name:string}[]
  targetDate: string
  todayStr: string
  overdueInvoices: any[]
  dailyCash: {
    date: string
    total: number
    dinheiro: number
    pix: number
    debito: number
    credito: number
    count: number
    items: any[]
  }
  weeklyCash: {
    days: { date: string; label: string; total: number; dinheiro: number; pix: number; cartao: number }[]
    totalWeek: number
  }
  monthlyCash: {
    month: string
    totalExpected: number
    totalCollected: number
    totalPending: number
    totalOverdue: number
    collectionRate: number
    dinheiro: number
    pix: number
    cartao: number
  }
  initialTab?: string
}

type FinanceTab = 'mensalidades' | 'inadimplentes' | 'caixa_diario' | 'relatorios' | 'auditoria'

function fmt(val: number) {
  return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function FinanceiroClient({
  operatorName,canReverse,
  invoices,
  stats,
  currentMonth,
  currentStatus,
  pagination,filterCounts,monthCounts,filters,classOptions,
  targetDate,
  todayStr,
  overdueInvoices,
  dailyCash,
  weeklyCash,
  monthlyCash,
  initialTab = 'mensalidades',
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isNavigating,navigate]=useTransition()
  const goTo=(url:string)=>navigate(()=>router.push(url))
  const [activeTab, setActiveTab] = useState<FinanceTab>(
    ['mensalidades','inadimplentes','caixa_diario','relatorios','auditoria'].includes(initialTab) ? initialTab as FinanceTab : 'mensalidades'
  )
  const handleTabChange = (tab: FinanceTab) => {
    setActiveTab(tab)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tab)
    window.history.replaceState(null, '', url)
  }
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Modais
  const [showReguaModal, setShowReguaModal] = useState(false)
  const [modalInvoice, setModalInvoice] = useState<any | null>(null)
  const [showAdvancePayment,setShowAdvancePayment]=useState(false)
  const [revertInvoiceId, setRevertInvoiceId] = useState<string | null>(null)
  const [revertReason, setRevertReason] = useState('')

  const currentContext = { month: currentMonth, status: currentStatus, date: targetDate, tab: activeTab }
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    goTo(financeHref({...currentContext,date:e.target.value},filters))
  }
  const handleStatusFilter = (status: string) => {
    goTo(financeHref({...currentContext,status},filters))
  }
  const handleFiltersApply = (month:string, next:FinanceFilters) => {
    goTo(financeHref({...currentContext,month},normalizeFinanceFilters(next)))
  }

  const handleOpenPaymentModal=(invoice:any)=>{setFeedback(null);setModalInvoice({...invoice,idempotencyKey:crypto.randomUUID()})}

  // Estornar pagamento
  const handleConfirmRevert = () => {
    if (!revertInvoiceId) return
    setFeedback(null)
    startTransition(async () => {
      const res = await revertInvoicePaymentAction(revertInvoiceId, revertReason)
      if (res.success) {
        setFeedback({ type: 'success', message: 'Pagamento estornado com sucesso. A fatura voltou para pendente.' })
        setRevertInvoiceId(null)
        setRevertReason('')
        router.refresh()
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erro ao estornar pagamento.' })
      }
    })
  }

  // Gerar mensalidades do mês
  const handleGenerateInvoices = () => {
    setFeedback(null)
    startTransition(async () => {
      const res = await generateMonthlyInvoicesAction(currentMonth)
      if (res.success) {
        setFeedback({
          type: 'success',
          message: res.count ? `${res.count} mensalidade(s) faltante(s) gerada(s) para ${currentMonth}.` : 'Tudo em dia: nenhuma mensalidade faltante para gerar neste mês.',
        })
        router.refresh()
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erro ao gerar mensalidades.' })
      }
    })
  }

  // Impressão da folha de caixa
  const handlePrintDailyClosing = () => {
    window.print()
  }

  const collectionPct = stats.total > 0 ? (stats.collected / stats.total) * 100 : 0
  const pendingInvoices = invoices.filter((i) => i.status === 'pending' || i.status === 'overdue')

  // Total de atraso acumulado em aberto
  const totalOverdueDebt = overdueInvoices.reduce((acc, curr) => acc + Number(curr.amount), 0)

  return (
    <div className="space-y-6" aria-busy={isNavigating}>
      {isNavigating&&<p role="status" className="notice text-sm flex items-center gap-2"><Loader2 size={16} className="animate-spin"/>Atualizando mensalidades…</p>}
      {/* NAVEGAÇÃO POR ABAS SUPERIORES */}
      <div className="section-tabs">
        <button aria-pressed={activeTab === 'mensalidades'}
          onClick={() => handleTabChange('mensalidades')}
          className={`button ${activeTab === 'mensalidades' ? 'button-primary' : 'button-quiet'}`}
        >
          <Receipt className="w-4 h-4" />
          <span>Mensalidades ({monthCounts.all})</span>
        </button>

        <button aria-pressed={activeTab === 'inadimplentes'}
          onClick={() => handleTabChange('inadimplentes')}
          className={`button ${activeTab === 'inadimplentes' ? 'button-primary' : 'button-quiet'}`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          <span>Em atraso</span>
          {overdueInvoices.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-red-600 text-white font-bold">
              {overdueInvoices.length}
            </span>
          )}
        </button>

        <button aria-pressed={activeTab === 'caixa_diario'}
          onClick={() => handleTabChange('caixa_diario')}
          className={`button ${activeTab === 'caixa_diario' ? 'button-primary' : 'button-quiet'}`}
        >
          <Wallet className="w-4 h-4" />
          <span>Caixa diário</span>
        </button>

        <button aria-pressed={activeTab === 'relatorios'}
          onClick={() => handleTabChange('relatorios')}
          className={`button ${activeTab === 'relatorios' ? 'button-primary' : 'button-quiet'}`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Relatórios</span>
        </button>
        <button aria-pressed={activeTab === 'auditoria'} onClick={() => handleTabChange('auditoria')} className={`button ${activeTab === 'auditoria' ? 'button-primary' : 'button-quiet'}`}><ShieldCheck className="w-4 h-4" /><span>Auditoria</span></button>
      </div>

      {activeTab === 'auditoria' && <AuditTab initialMonth={currentMonth} />}

      {/* FEEDBACK MENSAGEM */}
      {feedback && (
        <div
          role="status" aria-live="polite" className={`p-4 rounded-lg text-sm flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-[var(--success-bg)] border-[var(--success)]/20 text-[var(--success)]'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-[#c81930] shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button aria-label="Fechar janela" onClick={() => setFeedback(null)} className="button text-xs font-mono font-bold hover:opacity-75 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 1: MENSALIDADES DO MÊS */}
      {/* ======================================================== */}
      {activeTab === 'mensalidades' && (
        <div className="space-y-6">
          {/* Barra de Filtro de Mês e Ações */}
          <div className="card-light p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div><h2 className="section-title">Mensalidades e matrículas</h2><p className="text-xs text-[var(--text-muted)] mt-1">Consulte os lançamentos e registre os recebimentos.</p></div>

            <div className="flex items-center gap-2 flex-wrap">
              {pendingInvoices.length > 0 && (
                <button
                  onClick={() => setShowReguaModal(true)}
                  disabled={isNavigating}
                  className="button px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#a71327] border border-[#c81930]/30 rounded-lg text-xs font-bold  tracking-normal flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <Smartphone className="w-4 h-4 text-[#c81930]" />
                  Régua WhatsApp ({pendingInvoices.length})
                </button>
              )}

              <button type="button" className="button button-primary" disabled={isPending||isNavigating} onClick={()=>{setFeedback(null);setShowAdvancePayment(true)}}>
                <Calendar size={16}/>Antecipar mensalidade
              </button>
              <button
                onClick={handleGenerateInvoices}
                disabled={isPending || isNavigating}
                className="button px-4 py-2 rounded-lg text-xs font-bold tracking-normal flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {currentMonth>todayStr.slice(0,7) ? 'Emitir mês completo' : 'Gerar faltantes'}
              </button>
            </div>
          </div>

          <p className="text-xs font-semibold text-[var(--text-secondary)]">Resumo geral de {currentMonth.split('-').reverse().join('/')} · valores de todo o mês, independentemente da pesquisa</p>
          {/* Cards KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card-light p-4 space-y-2">
              <span className="text-xs text-[var(--text-muted)] font-bold tracking-normal">Total Previsto</span>
              <div className="stat-number  text-[var(--text-primary)] tracking-tight leading-tight">{fmt(stats.total)}</div>
              <p className="text-xs text-[var(--text-muted)]">{monthCounts.all} faturas emitidas</p>
            </div>

            <div className="card-light p-4 space-y-2 border-[var(--success)]/20 bg-[var(--success-bg)]">
              <span className="text-xs text-[#a71327] font-bold tracking-normal">Recebido no sistema</span>
              <div className="stat-number  text-[#c81930] tracking-tight leading-tight">{fmt(stats.collected)}</div>
              <p className="text-xs text-[#a71327] font-bold">{collectionPct.toFixed(1)}% arrecadado</p>
            </div>

            <div className="card-light p-4 space-y-2">
              <span className="text-xs text-[var(--text-muted)] font-bold tracking-normal">Pendentes de baixa</span>
              <div className="stat-number  text-[var(--text-secondary)] tracking-tight leading-tight">{fmt(stats.pending+stats.overdue+stats.unconfirmed)}</div>
              <p className="text-xs text-[var(--text-muted)]">{monthCounts.pending} mensalidade(s) sem quitação confirmada</p>
            </div>

            <div className="card-light p-4 space-y-2 border-amber-200 bg-amber-50/40">
              <span className="text-xs text-amber-800 font-bold tracking-normal">Em Atraso (Cobrar)</span>
              <div className="stat-number  text-amber-700 tracking-tight leading-tight">{fmt(stats.overdue)}</div>
              <p className="text-xs text-amber-700 font-bold">Inadimplência ativa</p>
            </div>
          </div>

          <FinanceFilterPanel filters={filters} month={currentMonth} status={currentStatus} counts={filterCounts} classes={classOptions} total={pagination.total} pending={isNavigating}
            onApply={handleFiltersApply} onStatus={handleStatusFilter} onClear={()=>goTo(financeHref({...currentContext,status:'all'},defaultFinanceFilters))}/>
          <details className="card-light p-4 text-sm"><summary className="cursor-pointer font-semibold">Emissão automática e conferência da importação</summary><div className="space-y-2 text-xs text-[var(--text-secondary)] mt-3"><p>{currentMonth>todayStr.slice(0,7) ? 'As mensalidades deste mês serão emitidas no início dele. Para receber antes de um atleta, use “Antecipar mensalidade”. “Emitir mês completo” prepara as cobranças de todos os atletas elegíveis, independentemente dos filtros.' : 'As mensalidades são emitidas no início de cada mês. “Gerar faltantes” confere o mês inteiro, independentemente dos filtros, sem duplicar cobranças. Para receber um mês futuro de um atleta, use “Antecipar mensalidade”.'}</p>
            {(stats.openingPaidCount>0||stats.unconfirmedCount>0)&&<><p>{stats.openingPaidCount} mensalidade(s) quitada(s) antes da importação, no total de {fmt(stats.openingPaid)}, sem nova entrada no caixa.</p><p>{stats.unconfirmedCount} pagamento(s) a confirmar ({fmt(stats.unconfirmed)}). Campo vazio na planilha não foi tratado como inadimplência.</p></>}</div></details>

          {/* Tabela de Mensalidades */}
          {invoices.length === 0 ? (
            <div className="card-light py-16 text-center space-y-2">
              <DollarSign className="w-12 h-12 text-[var(--text-muted)] mx-auto" />
              <p className="text-sm font-bold text-[var(--text-secondary)]">Nenhuma cobrança corresponde aos filtros.</p>
              <p className="text-xs text-[var(--text-muted)]">
                {currentMonth>todayStr.slice(0,7)?'Este mês ainda pode não ter sido emitido. Para receber antecipadamente de um atleta, prepare a mensalidade dele abaixo.':'Confira o nome, a turma e o mês selecionados, ou use “Limpar filtros”.'}
              </p>
              {currentMonth>todayStr.slice(0,7)&&<button type="button" className="button button-primary mt-3" disabled={isNavigating} onClick={()=>setShowAdvancePayment(true)}><Calendar size={16}/>Antecipar mensalidade de um atleta</button>}
            </div>
          ) : (
            <div className="card-light overflow-hidden" inert={isNavigating} style={isNavigating?{opacity:0.5}:undefined}>
              <div className="overflow-x-auto">
                <table className="data-table mobile-data-table">
                  <thead className="bg-[var(--bg-card-hover)] border-b border-[var(--border-color)] text-[var(--text-secondary)]  tracking-normal font-bold">
                    <tr>
                      <th className="px-5 py-3.5">Atleta / Aluno</th>
                      <th className="px-5 py-3.5">Responsável</th>
                      <th className="px-5 py-3.5">Vencimento</th>
                      <th className="px-5 py-3.5">Valor</th>
                      <th className="px-5 py-3.5 text-center">Status</th>
                      <th className="px-5 py-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {invoices.map((inv) => {
                      const isPaid = inv.status === 'paid'
                      const isUnconfirmed = inv.status === 'unconfirmed'
                      const isOverdue = !isPaid && !isUnconfirmed && inv.status!=='cancelled' && (inv.due_date < todayStr || inv.status === 'overdue')
                      const guardian = Array.isArray(inv.student?.guardian) ? inv.student.guardian[0] : inv.student?.guardian
                      const guardianPhone = guardian?.phone ? guardian.phone.replace(/\D/g, '') : ''

                      const whatsappMsg = `Olá ${guardian?.name || 'Responsável'}, tudo bem? Aqui é da Escolinha do Sport! Segue o lembrete da mensalidade do atleta *${inv.student?.name}* referente ao mês *${inv.reference_month}* no valor de *${fmt(inv.amount)}* com vencimento em *${inv.due_date?.split('-').reverse().join('/')}*.\n\nPagamento manual:\n solicite os dados oficiais à secretaria e aguarde a conferência do recebimento.\n\n${inv.student?.portal_token ? 'Você também pode acompanhar no Portal: ' + (typeof window!=='undefined'?window.location.origin:'') + '/portal/' + inv.student.portal_token : ''}\n\nObrigado!`

                      return (
                        <tr key={inv.id} className="hover:bg-[var(--bg-card-hover)]/80 transition-colors">
                          <td data-label="Atleta / Aluno" className="px-5 py-3.5">
                            <div className="font-bold text-[var(--text-primary)]">{inv.student?.name || 'Aluno'}</div>
                            <p className="text-xs text-[var(--text-muted)] mt-1">{inv.charge_type==='registration'?'Matrícula':'Mensalidade'} · {inv.class_name || 'Sem turma definida'}</p>
                            {inv.notes && (
                              <div className="text-xs text-[var(--text-muted)] line-clamp-1 max-w-xs" title={inv.notes}>
                                📝 {inv.notes}
                              </div>
                            )}
                          </td>

                          <td data-label="Responsável" className="px-5 py-3.5 text-[var(--text-secondary)]">
                            <div>{guardian?.name || '—'}</div>
                            {guardian?.phone && (
                              <span className="text-xs text-[var(--text-muted)] font-mono">{guardian.phone}</span>
                            )}
                          </td>

                          <td data-label="Vencimento" className="px-5 py-3.5 font-mono text-[var(--text-secondary)]">
                            {inv.due_date?.split('-').reverse().join('/')}
                          </td>

                          <td data-label="Valor" className="px-5 py-3.5 font-mono font-bold text-[var(--text-primary)]">{fmt(inv.amount)}{inv.status==='paid'&&!inv.settled_before_import&&<p className="text-xs font-normal mt-1">Recebido: {fmt(inv.paid_amount??inv.amount)}</p>}{inv.settled_before_import&&<p className="text-xs font-normal mt-1">Quitação informada na planilha</p>}{Number(inv.receipt?.discount_amount)>0&&<p className="text-xs text-emerald-700 mt-1">Com desconto: {fmt(Number(inv.receipt.discount_amount))}</p>}</td>

                          <td data-label="Status" className="px-5 py-3.5 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold tracking-normal border ${
                                isPaid
                                  ? 'bg-[#C8E6C9] text-[#a71327] border-[#c81930]/20'
                                  : isOverdue
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {isPaid ? (inv.settled_before_import?'Quitado na importação':'Pago') : isUnconfirmed?'A confirmar':isOverdue ? 'Atrasado' : 'Pendente'}
                            </span>
                          </td>

                          <td data-label="Ações" className="px-5 py-3.5 text-right">
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <InvoiceProofsButton invoiceId={inv.id} count={Number(inv.proof_count||0)}/>
                              {!isPaid && !isUnconfirmed && guardianPhone && (
                                <a
                                  href={`https://wa.me/55${guardianPhone}?text=${encodeURIComponent(whatsappMsg)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="button px-2.5 py-1 bg-[#c81930]/10 hover:bg-[#c81930]/20 text-[#a71327] border border-[#c81930]/30 rounded font-bold text-xs tracking-normal inline-flex items-center gap-1 transition-all"
                                >
                                  <Send className="w-3 h-3" /> Cobrar
                                </a>
                              )}

                              {!isPaid ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPaymentModal(inv)}
                                  className="button px-3 py-1 bg-[#c81930] hover:bg-[#a71327] text-white font-bold text-xs  tracking-normal rounded inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                                >
                                  <Check className="w-3 h-3" /> Dar Baixa
                                </button>
                              ) : inv.settled_before_import ? <span className="text-xs text-[var(--text-muted)]">Sem movimentação de caixa</span> : (
                                <div className="flex items-center gap-2 justify-end">
                                  {(() => {
                                    const origin = getPaymentOriginDetails(inv.payment_method, inv.notes)
                                    return (
                                      <div className="text-right">
                                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded border ${origin.color}`}>
                                          {origin.label}
                                        </span>
                                        <div className="text-[9px] text-[var(--text-muted)] font-mono">
                                          {paymentPartsLabel(inv)}
                                        </div>
                                        <p className="text-xs text-[var(--text-muted)]">Baixa por {inv.receipt?.actor_name || 'autor anterior não verificado'}{inv.receipt?.actor_username&&` (@${inv.receipt.actor_username})`}</p>
                                        {inv.receipt?.notes && <p className="text-xs text-[var(--text-muted)]">{inv.receipt.notes}</p>}{inv.receipt?.negotiation_reason&&<p className="text-xs text-[var(--text-muted)]">Justificativa: {inv.receipt.negotiation_reason}</p>}
                                      </div>
                                    )
                                  })()}
                                  <button hidden={!canReverse} aria-label="Estornar pagamento caso tenha dado baixa por engano"
                                    type="button"
                                    onClick={() => setRevertInvoiceId(inv.id)}
                                    title="Estornar pagamento caso tenha dado baixa por engano"
                                    className="button text-[var(--text-muted)] hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <nav aria-label="Paginação de mensalidades" className="card-light p-4 flex flex-wrap justify-between items-center gap-3"><p className="text-sm">{pagination.total?`${(pagination.page-1)*pagination.pageSize+1}–${Math.min(pagination.page*pagination.pageSize,pagination.total)} de ${pagination.total}`:'Nenhum registro'} · Página {pagination.page} de {pagination.pages}</p><div className="flex gap-2"><button type="button" className="button" disabled={isNavigating||pagination.page<=1} onClick={()=>goTo(financeHref({...currentContext,page:pagination.page-1},filters))}>Anterior</button><button type="button" className="button" disabled={isNavigating||pagination.page>=pagination.pages} onClick={()=>goTo(financeHref({...currentContext,page:pagination.page+1},filters))}>Próxima</button></div></nav>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: INADIMPLENTES & COBRANÇA ATIVA */}
      {/* ======================================================== */}
      {activeTab === 'inadimplentes' && (
        <div className="space-y-6">
          {/* Alerta de Dívida Total */}
          <div className="p-5 bg-gradient-to-r from-red-50 via-amber-50 to-orange-50 border border-red-200 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-red-800 font-bold tracking-normal text-xs">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                Controle de Inadimplência em Aberto (Todos os Meses)
              </div>
              <p className="text-xs text-[var(--text-secondary)] max-w-2xl">
                Cobranças vencidas mantêm o valor acordado. Se houver desconto, informe a condição e o valor recebido no momento da baixa.
              </p>
            </div>

            <div className="bg-[var(--bg-card)] p-3.5 rounded-lg border border-red-200 shrink-0 text-right space-y-0.5">
              <div className="text-xs text-[var(--text-muted)] font-bold ">Total acordado em aberto</div>
              <div className="stat-number  text-red-600 tracking-tight leading-tight">{fmt(totalOverdueDebt)}</div>
              <div className="text-xs text-[var(--text-muted)] font-bold">{overdueInvoices.length} faturas vencidas</div>
            </div>
          </div>

          {/* Tabela de Inadimplentes */}
          {overdueInvoices.length === 0 ? (
            <div className="card-light py-16 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-[#c81930] mx-auto" />
              <p className="text-sm font-bold text-[var(--text-primary)]">Parabéns! Nenhum aluno inadimplente no momento.</p>
              <p className="text-xs text-[var(--text-muted)]">Todas as mensalidades vencidas estão 100% quitadas.</p>
            </div>
          ) : (
            <div className="card-light overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-table mobile-data-table">
                  <thead className="bg-[var(--bg-card-hover)] border-b border-[var(--border-color)] text-[var(--text-secondary)]  tracking-normal font-bold">
                    <tr>
                      <th className="px-5 py-3.5">Atleta Inadimplente</th>
                      <th className="px-5 py-3.5">Responsável</th>
                      <th className="px-5 py-3.5">Mês & Vencimento</th>
                      <th className="px-5 py-3.5 text-center">Dias em Atraso</th>
                      <th className="px-5 py-3.5">Valor acordado</th>
                      <th className="px-5 py-3.5 text-right">Ação de Cobrança</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {overdueInvoices.map((inv) => {
                      const guardian = Array.isArray(inv.student?.guardian) ? inv.student.guardian[0] : inv.student?.guardian
                      const guardianPhone = guardian?.phone ? guardian.phone.replace(/\D/g, '') : ''
                      const charges = inv.charges || calculateOverdueCharges(Number(inv.amount), inv.due_date, todayStr)

                      const cobrancaMsg = `Olá ${guardian?.name || 'Responsável'}, tudo bem? Aqui é da secretaria da Escolinha do Sport.\n\nConsta em aberto a mensalidade do atleta *${inv.student?.name}* ref. ao mês *${inv.reference_month}* (venceu em ${inv.due_date?.split('-').reverse().join('/')}, atraso de ${charges.daysOverdue} dias).\n\n• *Valor acordado em aberto:* *${fmt(inv.amount)}*\n\nPagamento manual:\n solicite os dados oficiais à secretaria e aguarde a conferência do recebimento.\n\nCaso já tenha realizado o pagamento ou queira regularizar com a secretaria, por favor nos responda aqui. Obrigado!`

                      return (
                        <tr key={inv.id} className="hover:bg-red-50/40 transition-colors">
                          <td data-label="Atleta Inadimplente" className="px-5 py-3.5 font-bold text-[var(--text-primary)]">
                            {inv.student?.name}
                          </td>

                          <td data-label="Responsável" className="px-5 py-3.5 text-[var(--text-secondary)]">
                            <div>{guardian?.name || '—'}</div>
                            {guardian?.phone && (
                              <span className="text-xs text-[var(--text-muted)] font-mono">{guardian.phone}</span>
                            )}
                          </td>

                          <td data-label="Mês & Vencimento" className="px-5 py-3.5 text-[var(--text-secondary)] font-mono">
                            <div>Ref: {inv.reference_month}</div>
                            <span className="text-xs text-[var(--text-muted)]">
                              Venc: {inv.due_date?.split('-').reverse().join('/')}
                            </span>
                          </td>

                          <td data-label="Dias em Atraso" className="px-5 py-3.5 text-center">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                              🔴 {charges.daysOverdue} dias
                            </span>
                          </td>

                          <td data-label="Original" className="px-5 py-3.5 font-mono text-[var(--text-secondary)]">{fmt(inv.amount)}</td>

                          <td data-label="Ação de Cobrança" className="px-5 py-3.5 text-right">
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              {guardianPhone && (
                                <a
                                  href={`https://wa.me/55${guardianPhone}?text=${encodeURIComponent(cobrancaMsg)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="button px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs tracking-normal inline-flex items-center gap-1.5 transition-all shadow-2xs"
                                >
                                  <Send className="w-3 h-3" /> Cobrar WhatsApp
                                </a>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenPaymentModal(inv)}
                                className="button px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded font-bold text-xs  tracking-normal inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                              >
                                <Check className="w-3 h-3 text-emerald-400" /> Baixa / Acordo
                              </button>
                            </div>
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
      )}

      {/* ======================================================== */}
      {/* ABA 3: FECHAMENTO DIÁRIO DE CAIXA */}
      {/* ======================================================== */}
      {activeTab === 'caixa_diario' && (
        <div className="space-y-6">
          {/* Header do Caixa com Seletor de Data e Botão Imprimir */}
          <div className="card-light p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-[var(--bg-card-hover)] border border-[var(--border-color)] rounded-lg px-3 py-2">
                <Calendar className="w-4 h-4 text-[var(--text-secondary)]" />
                <span className="text-[var(--text-secondary)] text-xs font-bold ">Data do Fechamento:</span>
                <input
                  type="date" aria-label="Data do fechamento"
                  defaultValue={targetDate}
                  onChange={handleDateChange}
                  className="bg-transparent text-[var(--text-primary)] text-xs font-mono font-bold outline-none cursor-pointer"
                />
              </div>
              {targetDate === todayStr && (
                <span className="px-2 py-1 bg-emerald-100 text-[#a71327] text-xs font-bold tracking-normal rounded">
                  Hoje (Em Aberto)
                </span>
              )}
            </div>

            <button
              onClick={handlePrintDailyClosing}
              className="button px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold  tracking-normal flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4 text-[var(--text-muted)]" />
              Imprimir Espelho de Caixa
            </button>
          </div>

          {/* Cards de Conferência da Gaveta & Métodos */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Dinheiro (Espécie na Gaveta) */}
            <div className="card-light p-4 space-y-1.5 border-emerald-300 bg-emerald-50/50">
              <div className="flex items-center justify-between text-emerald-800 font-bold tracking-normal text-xs">
                <span className="flex items-center gap-1">
                  <Banknote className="w-4 h-4 text-emerald-700" /> Dinheiro (Gaveta)
                </span>
              </div>
              <div className="stat-number  text-emerald-900 tracking-tight leading-tight">
                {fmt(dailyCash.dinheiro)}
              </div>
              <p className="text-xs text-emerald-700 font-bold">Conferir notas e moedas</p>
            </div>

            {/* PIX */}
            <div className="card-light p-4 space-y-1.5">
              <div className="flex items-center justify-between text-[var(--text-secondary)] font-bold tracking-normal text-xs">
                <span className="flex items-center gap-1">
                  <Zap className="w-4 h-4 text-amber-500" /> PIX Balcão/Online
                </span>
              </div>
              <div className="stat-number  text-[var(--text-primary)] tracking-tight leading-tight">
                {fmt(dailyCash.pix)}
              </div>
              <p className="text-xs text-[var(--text-muted)]">Entrada em conta</p>
            </div>

            {/* Débito */}
            <div className="card-light p-4 space-y-1.5">
              <div className="flex items-center justify-between text-[var(--text-secondary)] font-bold tracking-normal text-xs">
                <span className="flex items-center gap-1">
                  <CreditCard className="w-4 h-4 text-blue-600" /> Cartão Débito
                </span>
              </div>
              <div className="stat-number  text-[var(--text-primary)] tracking-tight leading-tight">
                {fmt(dailyCash.debito)}
              </div>
              <p className="text-xs text-[var(--text-muted)]">Conferir filipeta máq.</p>
            </div>

            {/* Crédito */}
            <div className="card-light p-4 space-y-1.5">
              <div className="flex items-center justify-between text-[var(--text-secondary)] font-bold tracking-normal text-xs">
                <span className="flex items-center gap-1">
                  <CreditCard className="w-4 h-4 text-purple-600" /> Cartão Crédito
                </span>
              </div>
              <div className="stat-number  text-[var(--text-primary)] tracking-tight leading-tight">
                {fmt(dailyCash.credito)}
              </div>
              <p className="text-xs text-[var(--text-muted)]">Conferir filipeta máq.</p>
            </div>

            {/* Total Geral do Dia */}
            <div className="card-light p-4 space-y-1.5 border-slate-900 bg-slate-900 text-white col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between text-[var(--text-muted)] font-bold tracking-normal text-xs">
                <span className="flex items-center gap-1">
                  <Wallet className="w-4 h-4 text-white" /> Total do Caixa
                </span>
              </div>
              <div className="stat-number  text-white tracking-tight leading-tight">
                {fmt(dailyCash.total)}
              </div>
              <p className="text-xs text-[var(--text-muted)]">{dailyCash.count} recebimento(s)</p>
            </div>
          </div>

          {/* Tabela de Lançamentos do Dia */}
          <div className="card-light overflow-hidden">
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
              <h3 className="section-title text-xl text-[var(--text-primary)] tracking-tight leading-tight flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--text-secondary)]" />
                Entradas Recebidas em {targetDate.split('-').reverse().join('/')}
              </h3>
              <span className="text-xs text-[var(--text-muted)] font-bold">
                {dailyCash.items.length} movimentação(ões)
              </span>
            </div>

            {dailyCash.items.length === 0 ? (
              <div className="py-12 text-center text-[var(--text-muted)] text-xs">
                Nenhuma entrada registrada nesta data.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table mobile-data-table">
                  <thead className="bg-[var(--bg-card-hover)] border-b border-[var(--border-color)] text-[var(--text-secondary)]  tracking-normal font-bold">
                    <tr>
                      <th className="px-5 py-3">Horário</th>
                      <th className="px-5 py-3">Atleta / Responsável</th>
                      <th className="px-5 py-3">Mês Ref.</th>
                      <th className="px-5 py-3">Forma</th>
                      <th className="px-5 py-3 font-bold">Valor</th>
                      <th className="px-5 py-3">Auditoria / Detalhes</th>
                      <th className="px-5 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {dailyCash.items.map((it) => {
                      const timeStr = it.paid_at
                        ? new Date(it.paid_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                        : '—'
                      const method = it.payment_method?.toLowerCase() || 'pix'

                      return (
                        <tr key={it.id} className="hover:bg-[var(--bg-card-hover)]/80 transition-colors">
                          <td data-label="Horário" className="px-5 py-3.5 font-mono text-[var(--text-secondary)] font-bold">
                            <Clock className="w-3 h-3 inline mr-1 text-[var(--text-muted)]" />
                            {timeStr}
                          </td>

                          <td data-label="Atleta / Responsável" className="px-5 py-3.5 font-bold text-[var(--text-primary)]">
                            <div>{it.student?.name}</div>
                            {it.student?.guardian?.[0]?.name && (
                              <div className="text-xs text-[var(--text-muted)] font-normal">
                                Resp: {it.student?.guardian?.[0]?.name}
                              </div>
                            )}
                          </td>

                          <td data-label="Mês Ref." className="px-5 py-3.5 font-mono text-[var(--text-secondary)]">{it.reference_month}</td>

                          <td data-label="Forma" className="px-5 py-3.5">
                            {(() => {
                              const origin = getPaymentOriginDetails(it.payment_method, it.notes)
                              return (
                                <div className="space-y-1">
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-bold tracking-normal border inline-block ${
                                      method === 'dinheiro'
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                        : method.includes('debito')
                                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                                        : method.includes('credito')
                                        ? 'bg-purple-50 text-purple-800 border-purple-200'
                                        : 'bg-amber-50 text-amber-800 border-amber-200'
                                    }`}
                                  >
                                    {method === 'misto' ? 'Pagamento dividido' : method === 'dinheiro'
                                      ? '💵 Dinheiro'
                                      : method.includes('debito')
                                      ? '💳 Débito'
                                      : method.includes('credito')
                                      ? '💳 Crédito'
                                      : '⚡ PIX'}
                                  </span>
                                  <div>
                                    <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded border ${origin.color}`}>
                                      {origin.label}
                                    </span>
                                  </div>
                                </div>
                              )
                            })()}
                          </td>

                          <td data-label="Valor" className="px-5 py-3.5 font-mono font-bold text-[var(--text-primary)] text-sm">
                            {fmt(it.paid_amount ?? it.amount)}
                          </td>

                          <td data-label="Auditoria / Detalhes" className="px-5 py-3.5 text-xs text-[var(--text-secondary)] max-w-xs">
                            <div className="line-clamp-2" title={it.notes || ''}>
                              {it.notes || 'Sem observações'}
                            </div>
                            <p className="text-xs my-2">{paymentPartsLabel(it)}</p>{Number(it.receipt?.discount_amount)>0&&<p className="text-xs text-emerald-700">Desconto: {fmt(Number(it.receipt.discount_amount))}</p>}
                            <p className="text-xs my-2">Baixa por {it.receipt?.actor_name || 'autor anterior não verificado'}{it.receipt?.actor_username&&` (@${it.receipt.actor_username})`}</p>
                            <InvoiceProofsButton invoiceId={it.id} count={Number(it.proof_count||0)}/>
                          </td>

                          <td data-label="Ações" className="px-5 py-3.5 text-right">
                            <button aria-label="Estornar esta baixa do caixa"
                              type="button"
                              onClick={() => setRevertInvoiceId(it.id)}
                              className="button px-2 py-1 text-red-600 hover:bg-red-50 rounded border border-red-200 text-xs font-bold  tracking-normal inline-flex items-center gap-1 cursor-pointer"
                              title="Estornar esta baixa do caixa"
                            >
                              <RotateCcw className="w-3 h-3" /> Estornar
                            </button>
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
      )}

      {/* ======================================================== */}
      {/* ABA 4: RELATÓRIOS (SEMANAL & MENSAL) */}
      {/* ======================================================== */}
      {activeTab === 'relatorios' && (
        <div className="space-y-8">
          {/* Relatório Semanal */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="section-title  text-[var(--text-primary)] tracking-tight leading-tight flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-700" />
                  Fechamento Semanal (Últimos 7 Dias)
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Visão diária de entradas e divisão por modalidade de pagamento.
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-[var(--text-muted)] font-bold">Total da Semana</span>
                <div className="stat-number  text-indigo-800 tracking-tight leading-tight">
                  {fmt(weeklyCash.totalWeek)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {weeklyCash.days.map((day) => (
                <div key={day.date} className="card-light p-3 space-y-2 text-center">
                  <div className="text-xs font-bold text-[var(--text-secondary)] capitalize">{day.label}</div>
                  <div className="stat-number  text-[var(--text-primary)] leading-tight">{fmt(day.total)}</div>
                  <div className="space-y-0.5 pt-1 border-t border-[var(--border-color)] text-[9px] text-[var(--text-muted)] text-left font-mono">
                    <div>💵 Din: {fmt(day.dinheiro)}</div>
                    <div>⚡ PIX: {fmt(day.pix)}</div>
                    <div>💳 Cart: {fmt(day.cartao)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Relatório Mensal Consolidado */}
          <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="section-title  text-[var(--text-primary)] tracking-tight leading-tight flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#c81930]" />
                  Fechamento Consolidado do Mês ({monthlyCash.month})
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Indicadores executivos para prestação de contas à diretoria.
                </p>
              </div>

              <button
                onClick={() => window.print()}
                className="button px-3.5 py-1.5 bg-[var(--bg-subtle)] hover:bg-slate-200 text-[var(--text-primary)] rounded text-xs font-bold  tracking-normal flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Imprimir Relatório
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Eficiência */}
              <div className="card-light p-5 space-y-3">
                <div className="text-xs font-bold tracking-normal text-[var(--text-muted)]">Taxa de Arrecadação</div>
                <div className="stat-number  text-[#c81930] leading-tight">
                  {monthlyCash.collectionRate.toFixed(1)}%
                </div>
                <div className="w-full bg-[var(--bg-subtle)] rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-[#c81930] h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, monthlyCash.collectionRate)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-[var(--text-muted)] font-mono">
                  <span>Recebido: {fmt(monthlyCash.totalCollected)}</span>
                  <span>Previsto: {fmt(monthlyCash.totalExpected)}</span>
                </div>
              </div>

              {/* Inadimplência do Mês */}
              <div className="card-light p-5 space-y-3 border-amber-200 bg-amber-50/30">
                <div className="text-xs font-bold tracking-normal text-amber-800">Inadimplência do Mês</div>
                <div className="stat-number  text-amber-700 leading-tight">
                  {fmt(monthlyCash.totalOverdue)}
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Pendências financeiras ativas com vencimento no mês de {monthlyCash.month}.
                </p>
                <button
                  onClick={() => setActiveTab('inadimplentes')}
                  className="button text-xs font-bold text-amber-800 hover:underline flex items-center gap-1"
                >
                  Abrir régua de cobrança <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>

              {/* Mix de Pagamentos */}
              <div className="card-light p-5 space-y-3">
                <div className="text-xs font-bold tracking-normal text-[var(--text-muted)]">Mix de Pagamento (Mês)</div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 font-bold text-[var(--text-secondary)]">
                      <Zap className="w-3.5 h-3.5 text-amber-500" /> PIX:
                    </span>
                    <span className="font-mono font-bold">{fmt(monthlyCash.pix)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 font-bold text-[var(--text-secondary)]">
                      <Banknote className="w-3.5 h-3.5 text-emerald-600" /> Dinheiro:
                    </span>
                    <span className="font-mono font-bold">{fmt(monthlyCash.dinheiro)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 font-bold text-[var(--text-secondary)]">
                      <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Cartões:
                    </span>
                    <span className="font-mono font-bold">{fmt(monthlyCash.cartao)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DE BAIXA MANUAL DESCOMPLICADA (SECRETARIA) */}
      {/* ======================================================== */}
      {showAdvancePayment&&<AdvancePaymentDialog initialMonth={currentMonth} initialSearch={filters.q} todayStr={todayStr} operatorName={operatorName}
        onClose={()=>setShowAdvancePayment(false)} onFinished={(invoice,paid)=>{
          setShowAdvancePayment(false)
          setFeedback({type:'success',message:paid?`Recebimento de ${invoice.reference_month.split('-').reverse().join('/')} registrado com sucesso.`:'Mensalidade preparada. Ela permanece pendente até a confirmação do recebimento.'})
          goTo(financeHref({...currentContext,month:invoice.reference_month,status:'all',tab:'mensalidades'}, {...defaultFinanceFilters,q:invoice.student.name}))
          router.refresh()
        }}/>}
      {modalInvoice&&<ManualPaymentDialog key={modalInvoice.idempotencyKey} invoice={modalInvoice} operatorName={operatorName} onClose={()=>setModalInvoice(null)} onSuccess={()=>{setModalInvoice(null);setFeedback({type:'success',message:'Recebimento registrado com sucesso.'});router.refresh()}}/>}

      {/* ======================================================== */}
      {/* MODAL DE ESTORNO DE PAGAMENTO */}
      {/* ======================================================== */}
      {revertInvoiceId && (
        <ModalFrame label="Estornar pagamento" onClose={() => setRevertInvoiceId(null)}>
          <div className="bg-[var(--bg-card)] rounded-lg max-w-md w-full p-6 space-y-4 shadow-2xl border border-[var(--border-color)]">
            <div className="flex items-center gap-2 text-red-700 font-bold text-xs">
              <RotateCcw className="w-5 h-5 text-red-600" />
              Estornar Baixa de Pagamento
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Você está prestes a desfazer a baixa deste pagamento. A fatura voltará a constar como pendente e será removida do total de entradas do caixa.
            </p>

            <div>
              <label htmlFor="field-appfinanceirofinanceiroclienttsx-107" className="text-xs font-bold text-[var(--text-secondary)]  block mb-1">
                Motivo do Estorno (Obrigatório para auditoria):
              </label>
              <input id="field-appfinanceirofinanceiroclienttsx-107"
                type="text"
                placeholder="Ex: Lançamento duplicado pela secretaria / Erro de digitação"
                value={revertReason}
                onChange={(e) => setRevertReason(e.target.value)}
                className="w-full p-2 border border-[var(--border-color)] rounded text-xs outline-none bg-[var(--bg-card)]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
              <button
                onClick={() => {
                  setRevertInvoiceId(null)
                  setRevertReason('')
                }}
                className="button px-3.5 py-2 bg-[var(--bg-subtle)] text-[var(--text-secondary)] rounded text-xs font-bold "
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRevert}
                disabled={isPending || !revertReason.trim()}
                className="button px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold  flex items-center gap-1.5"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                Confirmar Estorno
              </button>
            </div>
          </div>
        </ModalFrame>
      )}

      {/* ======================================================== */}
      {/* MODAL DA RÉGUA DE WHATSAPP EM LOTE */}
      {/* ======================================================== */}
      {showReguaModal && (
        <ModalFrame label="Lembretes de mensalidade" onClose={() => setShowReguaModal(false)} wide>
          <div className="bg-[var(--bg-card)] rounded-lg max-w-2xl w-full p-6 space-y-4 shadow-xl border border-[var(--border-color)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div>
                <h3 className="section-title  text-[var(--text-primary)] tracking-tight leading-tight flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-[#c81930]" />
                  Lembretes de cobrança pelo WhatsApp
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Mensagens prontas para os responsáveis pendentes do mês. Abra o WhatsApp e confirme o envio de cada mensagem.
                </p>
              </div>
              <button aria-label="Fechar janela"
                onClick={() => setShowReguaModal(false)}
                className="button text-[var(--text-muted)] hover:text-[var(--text-secondary)] font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {pendingInvoices.map((inv) => {
                const guardian = Array.isArray(inv.student?.guardian) ? inv.student.guardian[0] : inv.student?.guardian
                const guardianPhone = guardian?.phone ? guardian.phone.replace(/\D/g, '') : ''
                const msg = `Olá ${guardian?.name || 'Responsável'}, tudo bem? Aqui é da Escolinha do Sport! Segue o lembrete da mensalidade do atleta *${inv.student?.name}* referente ao mês *${inv.reference_month}* no valor de *${fmt(inv.amount)}* com vencimento em *${inv.due_date?.split('-').reverse().join('/')}*.\n\nPagamento manual:\n solicite os dados oficiais à secretaria e aguarde a conferência do recebimento.\n\n${inv.student?.portal_token ? 'Acesse o Portal do Atleta: ' + (typeof window!=='undefined'?window.location.origin:'') + '/portal/' + inv.student.portal_token : ''}\n\nObrigado!`

                return (
                  <div key={inv.id} className="p-3 bg-[var(--bg-card-hover)] rounded border border-[var(--border-color)] flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-[var(--text-primary)]">{inv.student?.name} (Resp: {guardian?.name})</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {fmt(inv.amount)} • Venc: {inv.due_date?.split('-').reverse().join('/')}
                      </div>
                    </div>

                    {guardianPhone ? (
                      <a
                        href={`https://wa.me/55${guardianPhone}?text=${encodeURIComponent(msg)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="button px-3 py-1.5 bg-[#c81930] hover:bg-[#a71327] text-white rounded font-bold text-xs tracking-normal inline-flex items-center gap-1 shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" /> Abrir WhatsApp
                      </a>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)] italic">Sem WhatsApp</span>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="pt-3 border-t border-[var(--border-color)] flex justify-end">
              <button
                onClick={() => setShowReguaModal(false)}
                className="button px-5 py-2 bg-[var(--bg-subtle)] hover:bg-slate-200 text-[var(--text-secondary)] rounded text-xs font-bold  tracking-normal"
              >
                Fechar
              </button>
            </div>
          </div>
        </ModalFrame>
      )}
    </div>
  )
}
