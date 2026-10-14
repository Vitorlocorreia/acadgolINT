'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Send,
  PlusCircle,
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
  ArrowUpRight,
} from 'lucide-react'
import {
  markInvoiceManualPaidAction,
  revertInvoicePaymentAction,
  generateMonthlyInvoicesAction,
  type ManualPaymentPayload,
} from './actions'
import { calculateOverdueCharges, getPaymentOriginDetails } from './calc'

interface Props {
  invoices: any[]
  stats: {
    total: number
    collected: number
    pending: number
    overdue: number
  }
  currentMonth: string
  currentStatus: string
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

function fmt(val: number) {
  return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function FinanceiroClient({
  invoices,
  stats,
  currentMonth,
  currentStatus,
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
  const [activeTab, setActiveTab] = useState<'mensalidades' | 'inadimplentes' | 'caixa_diario' | 'relatorios'>(
    (initialTab as any) || 'mensalidades'
  )
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Modais
  const [showReguaModal, setShowReguaModal] = useState(false)
  const [modalInvoice, setModalInvoice] = useState<any | null>(null)
  const [revertInvoiceId, setRevertInvoiceId] = useState<string | null>(null)
  const [revertReason, setRevertReason] = useState('')

  // Estados do Modal de Baixa Manual Descomplicada
  const [paymentMode, setPaymentMode] = useState<'presencial' | 'online'>('presencial')
  const [selectedMethod, setSelectedMethod] = useState<'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito'>('dinheiro')
  const [receivedBy, setReceivedBy] = useState('Secretaria / Recepção')
  const [overdueOption, setOverdueOption] = useState<'standard' | 'waive' | 'negotiated'>('standard')
  const [negotiatedAmount, setNegotiatedAmount] = useState<number>(0)
  const [negotiationReason, setNegotiationReason] = useState('')
  const [amountTendered, setAmountTendered] = useState<number>(0)
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paidAtDate, setPaidAtDate] = useState<string>('')

  // Filtros de data e mês
  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    router.push(`/financeiro?month=${e.target.value}&status=${currentStatus}&date=${targetDate}&tab=${activeTab}`)
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    router.push(`/financeiro?month=${currentMonth}&status=${currentStatus}&date=${e.target.value}&tab=${activeTab}`)
  }

  const handleStatusFilter = (status: string) => {
    router.push(`/financeiro?month=${currentMonth}&status=${status}&date=${targetDate}&tab=${activeTab}`)
  }

  // Abre Modal de Baixa
  const handleOpenPaymentModal = (invoice: any) => {
    setFeedback(null)
    const isOverdue = invoice.due_date < todayStr || invoice.status === 'overdue'
    const charges = calculateOverdueCharges(Number(invoice.amount), invoice.due_date, todayStr)

    setModalInvoice(invoice)
    setPaymentMode('presencial')
    setSelectedMethod('dinheiro')
    setReceivedBy('Secretaria / Recepção')
    setOverdueOption(isOverdue && charges.daysOverdue > 0 ? 'standard' : 'waive')
    setNegotiatedAmount(Number(invoice.amount))
    setNegotiationReason('')
    setAmountTendered(0)
    setPaymentNotes('')

    // Formato YYYY-MM-DDTHH:mm para input datetime-local
    const now = new Date()
    const tzOffset = now.getTimezoneOffset() * 60000
    const localIso = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16)
    setPaidAtDate(localIso)
  }

  // Submissão da Baixa Manual
  const handleConfirmManualPayment = () => {
    if (!modalInvoice) return

    setFeedback(null)
    const origAmount = Number(modalInvoice.amount)
    const charges = calculateOverdueCharges(origAmount, modalInvoice.due_date, todayStr)
    const isOverdue = charges.daysOverdue > 0

    let finalAmount = origAmount
    let fine = 0
    let interest = 0
    let discount = 0

    if (isOverdue) {
      if (overdueOption === 'standard') {
        fine = charges.fineAmount
        interest = charges.interestAmount
        finalAmount = charges.totalSuggested
      } else if (overdueOption === 'waive') {
        finalAmount = origAmount
      } else if (overdueOption === 'negotiated') {
        finalAmount = Number(negotiatedAmount) || origAmount
        if (finalAmount < origAmount) {
          discount = origAmount - finalAmount
        } else if (finalAmount > origAmount) {
          fine = finalAmount - origAmount
        }
      }
    }

    const payload: ManualPaymentPayload = {
      invoiceId: modalInvoice.id,
      paymentMethod: paymentMode === 'online' ? 'pix_whatsapp' : selectedMethod,
      paymentChannel: paymentMode === 'online' ? 'online_whatsapp' : 'presencial',
      receivedBy: receivedBy.trim() || 'Secretaria',
      receivedAmount: finalAmount,
      originalAmount: origAmount,
      fineAmount: fine,
      interestAmount: interest,
      discountAmount: discount,
      amountTendered: selectedMethod === 'dinheiro' && amountTendered > 0 ? amountTendered : undefined,
      changeGiven: selectedMethod === 'dinheiro' && amountTendered > finalAmount ? amountTendered - finalAmount : 0,
      notes: paymentNotes,
      paidAt: paidAtDate ? new Date(paidAtDate).toISOString() : new Date().toISOString(),
      isOverdueSettlement: isOverdue,
      negotiationReason: overdueOption === 'negotiated' ? negotiationReason : undefined,
    }

    startTransition(async () => {
      const res = await markInvoiceManualPaidAction(payload)
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `✅ Baixa registrada com sucesso! Valor de ${fmt(finalAmount)} recebido via ${selectedMethod.toUpperCase()}.`,
        })
        setModalInvoice(null)
        router.refresh()
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erro ao dar baixa manual.' })
      }
    })
  }

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
          message: `${res.count} nova(s) mensalidade(s) gerada(s) para o mês ${currentMonth}!`,
        })
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
  const totalOverdueDebt = overdueInvoices.reduce((acc, curr) => acc + (curr.charges?.totalSuggested || Number(curr.amount)), 0)

  return (
    <div className="space-y-6">
      {/* NAVEGAÇÃO POR ABAS SUPERIORES */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('mensalidades')}
          className={`px-4 py-2.5 rounded-t-[6px] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'mensalidades'
              ? 'bg-[#1A6B2E] text-white border-b-2 border-[#0D4A1C] shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Mensalidades ({invoices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('inadimplentes')}
          className={`px-4 py-2.5 rounded-t-[6px] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'inadimplentes'
              ? 'bg-amber-600 text-white border-b-2 border-amber-800 shadow-xs'
              : 'bg-white text-amber-700 hover:bg-amber-50'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          <span>Inadimplentes & Cobrança</span>
          {overdueInvoices.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-red-600 text-white font-bold">
              {overdueInvoices.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('caixa_diario')}
          className={`px-4 py-2.5 rounded-t-[6px] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'caixa_diario'
              ? 'bg-slate-900 text-white border-b-2 border-black shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Fechamento Diário de Caixa</span>
        </button>

        <button
          onClick={() => setActiveTab('relatorios')}
          className={`px-4 py-2.5 rounded-t-[6px] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'relatorios'
              ? 'bg-indigo-700 text-white border-b-2 border-indigo-900 shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Relatórios (Semanal & Mensal)</span>
        </button>
      </div>

      {/* FEEDBACK MENSAGEM */}
      {feedback && (
        <div
          className={`p-4 rounded-[4px] text-xs font-bold flex items-center justify-between border shadow-2xs ${
            feedback.type === 'success'
              ? 'bg-[#C8E6C9]/60 border-[#1A6B2E]/40 text-[#0D4A1C]'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-[#1A6B2E] shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs font-mono font-bold hover:opacity-75 cursor-pointer">
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
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-[4px] px-3 py-2">
                <Calendar className="w-4 h-4 text-[#1A6B2E]" />
                <span className="text-slate-600 text-xs font-bold uppercase">Mês de Referência:</span>
                <input
                  type="month"
                  defaultValue={currentMonth}
                  onChange={handleMonthChange}
                  className="bg-transparent text-slate-800 text-xs font-mono font-bold outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {pendingInvoices.length > 0 && (
                <button
                  onClick={() => setShowReguaModal(true)}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#0D4A1C] border border-[#1A6B2E]/30 rounded-[4px] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <Smartphone className="w-4 h-4 text-[#1A6B2E]" />
                  Régua WhatsApp ({pendingInvoices.length})
                </button>
              )}

              <button
                onClick={handleGenerateInvoices}
                disabled={isPending}
                className="px-4 py-2 bg-[#1A6B2E] hover:bg-[#0D4A1C] text-white rounded-[4px] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5 text-white" />}
                Gerar Mensalidades do Mês
              </button>
            </div>
          </div>

          {/* Cards KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card-light p-4 space-y-2">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Previsto</span>
              <div className="font-bebas text-3xl text-slate-900 tracking-wider leading-none">{fmt(stats.total)}</div>
              <p className="text-[10px] text-slate-400">{invoices.length} faturas emitidas</p>
            </div>

            <div className="card-light p-4 space-y-2 border-[#1A6B2E]/30 bg-[#C8E6C9]/20">
              <span className="text-xs text-[#0D4A1C] font-bold uppercase tracking-wider">Total Recebido</span>
              <div className="font-bebas text-3xl text-[#1A6B2E] tracking-wider leading-none">{fmt(stats.collected)}</div>
              <p className="text-[10px] text-[#0D4A1C] font-bold">{collectionPct.toFixed(1)}% arrecadado</p>
            </div>

            <div className="card-light p-4 space-y-2">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Pendente (No Prazo)</span>
              <div className="font-bebas text-3xl text-slate-700 tracking-wider leading-none">{fmt(stats.pending)}</div>
              <p className="text-[10px] text-slate-400">A vencer neste mês</p>
            </div>

            <div className="card-light p-4 space-y-2 border-amber-200 bg-amber-50/40">
              <span className="text-xs text-amber-800 font-bold uppercase tracking-wider">Em Atraso (Cobrar)</span>
              <div className="font-bebas text-3xl text-amber-700 tracking-wider leading-none">{fmt(stats.overdue)}</div>
              <p className="text-[10px] text-amber-700 font-bold">Inadimplência ativa</p>
            </div>
          </div>

          {/* Filtros de Status */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStatusFilter('all')}
              className={`px-3 py-1.5 rounded-[4px] text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                currentStatus === 'all'
                  ? 'bg-[#1A6B2E] text-white border-[#1A6B2E]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Todas ({invoices.length})
            </button>
            <button
              onClick={() => handleStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-[4px] text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                currentStatus === 'pending'
                  ? 'bg-[#1A6B2E] text-white border-[#1A6B2E]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Pendentes
            </button>
            <button
              onClick={() => handleStatusFilter('paid')}
              className={`px-3 py-1.5 rounded-[4px] text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                currentStatus === 'paid'
                  ? 'bg-[#1A6B2E] text-white border-[#1A6B2E]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Pagas
            </button>
          </div>

          {/* Tabela de Mensalidades */}
          {invoices.length === 0 ? (
            <div className="card-light py-16 text-center space-y-2">
              <DollarSign className="w-12 h-12 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Nenhuma mensalidade encontrada para o período.</p>
              <p className="text-xs text-slate-500">
                Clique em "Gerar Mensalidades do Mês" para emitir as cobranças dos alunos ativos.
              </p>
            </div>
          ) : (
            <div className="card-light overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="px-5 py-3.5">Atleta / Aluno</th>
                      <th className="px-5 py-3.5">Responsável</th>
                      <th className="px-5 py-3.5">Vencimento</th>
                      <th className="px-5 py-3.5">Valor</th>
                      <th className="px-5 py-3.5 text-center">Status</th>
                      <th className="px-5 py-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map((inv) => {
                      const isPaid = inv.status === 'paid'
                      const isOverdue = !isPaid && (inv.due_date < todayStr || inv.status === 'overdue')
                      const guardian = Array.isArray(inv.student?.guardian) ? inv.student.guardian[0] : inv.student?.guardian
                      const guardianPhone = guardian?.phone ? guardian.phone.replace(/\D/g, '') : ''

                      const whatsappMsg = `Olá ${guardian?.name || 'Responsável'}, tudo bem? Aqui é da Academia do Gol! Segue o lembrete da mensalidade do atleta *${inv.student?.name}* referente ao mês *${inv.reference_month}* no valor de *${fmt(inv.amount)}* com vencimento em *${inv.due_date?.split('-').reverse().join('/')}*.\n\nChave PIX:\n${inv.pix_code || 'pix.academiadogol.com.br'}\n\nVocê também pode acompanhar no Portal: https://acadgoli.vercel.app/portal/${inv.student?.portal_token || ''}\n\nObrigado!`

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-slate-900">{inv.student?.name || 'Aluno'}</div>
                            {inv.notes && (
                              <div className="text-[10px] text-slate-500 line-clamp-1 max-w-xs" title={inv.notes}>
                                📝 {inv.notes}
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-slate-700">
                            <div>{guardian?.name || '—'}</div>
                            {guardian?.phone && (
                              <span className="text-[10px] text-slate-500 font-mono">{guardian.phone}</span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 font-mono text-slate-700">
                            {inv.due_date?.split('-').reverse().join('/')}
                          </td>

                          <td className="px-5 py-3.5 font-mono font-bold text-slate-900">{fmt(inv.amount)}</td>

                          <td className="px-5 py-3.5 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                isPaid
                                  ? 'bg-[#C8E6C9] text-[#0D4A1C] border-[#1A6B2E]/20'
                                  : isOverdue
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {isPaid ? 'Pago' : isOverdue ? 'Atrasado' : 'Pendente'}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!isPaid && guardianPhone && (
                                <a
                                  href={`https://wa.me/55${guardianPhone}?text=${encodeURIComponent(whatsappMsg)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1 bg-[#1A6B2E]/10 hover:bg-[#1A6B2E]/20 text-[#0D4A1C] border border-[#1A6B2E]/30 rounded font-bold text-[11px] uppercase tracking-wider inline-flex items-center gap-1 transition-all"
                                >
                                  <Send className="w-3 h-3" /> Cobrar
                                </a>
                              )}

                              {!isPaid ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPaymentModal(inv)}
                                  className="px-3 py-1 bg-[#1A6B2E] hover:bg-[#0D4A1C] text-white font-bold text-[11px] uppercase tracking-wider rounded inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                                >
                                  <Check className="w-3 h-3" /> Dar Baixa
                                </button>
                              ) : (
                                <div className="flex items-center gap-2 justify-end">
                                  {(() => {
                                    const origin = getPaymentOriginDetails(inv.payment_method, inv.notes)
                                    return (
                                      <div className="text-right">
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${origin.color}`}>
                                          {origin.label}
                                        </span>
                                        <div className="text-[9px] text-slate-400 font-mono">
                                          {inv.payment_method?.toUpperCase() || 'PIX'}
                                        </div>
                                      </div>
                                    )
                                  })()}
                                  <button
                                    type="button"
                                    onClick={() => setRevertInvoiceId(inv.id)}
                                    title="Estornar pagamento caso tenha dado baixa por engano"
                                    className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
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
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: INADIMPLENTES & COBRANÇA ATIVA */}
      {/* ======================================================== */}
      {activeTab === 'inadimplentes' && (
        <div className="space-y-6">
          {/* Alerta de Dívida Total */}
          <div className="p-5 bg-gradient-to-r from-red-50 via-amber-50 to-orange-50 border border-red-200 rounded-[8px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-red-800 font-bold uppercase tracking-wider text-xs">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                Controle de Inadimplência em Aberto (Todos os Meses)
              </div>
              <p className="text-xs text-slate-600 max-w-2xl">
                Atletas com mensalidades vencidas. O sistema calcula automaticamente a multa padrão de 2% e os juros de 1% ao mês (0,033%/dia). Você pode cobrar diretamente no WhatsApp com os valores calculados ou registrar acordo no momento da baixa.
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-[6px] border border-red-200 shrink-0 text-right space-y-0.5">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Total em Atraso com Encargos</div>
              <div className="font-bebas text-3xl text-red-600 tracking-wider leading-none">{fmt(totalOverdueDebt)}</div>
              <div className="text-[10px] text-slate-400 font-bold">{overdueInvoices.length} faturas vencidas</div>
            </div>
          </div>

          {/* Tabela de Inadimplentes */}
          {overdueInvoices.length === 0 ? (
            <div className="card-light py-16 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-[#1A6B2E] mx-auto" />
              <p className="text-sm font-bold text-slate-800">Parabéns! Nenhum aluno inadimplente no momento.</p>
              <p className="text-xs text-slate-500">Todas as mensalidades vencidas estão 100% quitadas.</p>
            </div>
          ) : (
            <div className="card-light overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="px-5 py-3.5">Atleta Inadimplente</th>
                      <th className="px-5 py-3.5">Responsável</th>
                      <th className="px-5 py-3.5">Mês & Vencimento</th>
                      <th className="px-5 py-3.5 text-center">Dias em Atraso</th>
                      <th className="px-5 py-3.5">Original</th>
                      <th className="px-5 py-3.5 text-red-700">Multa + Juros</th>
                      <th className="px-5 py-3.5 font-bold">Total Calculado</th>
                      <th className="px-5 py-3.5 text-right">Ação de Cobrança</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {overdueInvoices.map((inv) => {
                      const guardian = Array.isArray(inv.student?.guardian) ? inv.student.guardian[0] : inv.student?.guardian
                      const guardianPhone = guardian?.phone ? guardian.phone.replace(/\D/g, '') : ''
                      const charges = inv.charges || calculateOverdueCharges(Number(inv.amount), inv.due_date, todayStr)

                      const cobrancaMsg = `Olá ${guardian?.name || 'Responsável'}, tudo bem? Aqui é da secretaria da Academia do Gol.\n\nConsta em aberto a mensalidade do atleta *${inv.student?.name}* ref. ao mês *${inv.reference_month}* (venceu em ${inv.due_date?.split('-').reverse().join('/')}, atraso de ${charges.daysOverdue} dias).\n\n• Valor original: ${fmt(inv.amount)}\n• Encargos de mora (multa 2% + juros): ${fmt(charges.fineAmount + charges.interestAmount)}\n• *Total atualizado:* *${fmt(charges.totalSuggested)}*\n\nChave PIX:\n${inv.pix_code || 'pix.academiadogol.com.br'}\n\nCaso já tenha realizado o pagamento ou queira regularizar com a secretaria, por favor nos responda aqui. Obrigado!`

                      return (
                        <tr key={inv.id} className="hover:bg-red-50/40 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-slate-900">
                            {inv.student?.name}
                          </td>

                          <td className="px-5 py-3.5 text-slate-700">
                            <div>{guardian?.name || '—'}</div>
                            {guardian?.phone && (
                              <span className="text-[10px] text-slate-500 font-mono">{guardian.phone}</span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-slate-700 font-mono">
                            <div>Ref: {inv.reference_month}</div>
                            <span className="text-[10px] text-slate-400">
                              Venc: {inv.due_date?.split('-').reverse().join('/')}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                              🔴 {charges.daysOverdue} dias
                            </span>
                          </td>

                          <td className="px-5 py-3.5 font-mono text-slate-600">{fmt(inv.amount)}</td>

                          <td className="px-5 py-3.5 font-mono text-red-600 font-bold">
                            +{fmt(charges.fineAmount + charges.interestAmount)}
                            <div className="text-[9px] text-slate-400 font-normal">
                              (Multa 2% + Juros 0,033%/d)
                            </div>
                          </td>

                          <td className="px-5 py-3.5 font-mono font-bold text-red-700 text-sm">
                            {fmt(charges.totalSuggested)}
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {guardianPhone && (
                                <a
                                  href={`https://wa.me/55${guardianPhone}?text=${encodeURIComponent(cobrancaMsg)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] uppercase tracking-wider inline-flex items-center gap-1.5 transition-all shadow-2xs"
                                >
                                  <Send className="w-3 h-3" /> Cobrar WhatsApp
                                </a>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenPaymentModal(inv)}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded font-bold text-[11px] uppercase tracking-wider inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
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
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-[4px] px-3 py-2">
                <Calendar className="w-4 h-4 text-slate-700" />
                <span className="text-slate-600 text-xs font-bold uppercase">Data do Fechamento:</span>
                <input
                  type="date"
                  defaultValue={targetDate}
                  onChange={handleDateChange}
                  className="bg-transparent text-slate-800 text-xs font-mono font-bold outline-none cursor-pointer"
                />
              </div>
              {targetDate === todayStr && (
                <span className="px-2 py-1 bg-emerald-100 text-[#0D4A1C] text-[10px] font-bold uppercase tracking-wider rounded">
                  Hoje (Em Aberto)
                </span>
              )}
            </div>

            <button
              onClick={handlePrintDailyClosing}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-[4px] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              Imprimir Espelho de Caixa
            </button>
          </div>

          {/* Cards de Conferência da Gaveta & Métodos */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Dinheiro (Espécie na Gaveta) */}
            <div className="card-light p-4 space-y-1.5 border-emerald-300 bg-emerald-50/50">
              <div className="flex items-center justify-between text-emerald-800 font-bold uppercase tracking-wider text-[11px]">
                <span className="flex items-center gap-1">
                  <Banknote className="w-4 h-4 text-emerald-700" /> Dinheiro (Gaveta)
                </span>
              </div>
              <div className="font-bebas text-3xl text-emerald-900 tracking-wider leading-none">
                {fmt(dailyCash.dinheiro)}
              </div>
              <p className="text-[10px] text-emerald-700 font-bold">Conferir notas e moedas</p>
            </div>

            {/* PIX */}
            <div className="card-light p-4 space-y-1.5">
              <div className="flex items-center justify-between text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <span className="flex items-center gap-1">
                  <Zap className="w-4 h-4 text-amber-500" /> PIX Balcão/Online
                </span>
              </div>
              <div className="font-bebas text-3xl text-slate-800 tracking-wider leading-none">
                {fmt(dailyCash.pix)}
              </div>
              <p className="text-[10px] text-slate-400">Entrada em conta</p>
            </div>

            {/* Débito */}
            <div className="card-light p-4 space-y-1.5">
              <div className="flex items-center justify-between text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <span className="flex items-center gap-1">
                  <CreditCard className="w-4 h-4 text-blue-600" /> Cartão Débito
                </span>
              </div>
              <div className="font-bebas text-3xl text-slate-800 tracking-wider leading-none">
                {fmt(dailyCash.debito)}
              </div>
              <p className="text-[10px] text-slate-400">Conferir filipeta máq.</p>
            </div>

            {/* Crédito */}
            <div className="card-light p-4 space-y-1.5">
              <div className="flex items-center justify-between text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <span className="flex items-center gap-1">
                  <CreditCard className="w-4 h-4 text-purple-600" /> Cartão Crédito
                </span>
              </div>
              <div className="font-bebas text-3xl text-slate-800 tracking-wider leading-none">
                {fmt(dailyCash.credito)}
              </div>
              <p className="text-[10px] text-slate-400">Conferir filipeta máq.</p>
            </div>

            {/* Total Geral do Dia */}
            <div className="card-light p-4 space-y-1.5 border-slate-900 bg-slate-900 text-white col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                <span className="flex items-center gap-1">
                  <Wallet className="w-4 h-4 text-white" /> Total do Caixa
                </span>
              </div>
              <div className="font-bebas text-3xl text-white tracking-wider leading-none">
                {fmt(dailyCash.total)}
              </div>
              <p className="text-[10px] text-slate-300">{dailyCash.count} recebimento(s)</p>
            </div>
          </div>

          {/* Tabela de Lançamentos do Dia */}
          <div className="card-light overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bebas text-xl text-slate-900 tracking-wider leading-none flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                Entradas Recebidas em {targetDate.split('-').reverse().join('/')}
              </h3>
              <span className="text-xs text-slate-500 font-bold">
                {dailyCash.items.length} movimentação(ões)
              </span>
            </div>

            {dailyCash.items.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Nenhuma entrada registrada nesta data.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold">
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
                  <tbody className="divide-y divide-slate-100">
                    {dailyCash.items.map((it) => {
                      const timeStr = it.paid_at
                        ? new Date(it.paid_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                        : '—'
                      const method = it.payment_method?.toLowerCase() || 'pix'

                      return (
                        <tr key={it.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3.5 font-mono text-slate-700 font-bold">
                            <Clock className="w-3 h-3 inline mr-1 text-slate-400" />
                            {timeStr}
                          </td>

                          <td className="px-5 py-3.5 font-bold text-slate-900">
                            <div>{it.student?.name}</div>
                            {it.student?.guardian?.[0]?.name && (
                              <div className="text-[10px] text-slate-400 font-normal">
                                Resp: {it.student?.guardian?.[0]?.name}
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-3.5 font-mono text-slate-600">{it.reference_month}</td>

                          <td className="px-5 py-3.5">
                            {(() => {
                              const origin = getPaymentOriginDetails(it.payment_method, it.notes)
                              return (
                                <div className="space-y-1">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border inline-block ${
                                      method === 'dinheiro'
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                        : method.includes('debito')
                                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                                        : method.includes('credito')
                                        ? 'bg-purple-50 text-purple-800 border-purple-200'
                                        : 'bg-amber-50 text-amber-800 border-amber-200'
                                    }`}
                                  >
                                    {method === 'dinheiro'
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

                          <td className="px-5 py-3.5 font-mono font-bold text-slate-900 text-sm">
                            {fmt(it.amount)}
                          </td>

                          <td className="px-5 py-3.5 text-[11px] text-slate-600 max-w-xs">
                            <div className="line-clamp-2" title={it.notes || ''}>
                              {it.notes || 'Sem observações'}
                            </div>
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => setRevertInvoiceId(it.id)}
                              className="px-2 py-1 text-red-600 hover:bg-red-50 rounded border border-red-200 text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 cursor-pointer"
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
                <h3 className="font-bebas text-2xl text-slate-900 tracking-wider leading-none flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-700" />
                  Fechamento Semanal (Últimos 7 Dias)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visão diária de entradas e divisão por modalidade de pagamento.
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Total da Semana</span>
                <div className="font-bebas text-2xl text-indigo-800 tracking-wider leading-none">
                  {fmt(weeklyCash.totalWeek)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {weeklyCash.days.map((day) => (
                <div key={day.date} className="card-light p-3 space-y-2 text-center">
                  <div className="text-xs font-bold text-slate-700 capitalize">{day.label}</div>
                  <div className="font-bebas text-2xl text-slate-900 leading-none">{fmt(day.total)}</div>
                  <div className="space-y-0.5 pt-1 border-t border-slate-100 text-[9px] text-slate-500 text-left font-mono">
                    <div>💵 Din: {fmt(day.dinheiro)}</div>
                    <div>⚡ PIX: {fmt(day.pix)}</div>
                    <div>💳 Cart: {fmt(day.cartao)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Relatório Mensal Consolidado */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bebas text-2xl text-slate-900 tracking-wider leading-none flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#1A6B2E]" />
                  Fechamento Consolidado do Mês ({monthlyCash.month})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Indicadores executivos para prestação de contas à diretoria.
                </p>
              </div>

              <button
                onClick={() => window.print()}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Imprimir Relatório
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Eficiência */}
              <div className="card-light p-5 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Taxa de Arrecadação</div>
                <div className="font-bebas text-4xl text-[#1A6B2E] leading-none">
                  {monthlyCash.collectionRate.toFixed(1)}%
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-[#1A6B2E] h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, monthlyCash.collectionRate)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>Recebido: {fmt(monthlyCash.totalCollected)}</span>
                  <span>Previsto: {fmt(monthlyCash.totalExpected)}</span>
                </div>
              </div>

              {/* Inadimplência do Mês */}
              <div className="card-light p-5 space-y-3 border-amber-200 bg-amber-50/30">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-800">Inadimplência do Mês</div>
                <div className="font-bebas text-4xl text-amber-700 leading-none">
                  {fmt(monthlyCash.totalOverdue)}
                </div>
                <p className="text-xs text-slate-600">
                  Pendências financeiras ativas com vencimento no mês de {monthlyCash.month}.
                </p>
                <button
                  onClick={() => setActiveTab('inadimplentes')}
                  className="text-xs font-bold text-amber-800 hover:underline flex items-center gap-1"
                >
                  Abrir régua de cobrança <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>

              {/* Mix de Pagamentos */}
              <div className="card-light p-5 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Mix de Pagamento (Mês)</div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 font-bold text-slate-700">
                      <Zap className="w-3.5 h-3.5 text-amber-500" /> PIX:
                    </span>
                    <span className="font-mono font-bold">{fmt(monthlyCash.pix)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 font-bold text-slate-700">
                      <Banknote className="w-3.5 h-3.5 text-emerald-600" /> Dinheiro:
                    </span>
                    <span className="font-mono font-bold">{fmt(monthlyCash.dinheiro)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 font-bold text-slate-700">
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
      {modalInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[8px] max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[95vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bebas text-2xl text-slate-900 tracking-wider leading-none flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-[#1A6B2E]" />
                  Registrar Pagamento / Baixa Manual
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Atleta: <span className="font-bold text-slate-800">{modalInvoice.student?.name}</span> | Mês: {modalInvoice.reference_month}
                </p>
              </div>
              <button
                onClick={() => setModalInvoice(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* SEÇÃO: SELEÇÃO DE CANAL (PRESENCIAL OU ONLINE) */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-[6px]">
              <button
                type="button"
                onClick={() => setPaymentMode('presencial')}
                className={`py-2 rounded font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  paymentMode === 'presencial'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-4 h-4 text-[#1A6B2E]" />
                Presencial (No Balcão)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('online')}
                className={`py-2 rounded font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  paymentMode === 'online'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-4 h-4 text-emerald-600" />
                Online (PIX / WhatsApp)
              </button>
            </div>

            {/* SEÇÃO: LÓGICA DE ATRASO (SE VENCIDA) */}
            {(() => {
              const origAmount = Number(modalInvoice.amount)
              const charges = calculateOverdueCharges(origAmount, modalInvoice.due_date, todayStr)
              const isOverdue = charges.daysOverdue > 0

              if (!isOverdue) return null

              return (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-[6px] space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Mensalidade Vencida há {charges.daysOverdue} dias (Venceu em {modalInvoice.due_date?.split('-').reverse().join('/')})
                  </div>

                  <div className="text-xs text-slate-700 bg-white p-3 rounded border border-amber-200 flex justify-between items-center">
                    <div>
                      <span>Original: <strong>{fmt(origAmount)}</strong></span>
                      <span className="mx-2 text-slate-300">|</span>
                      <span>Multa (2%): <strong>{fmt(charges.fineAmount)}</strong></span>
                      <span className="mx-2 text-slate-300">|</span>
                      <span>Juros: <strong>{fmt(charges.interestAmount)}</strong></span>
                    </div>
                    <div className="font-bold text-red-700">
                      Sugerido: {fmt(charges.totalSuggested)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                      <input
                        type="radio"
                        name="overdueOpt"
                        checked={overdueOption === 'standard'}
                        onChange={() => setOverdueOption('standard')}
                        className="text-[#1A6B2E]"
                      />
                      <span>Cobrar com Multa e Juros Padrão ({fmt(charges.totalSuggested)})</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                      <input
                        type="radio"
                        name="overdueOpt"
                        checked={overdueOption === 'waive'}
                        onChange={() => setOverdueOption('waive')}
                        className="text-[#1A6B2E]"
                      />
                      <span>Isentar Encargos (Cobrar valor original de {fmt(origAmount)})</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                      <input
                        type="radio"
                        name="overdueOpt"
                        checked={overdueOption === 'negotiated'}
                        onChange={() => setOverdueOption('negotiated')}
                        className="text-[#1A6B2E]"
                      />
                      <span>Valor Acordado / Negociado com a Diretoria</span>
                    </label>
                  </div>

                  {overdueOption === 'negotiated' && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-amber-200">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 uppercase">Valor Acordado (R$):</label>
                        <input
                          type="number"
                          step="0.01"
                          value={negotiatedAmount}
                          onChange={(e) => setNegotiatedAmount(Number(e.target.value))}
                          className="w-full p-2 border border-slate-300 rounded font-mono font-bold text-xs outline-none bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 uppercase">Autorizado por / Motivo:</label>
                        <input
                          type="text"
                          placeholder="Ex: Autorizado pelo Diretor Vitor"
                          value={negotiationReason}
                          onChange={(e) => setNegotiationReason(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded text-xs outline-none bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* SE MODO PRESENCIAL */}
            {paymentMode === 'presencial' && (
              <div className="space-y-4">
                {/* FORMA DE PAGAMENTO */}
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Forma de Pagamento no Balcão:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('dinheiro')}
                      className={`p-3 rounded border text-center transition-all cursor-pointer ${
                        selectedMethod === 'dinheiro'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Banknote className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                      <span className="text-xs">Dinheiro</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedMethod('pix')}
                      className={`p-3 rounded border text-center transition-all cursor-pointer ${
                        selectedMethod === 'pix'
                          ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Zap className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                      <span className="text-xs">PIX Balcão</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedMethod('cartao_debito')}
                      className={`p-3 rounded border text-center transition-all cursor-pointer ${
                        selectedMethod === 'cartao_debito'
                          ? 'border-blue-500 bg-blue-50 text-blue-900 font-bold'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                      <span className="text-xs">Cartão Débito</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedMethod('cartao_credito')}
                      className={`p-3 rounded border text-center transition-all cursor-pointer ${
                        selectedMethod === 'cartao_credito'
                          ? 'border-purple-500 bg-purple-50 text-purple-900 font-bold'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                      <span className="text-xs">Cartão Crédito</span>
                    </button>
                  </div>
                </div>

                {/* SE DINHEIRO: CALCULADORA DE TROCO */}
                {selectedMethod === 'dinheiro' && (() => {
                  const origAmount = Number(modalInvoice.amount)
                  const charges = calculateOverdueCharges(origAmount, modalInvoice.due_date, todayStr)
                  const toPay =
                    charges.daysOverdue > 0 && overdueOption === 'standard'
                      ? charges.totalSuggested
                      : overdueOption === 'negotiated'
                      ? negotiatedAmount
                      : origAmount

                  const troco = amountTendered > toPay ? amountTendered - toPay : 0

                  return (
                    <div className="p-3.5 bg-emerald-50/70 border border-emerald-300 rounded-[6px] space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold text-emerald-900">
                        <span>Valor a Pagar: <strong>{fmt(toPay)}</strong></span>
                        {amountTendered > 0 && (
                          <span className="text-sm text-emerald-800 bg-white px-2.5 py-1 rounded border border-emerald-300">
                            Troco: <strong>{fmt(troco)}</strong>
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-emerald-900 uppercase">
                          Valor Entregue pelo Cliente (R$):
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Ex: 200,00"
                          value={amountTendered || ''}
                          onChange={(e) => setAmountTendered(Number(e.target.value))}
                          className="w-full p-2 border border-emerald-300 rounded font-mono font-bold text-sm outline-none bg-white text-emerald-950"
                        />
                      </div>
                    </div>
                  )
                })()}

                {/* QUEM RECEBEU & DATA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                      Quem Recebeu (Secretária / Atendente):
                    </label>
                    <input
                      type="text"
                      value={receivedBy}
                      onChange={(e) => setReceivedBy(e.target.value)}
                      placeholder="Nome da secretária"
                      className="w-full p-2 border border-slate-300 rounded text-xs outline-none bg-white font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                      Data e Horário do Pagamento:
                    </label>
                    <input
                      type="datetime-local"
                      value={paidAtDate}
                      onChange={(e) => setPaidAtDate(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded text-xs outline-none bg-white font-mono"
                    />
                  </div>
                </div>

                {/* OBSERVAÇÕES */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                    Observações / Nota Interna:
                  </label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Ex: Pago pelo avô, comprovante Stone terminal 1..."
                    className="w-full p-2 border border-slate-300 rounded text-xs outline-none bg-white"
                  />
                </div>
              </div>
            )}

            {/* SE MODO ONLINE */}
            {paymentMode === 'online' && (() => {
              const guardian = Array.isArray(modalInvoice.student?.guardian) ? modalInvoice.student.guardian[0] : modalInvoice.student?.guardian
              const guardianPhone = guardian?.phone ? guardian.phone.replace(/\D/g, '') : ''
              const origAmount = Number(modalInvoice.amount)
              const charges = calculateOverdueCharges(origAmount, modalInvoice.due_date, todayStr)
              const finalAmount =
                charges.daysOverdue > 0 && overdueOption === 'standard'
                  ? charges.totalSuggested
                  : overdueOption === 'negotiated'
                  ? negotiatedAmount
                  : origAmount

              const whatsappOnlineMsg = `Olá ${guardian?.name || 'Responsável'}, tudo bem? Aqui é da secretaria da Academia do Gol!\n\nSegue o código PIX para o pagamento da mensalidade do atleta *${modalInvoice.student?.name}* ref. ao mês *${modalInvoice.reference_month}* no valor de *${fmt(finalAmount)}*:\n\n*Chave PIX Copia e Cola:*\n${modalInvoice.pix_code || 'pix.academiadogol.com.br'}\n\nAssim que fizer a transferência, por favor nos envie o comprovante por aqui. Obrigado!`

              return (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-[6px] space-y-3">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500" /> Chave PIX Copia e Cola
                    </div>
                    <div className="p-2.5 bg-white border border-slate-200 rounded font-mono text-[11px] text-slate-600 break-all select-all">
                      {modalInvoice.pix_code || 'pix.academiadogol.com.br'}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(modalInvoice.pix_code || 'pix.academiadogol.com.br')
                          alert('Chave PIX copiada para a área de transferência!')
                        }}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-bold text-xs uppercase tracking-wider"
                      >
                        Copiar Chave PIX
                      </button>

                      {guardianPhone && (
                        <a
                          href={`https://wa.me/55${guardianPhone}?text=${encodeURIComponent(whatsappOnlineMsg)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" /> Enviar no WhatsApp ({guardian?.phone})
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
                    💡 <strong>Atenção Secretária:</strong> Antes de confirmar a baixa abaixo, verifique o extrato do banco ou o comprovante enviado pelo responsável.
                  </div>
                </div>
              )
            })()}

            {/* BOTÕES DE AÇÃO DO MODAL */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalInvoice(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmManualPayment}
                disabled={isPending}
                className="px-5 py-2 bg-[#1A6B2E] hover:bg-[#0D4A1C] text-white rounded text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-xs"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-white" />}
                Confirmar Recebimento e Gravar no Caixa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DE ESTORNO DE PAGAMENTO */}
      {/* ======================================================== */}
      {revertInvoiceId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[8px] max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-red-700 font-bold uppercase text-xs">
              <RotateCcw className="w-5 h-5 text-red-600" />
              Estornar Baixa de Pagamento
            </div>
            <p className="text-xs text-slate-600">
              Você está prestes a desfazer a baixa deste pagamento. A fatura voltará a constar como pendente e será removida do total de entradas do caixa.
            </p>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Motivo do Estorno (Obrigatório para auditoria):
              </label>
              <input
                type="text"
                placeholder="Ex: Lançamento duplicado pela secretaria / Erro de digitação"
                value={revertReason}
                onChange={(e) => setRevertReason(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded text-xs outline-none bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setRevertInvoiceId(null)
                  setRevertReason('')
                }}
                className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded text-xs font-bold uppercase"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRevert}
                disabled={isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold uppercase flex items-center gap-1.5"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                Confirmar Estorno
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DA RÉGUA DE WHATSAPP EM LOTE */}
      {/* ======================================================== */}
      {showReguaModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[8px] max-w-2xl w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bebas text-2xl text-slate-900 tracking-wider leading-none flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-[#1A6B2E]" />
                  Régua de Cobrança WhatsApp em 1-Clique
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Mensagens automáticas prontas para envio aos responsáveis pendentes do mês.
                </p>
              </div>
              <button
                onClick={() => setShowReguaModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {pendingInvoices.map((inv) => {
                const guardian = Array.isArray(inv.student?.guardian) ? inv.student.guardian[0] : inv.student?.guardian
                const guardianPhone = guardian?.phone ? guardian.phone.replace(/\D/g, '') : ''
                const msg = `Olá ${guardian?.name || 'Responsável'}, tudo bem? Aqui é da Academia do Gol! Segue o lembrete da mensalidade do atleta *${inv.student?.name}* referente ao mês *${inv.reference_month}* no valor de *${fmt(inv.amount)}* com vencimento em *${inv.due_date?.split('-').reverse().join('/')}*.\n\nChave PIX:\n${inv.pix_code || 'pix.academiadogol.com.br'}\n\nAcesse o Portal do Atleta: https://acadgoli.vercel.app/portal/${inv.student?.portal_token || ''}\n\nObrigado!`

                return (
                  <div key={inv.id} className="p-3 bg-slate-50 rounded border border-slate-200 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{inv.student?.name} (Resp: {guardian?.name})</div>
                      <div className="text-[11px] text-slate-500">
                        {fmt(inv.amount)} • Venc: {inv.due_date?.split('-').reverse().join('/')}
                      </div>
                    </div>

                    {guardianPhone ? (
                      <a
                        href={`https://wa.me/55${guardianPhone}?text=${encodeURIComponent(msg)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-[#1A6B2E] hover:bg-[#0D4A1C] text-white rounded font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1 shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" /> Disparar
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Sem WhatsApp</span>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowReguaModal(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold uppercase tracking-wider"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
