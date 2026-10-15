import { requirePage } from '@/lib/auth/session'
import { WhatsAppClient } from './whatsapp-client'

export const metadata = {
  title: 'Central WhatsApp Automático | Escolinha do Sport',
  description: 'Gestão de disparos automáticos e conexão com o WhatsApp oficial da Escolinha do Sport.',
}

export default async function WhatsAppPage() {
  await requirePage('communications.manage');
  return <WhatsAppClient />
}
