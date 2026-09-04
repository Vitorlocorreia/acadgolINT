// Evolution API Client v2 - Academia do Gol
// Suporta envio 100% automático de WhatsApp sem custo de mensagem

const EVOLUTION_URL =
  process.env.EVOLUTION_API_URL || 'https://extras-identified-frontier-toys.trycloudflare.com'
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || 'acadgol_evolution_secret_2026'
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || 'academiadogol'

export async function sendEvolutionWhatsApp({
  phone,
  message,
}: {
  phone: string
  message: string
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Sanitiza o telefone (adiciona DDI 55 se necessário)
    let cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length <= 11) {
      cleanPhone = `55${cleanPhone}`
    }

    const res = await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: EVOLUTION_KEY,
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: message,
        options: {
          delay: 1200,
          presence: 'composing',
        },
      }),
      // Timeout curto para não travar a requisição se o servidor estiver offline
      signal: AbortSignal.timeout(6000),
    })

    if (!res.ok) {
      const errText = await res.text()
      return { success: false, error: `Evolution API HTTP ${res.status}: ${errText}` }
    }

    const data = await res.json()
    return { success: true, messageId: data?.key?.id }
  } catch (err: any) {
    console.warn('Evolution API indisponível ou offline:', err.message)
    return { success: false, error: err.message }
  }
}

// Verifica status da conexão do WhatsApp e dados do aparelho
export async function getEvolutionInstanceStatus(): Promise<{
  connected: boolean
  state: string
  ownerNumber?: string
  profileName?: string
  profilePictureUrl?: string
}> {
  try {
    const res = await fetch(`${EVOLUTION_URL}/instance/fetchInstances`, {
      headers: { apikey: EVOLUTION_KEY },
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    })

    if (!res.ok) {
      return { connected: false, state: 'disconnected' }
    }

    const instances = await res.json()
    const inst = Array.isArray(instances)
      ? instances.find((i: any) => i.name === INSTANCE_NAME)
      : null

    if (!inst) {
      return { connected: false, state: 'disconnected' }
    }

    const state = inst.connectionStatus || 'disconnected'
    const cleanNumber = inst.ownerJid
      ? inst.ownerJid.replace('@s.whatsapp.net', '')
      : undefined

    return {
      connected: state === 'open',
      state,
      ownerNumber: cleanNumber,
      profileName: inst.profileName || undefined,
      profilePictureUrl: inst.profilePicUrl || undefined,
    }
  } catch {
    return { connected: false, state: 'offline' }
  }
}

// Desconecta o aparelho da Evolution API
export async function disconnectEvolutionWhatsApp(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const res = await fetch(`${EVOLUTION_URL}/instance/logout/${INSTANCE_NAME}`, {
      method: 'DELETE',
      headers: { apikey: EVOLUTION_KEY },
    })

    if (!res.ok) {
      // Se logout der erro, tenta delete para forçar reset limpo
      await fetch(`${EVOLUTION_URL}/instance/delete/${INSTANCE_NAME}`, {
        method: 'DELETE',
        headers: { apikey: EVOLUTION_KEY },
      })
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// Gera o QR Code para conexão
export async function getEvolutionQRCode(): Promise<{
  pairingCode?: string
  code?: string
  base64?: string
  error?: string
}> {
  try {
    // Cria a instância caso ela não exista
    await fetch(`${EVOLUTION_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: EVOLUTION_KEY,
      },
      body: JSON.stringify({
        instanceName: INSTANCE_NAME,
        token: EVOLUTION_KEY,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
      signal: AbortSignal.timeout(5000),
    }).catch(() => {})

    // Pega o QR Code de conexão
    const res = await fetch(`${EVOLUTION_URL}/instance/connect/${INSTANCE_NAME}`, {
      headers: { apikey: EVOLUTION_KEY },
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return { error: 'Não foi possível gerar QR Code. Verifique a Evolution API.' }
    }

    const data = await res.json()
    return {
      base64: data?.base64,
      code: data?.code,
      pairingCode: data?.pairingCode,
    }
  } catch (err: any) {
    return { error: err.message }
  }
}
