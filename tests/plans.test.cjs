const test = require('node:test'), assert = require('node:assert/strict')
const { loadTS } = require('./support/load-ts.cjs')
const valid = { name: 'Mensal 2x', price: 180.50, registration_fee: 50, frequency_per_week: 2, duration_months: 1, sibling_discount_percent: 10, includes_uniform: false, is_active: true }
const planId = 'd76e3f23-9c3d-4c21-806b-3fcbde8cf2c3'

function scenario({ error = null, found = true, unauthorized = false } = {}) {
  const writes = [], refreshes = [], permissions = []
  const query = {
    eq(field, value) { writes.push({ filter: { field, value } }); return this },
    select() { return this },
    maybeSingle: async () => ({ data: found ? { id: planId } : null, error }),
  }
  const actions = loadTS('app/planos/actions.ts', {
    zod: require('zod'),
    'next/cache': { revalidatePath: path => refreshes.push(path) },
    '@/lib/supabase/admin': { createAdminClient: async permission => {
      permissions.push(permission)
      if (unauthorized) throw new Error('Acesso negado')
      return { from: table => {
        assert.equal(table, 'plans')
        return { insert: values => { writes.push({ insert: values }); return query }, update: values => { writes.push({ update: values }); return query } }
      } }
    } },
  })
  return { actions, writes, refreshes, permissions }
}

test('plan catalog writes require office permission even when called outside the screen', async () => {
  const run = scenario({ unauthorized: true })
  await assert.rejects(run.actions.saveEnrollmentPlanAction(valid), /Acesso negado/)
  assert.deepEqual(run.permissions, ['plans.write'])
  assert.equal(run.writes.length, 0)
})

test('plan creation rejects invalid amounts, benefits and durations before any write', async () => {
  for (const patch of [{ name: ' ' }, { price: -1 }, { price: 10.001 }, { price: Infinity }, { registration_fee: null }, { registration_fee: 100001 }, { frequency_per_week: 0 }, { frequency_per_week: 8 }, { duration_months: 1.5 }, { duration_months: 37 }, { sibling_discount_percent: 101 }, { includes_uniform: 'true' }, { id: 'invalid' }]) {
    const run = scenario()
    assert.ok((await run.actions.saveEnrollmentPlanAction({ ...valid, ...patch })).error)
    assert.equal(run.writes.length, 0)
  }
})

test('plan creation persists only editable catalog fields and refreshes the enrollment catalog', async () => {
  const run = scenario()
  const result = await run.actions.saveEnrollmentPlanAction({ ...valid, name: '  Mensal 2x  ', created_at: '2000-01-01', actor_id: 'forged', monthly_fee: 1 })
  assert.equal(result.success, true)
  const saved = run.writes[0].insert
  assert.equal(saved.name, 'Mensal 2x')
  assert.equal(saved.price, 180.50)
  for (const field of ['created_at', 'actor_id', 'monthly_fee', 'id']) assert.equal(field in saved, false)
  assert.ok(run.refreshes.includes('/planos'))
  assert.ok(run.refreshes.includes('/alunos/novo'))
})

test('plan edits target a single plan and can deactivate it without changing financial agreements', async () => {
  const run = scenario()
  assert.equal((await run.actions.saveEnrollmentPlanAction({ ...valid, id: planId, price: 250, is_active: false })).success, true)
  assert.equal(run.writes[0].update.price, 250)
  assert.equal(run.writes[0].update.is_active, false)
  assert.equal('id' in run.writes[0].update, false)
  assert.deepEqual(run.writes[1], { filter: { field: 'id', value: planId } })
})

test('missing or rejected plan updates never report success or refresh the catalog', async () => {
  for (const options of [{ found: false }, { error: { message: 'Denied' } }]) {
    const run = scenario(options)
    assert.ok((await run.actions.saveEnrollmentPlanAction({ ...valid, id: planId })).error)
    assert.equal(run.refreshes.length, 0)
  }
})
