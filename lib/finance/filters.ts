export const financeStatuses = ['all', 'pending', 'paid', 'unconfirmed', 'overdue'] as const
export interface FinanceFilters {
  q: string; classId: string; charge: string; due: string; sort: string
}
export const defaultFinanceFilters: FinanceFilters = { q: '', classId: 'all', charge: 'all', due: 'all', sort: 'name' }
export function normalizeFinanceFilters(input: Partial<FinanceFilters> = {}): FinanceFilters {
  const classId = String(input.classId || '')
  return {
    q: String(input.q || '').trim().replace(/\s+/g, ' ').slice(0, 120),
    classId: ['all','unassigned'].includes(classId) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(classId) ? classId : 'all',
    charge: ['monthly','registration'].includes(input.charge || '') ? input.charge! : 'all',
    due: ['first','middle','last'].includes(input.due || '') ? input.due! : 'all',
    sort: ['due_date','amount_desc'].includes(input.sort || '') ? input.sort! : 'name',
  }
}
export function financeHref(context: { month: string; status: string; date: string; tab: string; page?: number }, filters: FinanceFilters) {
  const params = new URLSearchParams({ month: context.month, status: context.status, date: context.date, tab: context.tab })
  for (const [key,value] of Object.entries(filters)) if (value && value !== 'all' && !(key === 'sort' && value === 'name')) params.set(key,value)
  if (context.page && context.page > 1) params.set('page',String(context.page))
  return `/financeiro?${params}`
}
