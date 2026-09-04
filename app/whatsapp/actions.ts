'use server'

import {
  sendEvolutionWhatsApp,
  getEvolutionInstanceStatus,
  getEvolutionQRCode,
  disconnectEvolutionWhatsApp,
} from '@/lib/whatsapp/evolution'

export async function checkWhatsAppStatusAction() {
  return await getEvolutionInstanceStatus()
}

export async function getWhatsAppQRCodeAction() {
  return await getEvolutionQRCode()
}

export async function disconnectWhatsAppAction() {
  return await disconnectEvolutionWhatsApp()
}

export async function sendTestWhatsAppAction(phone: string, text: string) {
  if (!phone || !text) {
    return { success: false, error: 'Telefone e mensagem são obrigatórios.' }
  }

  const res = await sendEvolutionWhatsApp({ phone, message: text })
  return res
}
