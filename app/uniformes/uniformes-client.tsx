'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shirt,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Package,
} from 'lucide-react'
import { updateUniformStockAction } from './actions'

interface Props {
  inventory: any[]
}

function fmt(val: number) {
  return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function UniformesClient({ inventory }: Props) {
  const [isPending, startTransition] = useTransition()
  const items=inventory
  const router=useRouter()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleStockChange = (id: string, currentQty: number, delta: number) => {
    setFeedback(null)
    startTransition(async () => {
      try {
        const result = await updateUniformStockAction(id, delta)
        if (result.success) {
          router.refresh()
          setFeedback({ type: 'success', message: 'Estoque atualizado.' })
        } else setFeedback({ type: 'error', message: 'Não foi possível atualizar o estoque. Tente novamente.' })
      } catch { setFeedback({ type: 'error', message: 'A atualização não foi concluída. Tente novamente.' }) }
    })
  }

  const totalPieces = items.reduce((acc, i) => acc + (i.quantity || 0), 0)
  const lowStockItems = items.filter((i) => i.quantity <= i.min_threshold)

  return (
    <div className="space-y-6">
      {feedback && <div role={feedback.type === 'error' ? 'alert' : 'status'} className={`notice ${feedback.type === 'success' ? 'notice-success' : 'notice-error'}`}>{feedback.message}</div>}
      {/* KPI Cards de Estoque */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-light p-5 space-y-2">
          <span className="text-xs font-bold tracking-normal text-[var(--text-muted)]">Total em Estoque</span>
          <div className="stat-number  text-[var(--text-primary)] leading-tight tracking-tight">
            {totalPieces} <span className="text-sm font-sans text-[var(--text-muted)] font-bold">peças/kits</span>
          </div>
          <p className="text-xs text-[#c81930] font-semibold">Disponíveis para pronta entrega</p>
        </div>

        <div className={`card-light p-5 space-y-2 ${
          lowStockItems.length > 0 ? 'border-amber-200 bg-amber-50/30' : ''
        }`}>
          <span className="text-xs font-bold tracking-normal text-[var(--text-muted)]">Alerta de Reposição</span>
          <div className="stat-number  text-amber-700 leading-tight tracking-tight">
            {lowStockItems.length}
          </div>
          <p className="text-xs text-[var(--text-secondary)] font-medium">Tamanhos abaixo do estoque mínimo</p>
        </div>

        <div className="card-light p-5 space-y-2">
          <span className="text-xs font-bold tracking-normal text-[var(--text-muted)]">Tamanhos Cadastrados</span>
          <div className="stat-number  text-[var(--text-primary)] leading-tight tracking-tight">
            {items.length}
          </div>
          <p className="text-xs text-[var(--text-muted)]">Itens disponíveis para controle</p>
        </div>
      </div>

      {/* Grid de Tamanhos com Botões Rápidos */}
      <div className="card-light overflow-hidden">
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h2 className="section-title  text-[var(--text-primary)] tracking-tight leading-tight flex items-center gap-2">
            <Shirt className="w-5 h-5 text-[#c81930]" />
            Estoque por tamanho
          </h2>
          <span className="text-xs text-[var(--text-muted)] font-mono">Entrada ou saída de uma peça</span>
        </div>

        {items.length === 0 ? <div className="empty-state"><Package size={36} /><strong>Nenhum uniforme cadastrado</strong><p>Cadastre o primeiro item para acompanhar os tamanhos e as reposições.</p></div> : <div className="overflow-x-auto">
          <table className="data-table mobile-data-table">
            <thead className="bg-[var(--bg-card-hover)] border-b border-[var(--border-color)] text-[var(--text-secondary)]  tracking-normal font-bold">
              <tr>
                <th className="px-5 py-3.5">Item / Descrição</th>
                <th className="px-5 py-3.5">Tamanho</th>
                <th className="px-5 py-3.5">Preço Venda</th>
                <th className="px-5 py-3.5 text-center">Estoque Atual</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Ajuste Rápido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {items.map((item) => {
                const isLow = item.quantity <= item.min_threshold
                const isOut = item.quantity === 0

                return (
                  <tr key={item.id} className="hover:bg-[var(--bg-card-hover)]/80 transition-colors">
                    <td data-label="Item / Descrição" className="px-5 py-3.5 font-bold text-[var(--text-primary)]">
                      {item.item_name}
                    </td>

                    <td data-label="Tamanho" className="px-5 py-3.5 font-mono font-bold text-[var(--text-primary)] text-sm">
                      Tam {item.size}
                    </td>

                    <td data-label="Preço Venda" className="px-5 py-3.5 font-mono text-[var(--text-secondary)] font-bold">
                      {fmt(item.unit_price)}
                    </td>

                    <td data-label="Estoque Atual" className="px-5 py-3.5 text-center font-mono font-bold text-lg text-[var(--text-primary)]">
                      {item.quantity}
                    </td>

                    <td data-label="Status" className="px-5 py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold tracking-normal border ${
                        isOut
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : isLow
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-[#C8E6C9] text-[#a71327] border-[#c81930]/20'
                      }`}>
                        {isOut ? 'Esgotado' : isLow ? 'Estoque Baixo' : 'Disponível'}
                      </span>
                    </td>

                    <td data-label="Ajuste Rápido" className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button aria-label="Dar saída de 1 peça"
                          onClick={() => handleStockChange(item.id, item.quantity, -1)}
                          disabled={item.quantity === 0 || isPending}
                          className="button w-11 h-11 rounded bg-[var(--bg-subtle)] hover:bg-red-50 hover:text-red-700 border border-[var(--border-color)] flex items-center justify-center font-bold text-[var(--text-secondary)] transition-all cursor-pointer disabled:opacity-30"
                          title="Dar saída de 1 peça"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <button aria-label="Adicionar 1 peça"
                          onClick={() => handleStockChange(item.id, item.quantity, 1)}
                          disabled={isPending}
                          className="button w-11 h-11 rounded bg-[var(--bg-subtle)] hover:bg-[var(--success-bg)] hover:text-[var(--success)] border border-[var(--border-color)] flex items-center justify-center font-bold text-[var(--text-secondary)] transition-all cursor-pointer"
                          title="Adicionar 1 peça"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>}
      </div>
    </div>
  )
}
