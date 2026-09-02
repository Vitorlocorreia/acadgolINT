'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  PlusCircle,
  Loader2,
  Filter,
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
      <div className="card-dark p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded px-3 py-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span className="text-zinc-400 text-xs font-bold uppercase">Mês de Referência:</span>
            <input
              type="month"
              defaultValue={currentMonth}
              onChange={handleMonthChange}
              className="bg-transparent text-white text-xs font-mono font-bold outline-none cursor-pointer"
            />
          </div>
        </div>

        <button
          onClick={handleGenerateInvoices}
          disabled={isPending}
          className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-[4px] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border border-zinc-700"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />}
          Gerar Mensalidades do Mês
        </button>
      </div>

      {feedback && (
        <div className={`p-3 rounded-[4px] text-xs font-bold flex items-center gap-2 border ${
          feedback.type === 'success'
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/15 border-red-500/30 text-red-400'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-dark p-4 space-y-2">
          <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Total Previsto</span>
          <div className="font-bebas text-3xl text-white tracking-wider leading-none">{fmt(stats.total)}</div>
          <p className="text-[10px] text-zinc-500">{invoices.length} mensalidades</p>
        </div>

        <div className="card-dark p-4 space-y-2 border-emerald-500/30 bg-emerald-500/5">
          <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Total Recebido</span>
          <div className="font-bebas text-3xl text-emerald-400 tracking-wider leading-none">{fmt(stats.collected)}</div>
          <p className="text-[10px] text-emerald-400/80 font-bold">{collectionPct.toFixed(1)}% arrecadado</p>
        </div>

        <div className="card-dark p-4 space-y-2">
          <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Pendente (No Prazo)</span>
          <div className="font-bebas text-3xl text-zinc-200 tracking-wider leading-none">{fmt(stats.pending)}</div>
          <p className="text-[10px] text-zinc-500">A vencer no mês</p>
        </div>

        <div className="card-dark p-4 space-y-2 border-amber-500/30 bg-amber-500/5">
          <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">Em Atraso (Cobrar)</span>
          <div className="font-bebas text-3xl text-amber-400 tracking-wider leading-none">{fmt(stats.overdue)}</div>
          <p className="text-[10px] text-amber-400 font-bold">Inadimplência ativa</p>
        </div>
      </div>

      {/* Filtros de Status */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleStatusFilter('all')}
          className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
            currentStatus === 'all'
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
          }`}
        >
          Todas ({invoices.length})
        </button>
        <button
          onClick={() => handleStatusFilter('pending')}
          className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
            currentStatus === 'pending'
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
          }`}
        >
          Pendentes
        </button>
        <button
          onClick={() => handleStatusFilter('paid')}
          className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
            currentStatus === 'paid'
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
          }`}
        >
          Pagas
        </button>
      </div>

      {/* Tabela de Mensalidades */}
      {invoices.length === 0 ? (
        <div className="card-dark py-16 text-center space-y-2">
          <DollarSign className="w-12 h-12 text-zinc-600 mx-auto" />
          <p className="text-sm font-bold text-zinc-300">Nenhuma mensalidade encontrada para o período.</p>
          <p className="text-xs text-zinc-500">Clique em "Gerar Mensalidades do Mês" para emitir as cobranças dos alunos ativos.</p>
        </div>
      ) : (
        <div className="card-dark overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-5 py-3.5">Atleta / Aluno</th>
                  <th className="px-5 py-3.5">Responsável</th>
                  <th className="px-5 py-3.5">Vencimento</th>
                  <th className="px-5 py-3.5">Valor</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Ações de Cobrança</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {invoices.map((inv) => {
                  const isPaid = inv.status === 'paid'
                  const guardian = Array.isArray(inv.student?.guardian) ? inv.student.guardian[0] : inv.student?.guardian
                  const guardianPhone = guardian?.phone ? guardian.phone.replace(/\D/g, '') : ''

                  const whatsappMessage = `Olá ${guardian?.name || 'Responsável'}, tudo bem? Aqui é da Academia do Gol! Segue a mensalidade do atleta *${inv.student?.name}* referente ao mês *${inv.reference_month}* no valor de *${fmt(inv.amount)}* com vencimento em *${inv.due_date?.split('-').reverse().join('/')}*.\n\nChave PIX:\n${inv.pix_code || 'pix.academiadogol.com.br'}\n\nQualquer dúvida estamos à disposição!`

                  return (
                    <tr key={inv.id} className="hover:bg-zinc-900/50 transition-colors">
                      {/* Atleta */}
                      <td className="px-5 py-3.5 font-bold text-white">
                        {inv.student?.name || 'Aluno'}
                      </td>

                      {/* Responsável */}
                      <td className="px-5 py-3.5 text-zinc-300">
                        {guardian?.name || '—'}
                        {guardian?.phone && (
                          <span className="block text-[10px] text-zinc-500 font-mono">{guardian.phone}</span>
                        )}
                      </td>

                      {/* Vencimento */}
                      <td className="px-5 py-3.5 font-mono text-zinc-300">
                        {inv.due_date?.split('-').reverse().join('/')}
                      </td>

                      {/* Valor */}
                      <td className="px-5 py-3.5 font-mono font-bold text-white">
                        {fmt(inv.amount)}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-[2px] text-[10px] font-bold uppercase tracking-wider border ${
                          isPaid
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
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
                              className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded font-bold text-[11px] uppercase tracking-wider inline-flex items-center gap-1 transition-all"
                            >
                              <Send className="w-3 h-3" /> WhatsApp
                            </a>
                          )}

                          {!isPaid ? (
                            <button
                              type="button"
                              onClick={() => handleMarkPaid(inv.id)}
                              disabled={isPending}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-[11px] uppercase tracking-wider rounded inline-flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Check className="w-3 h-3" /> Dar Baixa
                            </button>
                          ) : (
                            <span className="text-[11px] text-zinc-500 font-mono">
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
