import { WhatsAppClient } from './whatsapp-client'

export const metadata = {
  title: 'Central WhatsApp Automático | Academia do Gol',
  description: 'Gestão de disparos automáticos e conexão com o WhatsApp oficial da Academia do Gol.',
}

export default function WhatsAppPage() {
  return <WhatsAppClient />
}
