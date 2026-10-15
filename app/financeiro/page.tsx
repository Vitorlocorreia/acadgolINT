import { requirePage } from '@/lib/auth/session'
import { hasPermission } from '@/lib/auth/permissions'
export const dynamic = 'force-dynamic'
import { PageHeader } from '@/components/page-header'
import { getFinanceiroEscolinhaData } from './actions'
import { FinanceiroClient } from './financeiro-client'

interface Props {
  searchParams: Promise<{
    month?: string
    status?: string
    date?: string
    tab?: string
    page?: string
    q?: string
    classId?: string
    charge?: string
    due?: string
    sort?: string
  }>
}

export default async function FinanceiroPage({ searchParams }: Props) {
  const {staff}=await requirePage('finance.read');
  const params = await searchParams
  const data = await getFinanceiroEscolinhaData(params.month, params.status, params.date,Number(params.page||1),{q:params.q,classId:params.classId,charge:params.charge,due:params.due,sort:params.sort})

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <PageHeader eyebrow="Gestão financeira" title="Financeiro" description="Acompanhe mensalidades, recebimentos e o fechamento do caixa." />

      <FinanceiroClient
        operatorName={staff.full_name}
        canReverse={hasPermission(staff.role,'finance.reverse')}
        invoices={data.invoices}
        stats={data.stats}
        currentMonth={data.targetMonth}
        currentStatus={data.currentStatus}
        pagination={data.pagination}
        filterCounts={data.filterCounts}
        monthCounts={data.monthCounts}
        filters={data.filters}
        classOptions={data.classOptions}
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
