'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function getFinanceiroEscolinhaData(referenceMonth?: string, statusFilter?: string) {
  const supabase = createAdminClient()

  const now = new Date()
  const targetMonth = referenceMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  let query = supabase
    .from('invoices')
    .select(`
      *,
      student:students(
        id, name, status,
        guardian:guardians(name, phone, email)
      )
    `)
    .eq('reference_month', targetMonth)
    .order('due_date', { ascending: true })

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const { data: invoices, error } = await query

  if (error) {
    console.error('Erro ao buscar financeiro da escolinha:', error)
    return {
      invoices: [],
      stats: { total: 0, collected: 0, pending: 0, overdue: 0 },
      targetMonth,
    }
  }

  const list = invoices ?? []

  let total = 0
  let collected = 0
  let pending = 0
  let overdue = 0

  const todayIso = now.toISOString().slice(0, 10)

  list.forEach((inv) => {
    const val = Number(inv.amount)
    total += val
    if (inv.status === 'paid') {
      collected += val
    } else if (inv.due_date < todayIso || inv.status === 'overdue') {
      overdue += val
    } else {
      pending += val
    }
  })

  return {
    invoices: list,
    stats: { total, collected, pending, overdue },
    targetMonth,
  }
}

export async function markInvoiceAsPaidAction(invoiceId: string, paymentMethod: string = 'pix') {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      payment_method: paymentMethod,
      paid_at: new Date().toISOString(),
    })
    .eq('id', invoiceId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/financeiro')
  revalidatePath('/dashboard')
  return { success: true }
}

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
        status: 'pending',
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
