// Retorna data formatada no fuso de Brasília (YYYY-MM-DD)
export function getBrDateStr(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d).split('/')
  return `${parts[2]}-${parts[1]}-${parts[0]}`
}

export interface OverdueCalculation {
  daysOverdue: number
  fineAmount: number
  interestAmount: number
  totalSuggested: number
}

export function calculateOverdueCharges(amount: number, dueDateStr: string, asOfDateStr?: string): OverdueCalculation {
  const todayStr = asOfDateStr || getBrDateStr()
  const due = new Date(`${dueDateStr}T12:00:00Z`)
  const today = new Date(`${todayStr}T12:00:00Z`)

  const diffTime = today.getTime() - due.getTime()
  const daysOverdue = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))

  if (daysOverdue <= 0) {
    return {
      daysOverdue: 0,
      fineAmount: 0,
      interestAmount: 0,
      totalSuggested: amount,
    }
  }

  // Multa padrão de 2%
  const fineAmount = Math.round(amount * 0.02 * 100) / 100
  // Juros de mora de 1% ao mês (~0,033% ao dia)
  const interestAmount = Math.round(amount * 0.000333 * daysOverdue * 100) / 100
  const totalSuggested = Math.round((amount + fineAmount + interestAmount) * 100) / 100

  return {
    daysOverdue,
    fineAmount,
    interestAmount,
    totalSuggested,
  }
}

export function getPaymentOriginDetails(paymentMethod: string | null, notes: string | null) {
  const method = (paymentMethod || '').toLowerCase()
  const n = (notes || '').toUpperCase()

  if (method === 'pix_portal' || n.includes('[PORTAL DO PAI]') || n.includes('PORTAL DO RESPONSÁVEL')) {
    return {
      channel: 'portal',
      label: '📱 Portal do Pai',
      sublabel: 'PIX Automático / Webhook',
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    }
  }

  if (method === 'pix_whatsapp' || n.includes('[BAIXA ONLINE') || n.includes('WHATSAPP')) {
    return {
      channel: 'online_whatsapp',
      label: '💬 WhatsApp / Secretaria',
      sublabel: 'Baixa manual conferida',
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    }
  }

  return {
    channel: 'presencial',
    label: '🏢 Balcão Presencial',
    sublabel: 'Baixa pessoalmente na recepção',
    color: 'bg-slate-100 text-slate-800 border-slate-200',
  }
}
