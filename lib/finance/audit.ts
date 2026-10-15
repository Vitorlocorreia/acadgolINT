import type { HistoryActor } from './invoice-history'

export interface FinancialAuditFilters {
  start: string
  end: string
  action: 'all' | 'created' | 'payment' | 'reversal' | 'discount'
  student: string
  actor: string
}
export interface FinancialAuditEntry {
  id: string
  invoice_id: string
  event_type: 'created' | 'payment' | 'reversal'
  recorded_at: string
  actor: HistoryActor
  student_name: string | null
  reference_month: string
  charge_type: string
  agreed_amount: number
  received_amount: number | null
  discount_amount: number
  paid_at: string | null
  payment_method: string | null
  payment_parts: { method: string; amount: number }[]
  notes: string | null
  reason: string | null
  payment_id: string | null
  proof_name: string | null
  reversed: boolean
  legacy: boolean
  due_date: string
  details_source: string | null
}
export interface FinancialAuditPage {
  entries: FinancialAuditEntry[]
  total: number
  nextOffset: number | null
}
