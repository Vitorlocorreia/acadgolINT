import { requirePage } from '@/lib/auth/session'
import { getTeam } from './actions'
import { TeamClient } from './team-client'
import { PageHeader } from '@/components/page-header'
export default async function TeamPage() {
  await requirePage('staff.coaches.manage');
  const data = await getTeam()
  return <div className="page-container space-y-6"><PageHeader eyebrow="Cada pessoa, seu acesso" title="Equipe e acessos" description="Crie contas, ajuste os perfis e proteja o acesso da equipe." /><TeamClient {...data} /></div>
}
