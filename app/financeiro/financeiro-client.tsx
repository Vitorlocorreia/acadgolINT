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

  const collectionPct = stats.total > 0 ? (stats.collected / stats.total) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Barra Superior: Seletor de Mês + Gerar Faturas */}
      <div className="card-light p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-[6px] px-3 py-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span className="text-slate-600 text-xs font-bold uppercase">Mês de Referência:</span>
            <input
              type="month"
              defaultValue={currentMonth}
              onChange={handleMonthChange}
              className="bg-transparent text-slate-800 text-xs font-mono font-bold outline-none cursor-pointer"
            />
          </div>
        </div>

        <button
          onClick={handleGenerateInvoices}
          disabled={isPending}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[6px] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5 text-white" />}
          Gerar Mensalidades do Mês
        </button>
      </div>

      {feedback && (
        <div className={`p-3 rounded-[6px] text-xs font-bold flex items-center gap-2 border ${
          feedback.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
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

        <div className="card-light p-4 space-y-2 border-emerald-200 bg-emerald-50/40">
          <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider">Total Recebido</span>
          <div className="font-bebas text-3xl text-emerald-700 tracking-wider leading-none">{fmt(stats.collected)}</div>
          <p className="text-[10px] text-emerald-700 font-bold">{collectionPct.toFixed(1)}% arrecadado</p>
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
          className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
            currentStatus === 'all'
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Todas ({invoices.length})
        </button>
        <button
          onClick={() => handleStatusFilter('pending')}
          className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
            currentStatus === 'pending'
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Pendentes
        </button>
        <button
          onClick={() => handleStatusFilter('paid')}
          className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
            currentStatus === 'paid'
              ? 'bg-emerald-600 text-white border-emerald-600'
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

                  const whatsappMessage = `Olá ${guardian?.name || 'Responsável'}, tudo bem? Aqui é da Academia do Gol! Segue a mensalidade do atleta *${inv.student?.name}* referente ao mês *${inv.reference_month}* no valor de *${fmt(inv.amount)}* com vencimento em *${inv.due_date?.split('-').reverse().join('/')}*.\n\nChave PIX:\n${inv.pix_code || 'pix.academiadogol.com.br'}\n\nQualquer dúvida estamos à disposição!`

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
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
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
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-bold text-[11px] uppercase tracking-wider inline-flex items-center gap-1 transition-all"
                            >
                              <Send className="w-3 h-3" /> WhatsApp
                            </a>
                          )}

                          {!isPaid ? (
                            <button
                              type="button"
                              onClick={() => handleMarkPaid(inv.id)}
                              disabled={isPending}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] uppercase tracking-wider rounded inline-flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                            >
                              <Check className="w-3 h-3" /> Dar Baixa
                            </button>
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
    </div>
  )
}
