import { notFound } from 'next/navigation'
import { getCallupDetails } from '@/app/jogos/actions'
import { ConvocacaoClient } from './convocacao-client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ConvocacaoPage({ params }: Props) {
  const { id } = await params
  const data = await getCallupDetails(id)

  if (!data || !data.callup) {
    notFound()
  }

  return <ConvocacaoClient callup={data.callup} evaluation={data.evaluation} />
}
