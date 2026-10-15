const test = require('node:test'), assert = require('node:assert/strict')
const { loadTS } = require('./support/load-ts.cjs')
const filters = { start: '2026-10-01', end: '2026-10-31', action: 'all', student: '', actor: '' }
function scenario({ unauthorized = false, data = { entries: [], total: 0, nextOffset: null }, error = null } = {}) {
  const calls = [], permissions = []
  const actions = loadTS('app/financeiro/actions.ts', {
    '@/lib/supabase/admin': { createAdminClient: async permission => {
      permissions.push(permission)
      if (unauthorized) throw new Error('Acesso negado')
      return { rpc: async (name, args) => { calls.push({ name, args }); return { data, error } } }
    } },
    'next/cache': { revalidatePath() { throw new Error('Audit reads cannot mutate data') } },
    zod: require('zod'), './calc': {}, 'node:crypto': require('node:crypto'),
    '@/lib/finance/filters':loadTS('lib/finance/filters.ts'),'@/lib/finance/payment-parts': loadTS('lib/finance/payment-parts.ts'),
    '@/lib/finance/payment-proof': loadTS('lib/finance/payment-proof.ts'),
  })
  return { actions, calls, permissions }
}
test('the audit tab requires financial permission before reading any log', async () => {
  const run = scenario({ unauthorized: true })
  await assert.rejects(run.actions.getFinancialAuditAction(filters), /Acesso negado/)
  assert.deepEqual(run.permissions, ['finance.read'])
  assert.equal(run.calls.length, 0)
})
test('invalid calendar dates, reversed ranges and unbounded audit filters fail before querying', async () => {
  for (const patch of [{ start: '2026-02-30' }, { start: '2026-11-01' }, { action: 'delete' }, { student: 'x'.repeat(121) }, { actor: null }]) {
    const run = scenario()
    assert.ok((await run.actions.getFinancialAuditAction({ ...filters, ...patch })).error)
    assert.equal(run.calls.length, 0)
  }
  const run = scenario()
  assert.ok((await run.actions.getFinancialAuditAction(filters, -1)).error)
  assert.equal(run.calls.length, 0)
})
test('audit filters reach only the guarded projection, and clearing dates queries the full history', async () => {
  const run = scenario()
  assert.equal((await run.actions.getFinancialAuditAction({ ...filters, start: '', end: '', actor: '  Maria  ', student: '  Lucas  ', action: 'discount' }, 30)).error, '')
  assert.equal(run.calls[0].name, 'financial_audit_log')
  const args = run.calls[0].args
  assert.equal(args.p_start, null)
  assert.equal(args.p_end, null)
  assert.equal(args.p_actor, 'Maria')
  assert.equal(args.p_student, 'Lucas')
  assert.equal(args.p_action, 'discount')
  assert.equal(args.p_offset, 30)
  assert.equal(args.p_limit, 30)
})
test('audit failures cannot look like a successfully loaded empty list', async () => {
  for (const options of [{ error: { message: 'Denied' } }, { data: null }, { data: {} }]) {
    const run = scenario(options)
    const result = await run.actions.getFinancialAuditAction(filters)
    assert.equal(result.audit, null)
    assert.ok(result.error)
  }
})
