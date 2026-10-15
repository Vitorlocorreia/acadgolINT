const test = require('node:test'), assert = require('node:assert/strict')
const { loadTS } = require('./support/load-ts.cjs')
const invoiceId = 'd76e3f23-9c3d-4c21-806b-3fcbde8cf2c3'
function scenario({ unauthorized = false, data = { invoice: { id: invoiceId }, events: [], total: 0, nextOffset: null }, error = null } = {}) {
  const calls = [], permissions = []
  const actions = loadTS('app/financeiro/actions.ts', {
    '@/lib/supabase/admin': { createAdminClient: async permission => {
      permissions.push(permission)
      if (unauthorized) throw new Error('Acesso negado')
      return { rpc: async (name, args) => { calls.push({ name, args }); return { data, error } } }
    } },
    'next/cache': { revalidatePath() { throw new Error('History reads cannot mutate financial data') } },
    zod: require('zod'), './calc': {}, 'node:crypto': require('node:crypto'),
    '@/lib/finance/payment-parts': loadTS('lib/finance/payment-parts.ts'),
    '@/lib/finance/payment-proof': loadTS('lib/finance/payment-proof.ts'),
  })
  return { actions, calls, permissions }
}
test('financial history checks the financial permission before any database lookup', async () => {
  const run = scenario({ unauthorized: true })
  await assert.rejects(run.actions.getInvoiceHistoryAction(invoiceId), /Acesso negado/)
  assert.deepEqual(run.permissions, ['finance.read'])
  assert.equal(run.calls.length, 0)
})
test('invalid invoice identifiers and unbounded history pages cannot reach the database', async () => {
  for (const [id, offset] of [['wrong', 0], [invoiceId, -1], [invoiceId, 1.5], [invoiceId, NaN], [invoiceId, 100001]]) {
    const run = scenario()
    assert.ok((await run.actions.getInvoiceHistoryAction(id, offset)).error)
    assert.equal(run.calls.length, 0)
  }
})
test('history uses the guarded projection and a bounded page without accepting client operator identity', async () => {
  const data = { invoice: { id: invoiceId }, events: [{ id: 'payment:1', actor: { name: 'Maria', source: 'snapshot' }, receivedAmount: 100 }], total: 40, nextOffset: 30 }
  const run = scenario({ data })
  const result = await run.actions.getInvoiceHistoryAction(invoiceId, 0)
  assert.equal(result.history, data)
  assert.equal(result.error, '')
  assert.deepEqual(run.calls.map(call => call.name), ['invoice_financial_history'])
  assert.equal(run.calls[0].args.p_invoice, invoiceId)
  assert.equal(run.calls[0].args.p_offset, 0)
  assert.equal(run.calls[0].args.p_limit, 30)
  assert.equal(Object.keys(run.calls[0].args).length, 3)
})
test('lookup failures and missing history never look like an empty successful financial timeline', async () => {
  for (const options of [{ error: { message: 'Denied' } }, { data: null }, { data: {} }]) {
    const run = scenario(options)
    const result = await run.actions.getInvoiceHistoryAction(invoiceId)
    assert.equal(result.history, null)
    assert.ok(result.error)
  }
})
