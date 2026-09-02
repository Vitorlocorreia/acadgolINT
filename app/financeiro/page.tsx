import { DollarSign } from 'lucide-react'
import { getFinanceiroEscolinhaData } from './actions'
import { FinanceiroClient } from './financeiro-client'

interface Props {
  searchParams: Promise<{
    month?: string
    status?: string
  }>
}

export default async function FinanceiroPage({ searchParams }: Props) {
  const params = await searchParams
  const data = await getFinanceiroEscolinhaData(params.month, params.status)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-bebas text-3xl sm:text-4xl text-slate-900 tracking-wider leading-none flex items-center gap-2">
          <DollarSign className="w-8 h-8 text-[#1A6B2E]" />
          Financeiro & Mensalidades
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Controle de pagamentos, cobrança recorrente, régua de WhatsApp e baixas de caixa.
        </p>
      </div>

      <FinanceiroClient
        invoices={data.invoices}
        stats={data.stats}
        currentMonth={data.targetMonth}
        currentStatus={params.status || 'all'}
      />
    </div>
  )
}
