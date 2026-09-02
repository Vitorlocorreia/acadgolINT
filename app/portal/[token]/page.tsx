import { notFound } from 'next/navigation'
import { getStudentPortalData } from '../actions'
import { PortalClient } from './portal-client'

interface Props {
  params: Promise<{ token: string }>
}

export default async function StudentPortalPage({ params }: Props) {
  const { token } = await params
  const data = await getStudentPortalData(token)

  if (!data) {
    notFound()
  }

  return <PortalClient data={data} />
}
