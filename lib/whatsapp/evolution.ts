import 'server-only'
import QRCode from 'qrcode'

type Configuration = { url: string; key: string; instance: string }
export interface EvolutionStatus {
  connected: boolean
  configured: boolean
  state: string
  error?: string
  ownerNumber?: string
  profileName?: string
  profilePictureUrl?: string
}
class EvolutionError extends Error {
  constructor(message: string, readonly state = 'offline') { super(message) }
}
function configuration(): Configuration {
  const url = process.env.EVOLUTION_API_URL?.trim()
  const key = process.env.EVOLUTION_API_KEY?.trim()
  if (!url || !key) throw new EvolutionError('O serviço de WhatsApp ainda não foi configurado. O administrador precisa configurar o endereço do serviço e a chave de acesso no servidor.', 'not_configured')
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error()
  } catch { throw new EvolutionError('O endereço configurado para o serviço de WhatsApp é inválido. Peça ao administrador para conferir a configuração.', 'invalid_config') }
  return { url: url.replace(/\/+$/, ''), key, instance: process.env.EVOLUTION_INSTANCE_NAME?.trim() || 'sport-escolinha' }
}
function statusError(status: number): EvolutionError {
  if (status >= 200 && status < 300) return new EvolutionError('O serviço de WhatsApp não confirmou a operação. Tente novamente.')
  if (status === 401 || status === 403) return new EvolutionError('A chave de acesso do serviço de WhatsApp foi recusada. Confira a configuração no servidor.', 'unauthorized')
  if (status === 404) return new EvolutionError('A conexão da escolinha não foi encontrada no serviço de WhatsApp. Confira o endereço e a instância configurados.', 'not_found')
  if (status === 429) return new EvolutionError('O serviço de WhatsApp está ocupado. Aguarde um pouco e tente novamente.', 'busy')
  if (status >= 400 && status < 500) return new EvolutionError('O serviço recusou a solicitação. Confira o número e a configuração antes de tentar novamente.', 'rejected')
  return new EvolutionError('O serviço de WhatsApp não respondeu corretamente (HTTP ' + status + '). Tente novamente.')
}
function failure(error: unknown) {
  if (error instanceof EvolutionError) return { state: error.state, error: error.message }
  return { state: 'offline', error: 'Não foi possível alcançar o serviço de WhatsApp. Confira se a VPS e o endereço de conexão estão disponíveis.' }
}
async function request(config: Configuration, path: string, init: RequestInit = {}, timeout = 10000) {
  const response = await fetch(config.url + path, {
    ...init, headers: { 'Content-Type': 'application/json', apikey: config.key },
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(timeout),
  })
  const data = await response.json().catch(() => null)
  return { response, data }
}
function phoneNumber(phone: string) {
  let number = phone.replace(/\D/g, '')
  if (number.length === 10 || number.length === 11) number = '55' + number
  if (number.length < 12 || number.length > 15) throw new EvolutionError('Informe um WhatsApp válido com DDD.', 'invalid_input')
  return number
}
const instancePath = (config: Configuration) => encodeURIComponent(config.instance)

export async function getEvolutionInstanceStatus(): Promise<EvolutionStatus> {
  try {
    const config = configuration()
    const { response, data } = await request(config, '/instance/fetchInstances?instanceName=' + instancePath(config))
    if (!response.ok) throw statusError(response.status)
    const instances = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : null
    if (!instances) throw new EvolutionError('O endereço respondeu, mas a resposta não corresponde à Evolution API. Confira o endereço configurado.', 'invalid_config')
    const item = instances.find((value: any) => (value.name || value.instance?.instanceName || value.instanceName) === config.instance)
    if (!item) return { connected: false, configured: true, state: 'not_found', error: 'A conexão da escolinha ainda não existe neste serviço. Gere um QR Code para criá-la.' }
    const info = item.instance || item
    const rawState = item.connectionStatus || info.connectionStatus || info.state || info.status || 'close'
    const state = typeof rawState === 'string' ? rawState : rawState.state || 'close'
    const owner = item.ownerJid || info.ownerJid || info.owner
    return {
      connected: state === 'open', configured: true, state,
      ownerNumber: typeof owner === 'string' ? owner.split('@')[0].replace(/\D/g, '') : undefined,
      profileName: item.profileName || info.profileName || undefined,
      profilePictureUrl: item.profilePicUrl || info.profilePictureUrl || undefined,
    }
  } catch (error) {
    const problem = failure(error)
    return { connected: false, configured: !['not_configured', 'invalid_config'].includes(problem.state), ...problem }
  }
}

async function qrImage(data: any): Promise<{ base64: string; pairingCode?: string } | null> {
  const value = data?.qrcode || data?.data?.qrcode || data?.data || data
  const image = typeof value?.base64 === 'string' ? value.base64.trim() : ''
  if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(image)) return { base64: image, pairingCode: value.pairingCode }
  if (image && /^[A-Za-z0-9+/=\r\n]+$/.test(image)) return { base64: 'data:image/png;base64,' + image.replace(/[\r\n]/g, ''), pairingCode: value.pairingCode }
  const code = typeof value?.code === 'string' ? value.code : typeof value === 'string' ? value : ''
  if (code && code.length <= 8192) return { base64: await QRCode.toDataURL(code, { width: 320, margin: 2, errorCorrectionLevel: 'M' }), pairingCode: value?.pairingCode }
  return null
}

export async function getEvolutionQRCode(): Promise<{ base64?: string; pairingCode?: string; connected?: boolean; retryable?: boolean; state?: string; error?: string }> {
  try {
    const config = configuration()
    const status = await getEvolutionInstanceStatus()
    if (status.connected) return { connected: true, state: 'open' }
    if (!status.configured || !['close', 'closed', 'connecting', 'disconnected', 'not_found'].includes(status.state)) return { state: status.state, error: status.error || 'Confira a conexão do serviço antes de gerar o QR Code.' }
    if (status.state === 'not_found') {
      const created = await request(config, '/instance/create', {
        method: 'POST', body: JSON.stringify({ instanceName: config.instance, qrcode: true, integration: 'WHATSAPP-BAILEYS' }),
      }, 20000)
      if (!created.response.ok) {
        const message = String(created.data?.response?.message || created.data?.message || '')
        const alreadyExists = created.response.status === 409 || ([400, 403].includes(created.response.status) && /already (in use|exists)|já existe|já está em uso/i.test(message))
        if (!alreadyExists) throw statusError(created.response.status)
      } else {
        const qr = await qrImage(created.data)
        if (qr) return { ...qr, state: 'connecting' }
      }
    }
    const connected = await request(config, '/instance/connect/' + instancePath(config), {}, 12000)
    if (!connected.response.ok) throw statusError(connected.response.status)
    if (connected.data?.instance?.state === 'open' || connected.data?.state === 'open') return { connected: true, state: 'open' }
    if (connected.data?.error) throw new EvolutionError('O serviço não conseguiu iniciar o pareamento. Confira a instância configurada e tente novamente.')
    const qr = await qrImage(connected.data)
    return qr ? { ...qr, state: 'connecting' } : { state: 'connecting', retryable: true, error: 'O serviço ainda está preparando o QR Code. Aguarde alguns segundos e clique em Gerar QR Code novamente.' }
  } catch (error) { return failure(error) }
}

export async function disconnectEvolutionWhatsApp(): Promise<{ success: boolean; error?: string }> {
  try {
    const config = configuration()
    const result = await request(config, '/instance/logout/' + instancePath(config), { method: 'DELETE' })
    if (!result.response.ok || result.data?.error) throw statusError(result.response.status)
    return { success: true }
  } catch (error) { return { success: false, error: failure(error).error } }
}

export async function sendEvolutionWhatsApp({ phone, message }: { phone: string; message: string }): Promise<{ success: boolean; messageId?: string; error?: string; uncertain?: boolean }> {
  try {
    const config = configuration()
    const number = phoneNumber(phone)
    const { response, data } = await request(config, '/message/sendText/' + instancePath(config), {
      method: 'POST', body: JSON.stringify({ number, text: message, options: { delay: 1200, presence: 'composing' } }),
    }, 10000)
    if (!response.ok || data?.error) throw statusError(response.status)
    if (!data?.key?.id) throw new EvolutionError('O serviço não confirmou o identificador do envio. Confira a conversa antes de reenviar.')
    return { success: true, messageId: data?.key?.id }
  } catch (error) { return { success: false, error: failure(error).error, uncertain: !(error instanceof EvolutionError) || error.state === 'offline' } }
}

export async function sendEvolutionWhatsAppMedia({ phone, media, mimetype = 'image/jpeg', caption, fileName = 'convocacao-sport.jpg', fallbackToText = true }: {
  phone: string; media: string; mimetype?: string; caption: string; fileName?: string; fallbackToText?: boolean
}): Promise<{ success: boolean; messageId?: string; error?: string; uncertain?: boolean }> {
  try {
    const config = configuration()
    const number = phoneNumber(phone)
    const { response, data } = await request(config, '/message/sendMedia/' + instancePath(config), {
      method: 'POST', body: JSON.stringify({ number, mediatype: 'image', mimetype, media: media.includes('base64,') ? media.split('base64,')[1] : media, caption, fileName, options: { delay: 1200, presence: 'composing' } }),
    }, 15000)
    if (!response.ok || data?.error) throw statusError(response.status)
    if (!data?.key?.id) throw new EvolutionError('O serviço não confirmou o identificador do envio. Confira a conversa antes de reenviar.')
    return { success: true, messageId: data?.key?.id }
  } catch (error) {
    const uncertain = !(error instanceof EvolutionError) || error.state === 'offline'
    if (fallbackToText && !uncertain) return sendEvolutionWhatsApp({ phone, message: caption })
    return { success: false, error: failure(error).error, uncertain }
  }
}
