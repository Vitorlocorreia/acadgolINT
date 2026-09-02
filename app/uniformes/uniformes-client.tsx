'use client'

import { useState, useTransition } from 'react'
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
  const [items, setItems] = useState<any[]>(inventory)

  const handleStockChange = (id: string, currentQty: number, delta: number) => {
    const next = Math.max(0, currentQty + delta)
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, quantity: next } : item)))

    startTransition(async () => {
      await updateUniformStockAction(id, next)
    })
  }

  const totalPieces = items.reduce((acc, i) => acc + (i.quantity || 0), 0)
  const lowStockItems = items.filter((i) => i.quantity <= i.min_threshold)

  return (
    <div className="space-y-6">
      {/* KPI Cards de Estoque */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-light p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total em Estoque</span>
          <div className="font-bebas text-4xl text-slate-900 leading-none tracking-wider">
            {totalPieces} <span className="text-sm font-sans text-slate-400 font-bold">peças/kits</span>
          </div>
          <p className="text-[11px] text-[#1A6B2E] font-semibold">Disponíveis para pronta entrega</p>
        </div>

        <div className={`card-light p-5 space-y-2 ${
          lowStockItems.length > 0 ? 'border-amber-200 bg-amber-50/30' : ''
        }`}>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Alerta de Reposição</span>
          <div className="font-bebas text-4xl text-amber-700 leading-none tracking-wider">
            {lowStockItems.length}
          </div>
          <p className="text-[11px] text-slate-600 font-medium">Tamanhos abaixo do estoque mínimo</p>
        </div>

        <div className="card-light p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tamanhos Cadastrados</span>
          <div className="font-bebas text-4xl text-slate-900 leading-none tracking-wider">
            {items.length}
          </div>
          <p className="text-[11px] text-slate-500">Do Tam 04 Infantil ao G Adulto</p>
        </div>
      </div>

      {/* Grid de Tamanhos com Botões Rápidos */}
      <div className="card-light overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bebas text-2xl text-slate-900 tracking-wider leading-none flex items-center gap-2">
            <Shirt className="w-5 h-5 text-[#1A6B2E]" />
            Grade de Uniformes & Kits de Matrícula
          </h2>
          <span className="text-xs text-slate-500 font-mono">Ajuste instantâneo de estoque</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold">
              <tr>
                <th className="px-5 py-3.5">Item / Descrição</th>
                <th className="px-5 py-3.5">Tamanho</th>
                <th className="px-5 py-3.5">Preço Venda</th>
                <th className="px-5 py-3.5 text-center">Estoque Atual</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Ajuste Rápido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const isLow = item.quantity <= item.min_threshold
                const isOut = item.quantity === 0

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      {item.item_name}
                    </td>

                    <td className="px-5 py-3.5 font-mono font-bold text-slate-800 text-sm">
                      Tam {item.size}
                    </td>

                    <td className="px-5 py-3.5 font-mono text-slate-700 font-bold">
                      {fmt(item.unit_price)}
                    </td>

                    <td className="px-5 py-3.5 text-center font-mono font-bold text-lg text-slate-900">
                      {item.quantity}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        isOut
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : isLow
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-[#C8E6C9] text-[#0D4A1C] border-[#1A6B2E]/20'
                      }`}>
                        {isOut ? 'Esgotado' : isLow ? 'Estoque Baixo' : 'Disponível'}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleStockChange(item.id, item.quantity, -1)}
                          disabled={item.quantity === 0 || isPending}
                          className="w-8 h-8 rounded bg-slate-100 hover:bg-red-50 hover:text-red-700 border border-slate-200 flex items-center justify-center font-bold text-slate-700 transition-all cursor-pointer disabled:opacity-30"
                          title="Dar saída de 1 peça"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleStockChange(item.id, item.quantity, 1)}
                          disabled={isPending}
                          className="w-8 h-8 rounded bg-slate-100 hover:bg-[#C8E6C9] hover:text-[#0D4A1C] border border-slate-200 flex items-center justify-center font-bold text-slate-700 transition-all cursor-pointer"
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
        </div>
      </div>
    </div>
  )
}
