export interface HistoryActor {
  name?: string
  username?: string
  role?: string
  source: 'snapshot' | 'current_profile' | 'unverified' | 'system'
}

interface HistoryEventBase { id: string; recordedAt: string; actor: HistoryActor }
export interface HistoryCreated extends HistoryEventBase {
  type: 'created'
  originalAmount: number
  dueDate: string
  detailsSource: 'snapshot' | 'current_invoice'
}
export interface HistoryPayment extends HistoryEventBase {
  type: 'payment'
  paymentId: string
  paidAt: string
  legacy: boolean
  originalAmount: number
  receivedAmount: number
  discountAmount: number
  fineAmount: number
  interestAmount: number
  method: string
  parts: { method: string; amount: number }[]
  notes: string | null
  reason: string | null
  reversed: boolean
  proof: { paymentId: string; name: string; mime: string; size: number } | null
}
export interface HistoryReversal extends HistoryEventBase {
  type: 'reversal'
  paymentId: string
  receivedAmount: number
  reason: string
}
export type InvoiceHistoryEvent = HistoryCreated | HistoryPayment | HistoryReversal
export interface InvoiceHistoryPage {
  invoice: { id: string; studentName: string | null; referenceMonth: string; chargeType: string; status: string; amount: number; paidAmount: number | null }
  events: InvoiceHistoryEvent[]
  total: number
  nextOffset: number | null
}
