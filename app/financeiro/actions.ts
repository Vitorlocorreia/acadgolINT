'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

import { getBrDateStr, calculateOverdueCharges, type OverdueCalculation } from './calc'

export interface ManualPaymentPayload {
  invoiceId: string
  paymentMethod: string
  paymentChannel?: 'presencial' | 'online_whatsapp' | 'portal'
  receivedBy: string
  receivedAmount: number
  originalAmount: number
  fineAmount?: number
  interestAmount?: number
  discountAmount?: number
  amountTendered?: number
  changeGiven?: number
  notes?: string
  paidAt?: string
  isOverdueSettlement?: boolean
  negotiationReason?: string
}

export async function getFinanceiroEscolinhaData(
  referenceMonth?: string,
  statusFilter?: string,
  closingDate?: string
) {
  const supabase = createAdminClient()
  const todayStr = getBrDateStr()
  const targetDate = closingDate || todayStr

  const now = new Date()
  const targetMonth = referenceMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // 1. Faturas do mês selecionado
  let monthQuery = supabase
    .from('invoices')
    .select(`
      *,
      student:students(
        id, name, status, portal_token,
        guardian:guardians(name, phone, email)
      )
    `)
    .eq('reference_month', targetMonth)
    .order('due_date', { ascending: true })

  if (statusFilter && statusFilter !== 'all') {
    monthQuery = monthQuery.eq('status', statusFilter)
  }

  const { data: monthInvoices, error: monthError } = await monthQuery

  if (monthError) {
    console.error('Erro ao buscar financeiro do mês:', monthError)
  }

  const list = monthInvoices ?? []

  let total = 0
  let collected = 0
  let pending = 0
  let overdue = 0

  list.forEach((inv) => {
    const val = Number(inv.amount)
    total += val
    if (inv.status === 'paid') {
      collected += val
    } else if (inv.due_date < todayStr || inv.status === 'overdue') {
      overdue += val
    } else {
      pending += val
    }
  })

  // 2. Busca TODAS as faturas inadimplentes (qualquer mês)
  const { data: allPendingOrOverdue } = await supabase
    .from('invoices')
    .select(`
      *,
      student:students(
        id, name, status, portal_token,
        guardian:guardians(name, phone, email)
      )
    `)
    .in('status', ['pending', 'overdue'])
    .lt('due_date', todayStr)
    .order('due_date', { ascending: true })

  const overdueInvoices = (allPendingOrOverdue ?? []).map((inv) => {
    const charges = calculateOverdueCharges(Number(inv.amount), inv.due_date, todayStr)
    return {
      ...inv,
      charges,
    }
  })

  // 3. Fechamento de Caixa do Dia Selecionado (targetDate)
  const startIso = `${targetDate}T00:00:00-03:00`
  const endIso = `${targetDate}T23:59:59-03:00`

  const { data: dailyPaid } = await supabase
    .from('invoices')
    .select(`
      *,
      student:students(
        id, name, status,
        guardian:guardians(name, phone)
      )
    `)
    .eq('status', 'paid')
    .gte('paid_at', new Date(startIso).toISOString())
    .lte('paid_at', new Date(endIso).toISOString())
    .order('paid_at', { ascending: false })

  const dailyItems = dailyPaid ?? []

  let dailyDinheiro = 0
  let dailyPix = 0
  let dailyDebito = 0
  let dailyCredito = 0

  dailyItems.forEach((item) => {
    const amt = Number(item.amount)
    const method = item.payment_method?.toLowerCase() || 'pix'
    if (method === 'dinheiro') dailyDinheiro += amt
    else if (method.includes('debito')) dailyDebito += amt
    else if (method.includes('credito')) dailyCredito += amt
    else dailyPix += amt
  })

  const dailyTotal = dailyDinheiro + dailyPix + dailyDebito + dailyCredito

  // 4. Fechamento Semanal (Últimos 7 dias até targetDate)
  const past7Days: { date: string; label: string; total: number; dinheiro: number; pix: number; cartao: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(`${targetDate}T12:00:00Z`)
    d.setDate(d.getDate() - i)
    const dStr = getBrDateStr(d)
    const dayLabel = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
    past7Days.push({
      date: dStr,
      label: dayLabel,
      total: 0,
      dinheiro: 0,
      pix: 0,
      cartao: 0,
    })
  }

  const weekStartIso = `${past7Days[0].date}T00:00:00-03:00`
  const { data: weekPaid } = await supabase
    .from('invoices')
    .select('amount, payment_method, paid_at')
    .eq('status', 'paid')
    .gte('paid_at', new Date(weekStartIso).toISOString())
    .lte('paid_at', new Date(endIso).toISOString())

  ;(weekPaid ?? []).forEach((inv) => {
    if (!inv.paid_at) return
    const invDateStr = getBrDateStr(inv.paid_at)
    const dayBucket = past7Days.find((d) => d.date === invDateStr)
    if (dayBucket) {
      const amt = Number(inv.amount)
      dayBucket.total += amt
      const method = inv.payment_method?.toLowerCase() || 'pix'
      if (method === 'dinheiro') dayBucket.dinheiro += amt
      else if (method.includes('cartao') || method.includes('debito') || method.includes('credito')) dayBucket.cartao += amt
      else dayBucket.pix += amt
    }
  })

  // 5. Relatório Mensal Consolidado do targetMonth
  const { data: monthPaidAll } = await supabase
    .from('invoices')
    .select('amount, payment_method')
    .eq('reference_month', targetMonth)
    .eq('status', 'paid')

  let monthDinheiro = 0
  let monthPix = 0
  let monthCartao = 0

  ;(monthPaidAll ?? []).forEach((inv) => {
    const amt = Number(inv.amount)
    const method = inv.payment_method?.toLowerCase() || 'pix'
    if (method === 'dinheiro') monthDinheiro += amt
    else if (method.includes('cartao') || method.includes('debito') || method.includes('credito')) monthCartao += amt
    else monthPix += amt
  })

  return {
    invoices: list,
    stats: { total, collected, pending, overdue },
    targetMonth,
    targetDate,
    todayStr,
    overdueInvoices,
    dailyCash: {
      date: targetDate,
      total: dailyTotal,
      dinheiro: dailyDinheiro,
      pix: dailyPix,
      debito: dailyDebito,
      credito: dailyCredito,
      count: dailyItems.length,
      items: dailyItems,
    },
    weeklyCash: {
      days: past7Days,
      totalWeek: past7Days.reduce((acc, d) => acc + d.total, 0),
    },
    monthlyCash: {
      month: targetMonth,
      totalExpected: total,
      totalCollected: collected,
      totalPending: pending,
      totalOverdue: overdue,
      collectionRate: total > 0 ? (collected / total) * 100 : 0,
      dinheiro: monthDinheiro,
      pix: monthPix,
      cartao: monthCartao,
    },
  }
}

// Ação de baixa manual completa e auditada
export async function markInvoiceManualPaidAction(payload: ManualPaymentPayload) {
  const supabase = createAdminClient()

  const {
    invoiceId,
    paymentMethod,
    paymentChannel = 'presencial',
    receivedBy,
    receivedAmount,
    originalAmount,
    fineAmount = 0,
    interestAmount = 0,
    discountAmount = 0,
    amountTendered,
    changeGiven,
    notes = '',
    paidAt,
    isOverdueSettlement = false,
    negotiationReason = '',
  } = payload

  const channelTag =
    paymentChannel === 'portal'
      ? '[PORTAL DO PAI]'
      : paymentChannel === 'online_whatsapp'
      ? '[BAIXA ONLINE - SECRETARIA]'
      : '[BAIXA PRESENCIAL NO BALCÃO - SECRETARIA]'

  // Constrói a nota de auditoria transparente
  const parts: string[] = [
    channelTag,
    `Recebido por: ${receivedBy || 'Secretaria'}`,
    `Forma: ${paymentMethod.toUpperCase()}`,
    `Original: R$ ${originalAmount.toFixed(2)}`,
  ]

  if (fineAmount > 0 || interestAmount > 0) {
    parts.push(`Encargos/Juros: R$ ${(fineAmount + interestAmount).toFixed(2)}`)
  }

  if (discountAmount > 0) {
    parts.push(`Desconto concedido: R$ ${discountAmount.toFixed(2)}`)
  }

  parts.push(`Total Recebido: R$ ${receivedAmount.toFixed(2)}`)

  if (paymentMethod === 'dinheiro' && amountTendered) {
    parts.push(`Valor Entregue: R$ ${amountTendered.toFixed(2)} (Troco: R$ ${(changeGiven || 0).toFixed(2)})`)
  }

  if (isOverdueSettlement && negotiationReason) {
    parts.push(`Motivo/Acordo: ${negotiationReason}`)
  }

  if (notes && notes.trim().length > 0) {
    parts.push(`Obs: ${notes.trim()}`)
  }

  const auditNote = parts.join(' | ')
  const timestamp = paidAt ? new Date(paidAt).toISOString() : new Date().toISOString()

  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      payment_method: paymentMethod,
      amount: receivedAmount,
      paid_at: timestamp,
      notes: auditNote,
    })
    .eq('id', invoiceId)

  if (error) {
    console.error('Erro ao registrar baixa manual:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/financeiro')
  revalidatePath('/dashboard')
  revalidatePath('/alunos')
  return { success: true }
}

// Ação rápida legada (mantida para compatibilidade)
export async function markInvoiceAsPaidAction(invoiceId: string, paymentMethod: string = 'pix') {
  return markInvoiceManualPaidAction({
    invoiceId,
    paymentMethod: paymentMethod as any,
    receivedBy: 'Secretaria (Baixa Rápida)',
    receivedAmount: 0,
    originalAmount: 0,
  })
}

// Ação de estorno/cancelamento de baixa (caso a secretária tenha errado)
export async function revertInvoicePaymentAction(invoiceId: string, reason: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'pending',
      paid_at: null,
      payment_method: null,
      notes: `[ESTORNO EM ${getBrDateStr()}]: ${reason || 'Estorno solicitado pela secretaria'}`,
    })
    .eq('id', invoiceId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/financeiro')
  revalidatePath('/dashboard')
  revalidatePath('/alunos')
  return { success: true }
}

// Geração de mensalidades em lote
export async function generateMonthlyInvoicesAction(referenceMonth: string) {
  const supabase = createAdminClient()

  // 1. Busca todas as matrículas ativas
  const { data: enrollments, error: enrollError } = await supabase
    .from('enrollments')
    .select('*, student:students(id, name, status)')
    .eq('status', 'active')

  if (enrollError || !enrollments) {
    return { success: false, error: 'Falha ao buscar matrículas ativas.' }
  }

  const activeEnrollments = enrollments.filter((e) => e.student?.status === 'active')

  // 2. Para cada aluno, verifica se já existe fatura para o mês
  const { data: existingInvoices } = await supabase
    .from('invoices')
    .select('student_id')
    .eq('reference_month', referenceMonth)

  const existingStudentIds = new Set((existingInvoices ?? []).map((i) => i.student_id))

  const newInvoices = activeEnrollments
    .filter((e) => !existingStudentIds.has(e.student_id))
    .map((e) => {
      const [y, m] = referenceMonth.split('-')
      const dueDay = String(e.due_day || 10).padStart(2, '0')
      const dueDate = `${y}-${m}-${dueDay}`

      return {
        enrollment_id: e.id,
        student_id: e.student_id,
        reference_month: referenceMonth,
        due_date: dueDate,
        amount: e.monthly_fee,
        status: 'pending' as const,
        pix_code: `00020101021226830014br.gov.bcb.pix2561pix.academiadogol.com.br/mensalidade/${e.student_id}5204000053039865405${Number(e.monthly_fee).toFixed(2)}5802BR5916Academia do Gol6009Recife62070503***6304`,
      }
    })

  if (newInvoices.length > 0) {
    const { error: insertError } = await supabase.from('invoices').insert(newInvoices)
    if (insertError) {
      return { success: false, error: insertError.message }
    }
  }

  revalidatePath('/financeiro')
  revalidatePath('/dashboard')
  return { success: true, count: newInvoices.length }
}
