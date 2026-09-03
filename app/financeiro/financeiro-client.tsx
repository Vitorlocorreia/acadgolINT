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
} from 'lucide-react'
import { markInvoiceAsPaidAction, generateMonthlyInvoicesAction } from './actions'

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
}

function fmt(val: number) {
  return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function FinanceiroClient({
  invoices,
  stats,
  currentMonth,
  currentStatus,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [showReguaModal, setShowReguaModal] = useState(false)

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    router.push(`/financeiro?month=${e.target.value}&status=${currentStatus}`)
  }

  const handleStatusFilter = (status: string) => {
    router.push(`/financeiro?month=${currentMonth}&status=${status}`)
  }

  const handleMarkPaid = (invoiceId: string) => {
    setFeedback(null)
    startTransition(async () => {
      const res = await markInvoiceAsPaidAction(invoiceId, 'pix')
      if (res.success) {
        setFeedback({ type: 'success', message: 'Pagamento confirmado e registrado no caixa!' })
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erro ao dar baixa.' })
      }
    })
  }

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

  // Simulação de Webhook do PIX
  const handleSimulateWebhook = async (invoiceId: string) => {
    setFeedback(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/webhooks/pix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoice_id: invoiceId, amount: 180.00 }),
        })
        const data = await res.json()
        if (data.success) {
          setFeedback({ type: 'success', message: '⚡ Webhook PIX recebido: Baixa instantânea confirmada no sistema!' })
          router.refresh()
        } else {
          setFeedback({ type: 'error', message: 'Falha no webhook: ' + data.error })
        }
      } catch (err: any) {
        setFeedback({ type: 'error', message: 'Erro na chamada do webhook.' })
      }
    })
  }

  const collectionPct = stats.total > 0 ? (stats.collected / stats.total) * 100 : 0
  const pendingInvoices = invoices.filter((i) => i.status === 'pending' || i.status === 'overdue')

  return (
    <div className="space-y-6">
      {/* Barra Superior: Seletor de Mês + Régua WhatsApp + Gerar Faturas */}
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
              className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-[#0D4A1C] border border-[#1A6B2E]/30 rounded-[4px] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <Smartphone className="w-4 h-4 text-[#1A6B2E]" />
              Régua WhatsApp ({pendingInvoices.length})
            </button>
          )}

          <button
            onClick={handleGenerateInvoices}
            disabled={isPending}
            className="px-4 py-2.5 bg-[#1A6B2E] hover:bg-[#0D4A1C] text-white rounded-[4px] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5 text-white" />}
            Gerar Mensalidades do Mês
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-3 rounded-[4px] text-xs font-bold flex items-center gap-2 border ${
          feedback.type === 'success'
            ? 'bg-[#C8E6C9]/50 border-[#1A6B2E]/30 text-[#0D4A1C]'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-[#1A6B2E]" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-light p-4 space-y-2">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Previsto</span>
          <div className="font-bebas text-3xl text-slate-900 tracking-wider leading-none">{fmt(stats.total)}</div>
          <p className="text-[10px] text-slate-400">{invoices.length} mensalidades</p>
        </div>

        <div className="card-light p-4 space-y-2 border-[#1A6B2E]/30 bg-[#C8E6C9]/20">
          <span className="text-xs text-[#0D4A1C] font-bold uppercase tracking-wider">Total Recebido</span>
          <div className="font-bebas text-3xl text-[#1A6B2E] tracking-wider leading-none">{fmt(stats.collected)}</div>
          <p className="text-[10px] text-[#0D4A1C] font-bold">{collectionPct.toFixed(1)}% arrecadado</p>
        </div>

        <div className="card-light p-4 space-y-2">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Pendente (No Prazo)</span>
          <div className="font-bebas text-3xl text-slate-700 tracking-wider leading-none">{fmt(stats.pending)}</div>
          <p className="text-[10px] text-slate-400">A vencer no mês</p>
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
          <p className="text-xs text-slate-500">Clique em "Gerar Mensalidades do Mês" para emitir as cobranças dos alunos ativos.</p>
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
                  <th className="px-5 py-3.5 text-right">Ações de Cobrança</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => {
                  const isPaid = inv.status === 'paid'
                  const guardian = Array.isArray(inv.student?.guardian) ? inv.student.guardian[0] : inv.student?.guardian
                  const guardianPhone = guardian?.phone ? guardian.phone.replace(/\D/g, '') : ''

                  const whatsappMessage = `Olá ${guardian?.name || 'Responsável'}, tudo bem? Aqui é da Academia do Gol! Segue a mensalidade do atleta *${inv.student?.name}* referente ao mês *${inv.reference_month}* no valor de *${fmt(inv.amount)}* com vencimento em *${inv.due_date?.split('-').reverse().join('/')}*.\n\nChave PIX:\n${inv.pix_code || 'pix.academiadogol.com.br'}\n\nVocê também pode acessar o Portal do Atleta para acompanhar frequência e mensalidades: https://acadgoli.vercel.app/portal/${inv.student?.portal_token || ''}\n\nObrigado!`

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Atleta */}
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {inv.student?.name || 'Aluno'}
                      </td>

                      {/* Responsável */}
                      <td className="px-5 py-3.5 text-slate-700">
                        {guardian?.name || '—'}
                        {guardian?.phone && (
                          <span className="block text-[10px] text-slate-500 font-mono">{guardian.phone}</span>
                        )}
                      </td>

                      {/* Vencimento */}
                      <td className="px-5 py-3.5 font-mono text-slate-700">
                        {inv.due_date?.split('-').reverse().join('/')}
                      </td>

                      {/* Valor */}
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                        {fmt(inv.amount)}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          isPaid
                            ? 'bg-[#C8E6C9] text-[#0D4A1C] border-[#1A6B2E]/20'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isPaid ? 'Pago' : 'Pendente'}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isPaid && guardianPhone && (
                            <a
                              href={`https://wa.me/55${guardianPhone}?text=${encodeURIComponent(whatsappMessage)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-[#1A6B2E]/10 hover:bg-[#1A6B2E]/20 text-[#0D4A1C] border border-[#1A6B2E]/30 rounded font-bold text-[11px] uppercase tracking-wider inline-flex items-center gap-1 transition-all"
                            >
                              <Send className="w-3 h-3" /> WhatsApp
                            </a>
                          )}

                          {!isPaid ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleMarkPaid(inv.id)}
                                disabled={isPending}
                                className="px-3 py-1.5 bg-[#1A6B2E] hover:bg-[#0D4A1C] text-white font-bold text-[11px] uppercase tracking-wider rounded inline-flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                              >
                                <Check className="w-3 h-3" /> Dar Baixa
                              </button>
                              <button
                                type="button"
                                title="Simular baixa automática via PIX Webhook"
                                onClick={() => handleSimulateWebhook(inv.id)}
                                disabled={isPending}
                                className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded transition-all cursor-pointer"
                              >
                                <Zap className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-mono">
                              Pago via {inv.payment_method || 'PIX'}
                            </span>
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

      {/* Modal da Régua de WhatsApp em Lote */}
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
                  Mensagens automáticas prontas para envio aos responsáveis pendentes.
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
