import { DollarSign } from 'lucide-react'
import { getFinanceiroEscolinhaData } from './actions'
import { FinanceiroClient } from './financeiro-client'

interface Props {
  searchParams: Promise<{
    month?: string
    status?: string
    date?: string
    tab?: string
  }>
}

export default async function FinanceiroPage({ searchParams }: Props) {
  const params = await searchParams
  const data = await getFinanceiroEscolinhaData(params.month, params.status, params.date)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-bebas text-3xl sm:text-4xl text-slate-900 tracking-wider leading-none flex items-center gap-2">
          <DollarSign className="w-8 h-8 text-[#1A6B2E]" />
          Financeiro & Controle de Caixa
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Controle de mensalidades, baixa manual com cálculo de juros, conferência de gaveta e relatórios de fechamento.
        </p>
      </div>

      <FinanceiroClient
        invoices={data.invoices}
        stats={data.stats}
        currentMonth={data.targetMonth}
        currentStatus={params.status || 'all'}
        targetDate={data.targetDate}
        todayStr={data.todayStr}
        overdueInvoices={data.overdueInvoices}
        dailyCash={data.dailyCash}
        weeklyCash={data.weeklyCash}
        monthlyCash={data.monthlyCash}
        initialTab={params.tab || 'mensalidades'}
      />
    </div>
  )
}
