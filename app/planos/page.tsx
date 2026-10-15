import { requirePage } from '@/lib/auth/session'
import { PageHeader } from '@/components/page-header'
import { getEnrollmentPlans } from './actions'
import { PlansClient } from './plans-client'

export const dynamic = 'force-dynamic'

export default async function PlansPage() {
  await requirePage('plans.read')
  const plans = await getEnrollmentPlans()
  return <div className="page-container space-y-6">
    <PageHeader eyebrow="Gestão da escolinha" title="Planos de matrícula" description="Organize os valores e benefícios oferecidos aos novos atletas." />
    <PlansClient plans={plans} />
  </div>
}
