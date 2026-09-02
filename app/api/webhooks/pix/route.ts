import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createAdminClient()

    // O webhook pode receber o ID da fatura ou student_id
    const invoiceId = body.invoice_id || body.id || body.external_reference
    const amountPaid = body.amount || body.value

    if (!invoiceId) {
      return NextResponse.json({ error: 'invoice_id é obrigatório.' }, { status: 400 })
    }

    const { data: updated, error } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_method: 'pix',
      })
      .eq('id', invoiceId)
      .select('id, student_id, amount')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Mensalidade baixada automaticamente via PIX!',
      invoice: updated,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
