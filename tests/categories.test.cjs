const test = require('node:test'), assert = require('node:assert/strict')
const { loadTS } = require('./support/load-ts.cjs')
const valid = { name: 'Sub-19', min_age: 18, max_age: 19, description: '' }
function scenario({ error = null, unauthorized = false } = {}) {
  const writes = [], refreshes = [], permissions = []
  const actions = loadTS('app/turmas/category-actions.ts', {
    zod: require('zod'),
    'next/cache': { revalidatePath: path => refreshes.push(path) },
    '@/lib/supabase/admin': { createAdminClient: async permission => {
      permissions.push(permission)
      if (unauthorized) throw new Error('Acesso negado')
      return { from: table => {
        assert.equal(table, 'categories')
        return { insert: values => { writes.push(values); return { select: () => ({ single: async () => ({ data: error ? null : { id: 'category-created', name: values.name, min_age: values.min_age, max_age: values.max_age }, error }) }) } } }
      } }
    } },
  })
  return { actions, writes, refreshes, permissions }
}
test('adding an age category requires class management permission at the action boundary', async () => {
  const run = scenario({ unauthorized: true })
  await assert.rejects(run.actions.createAgeCategoryAction(valid), /Acesso negado/)
  assert.deepEqual(run.permissions, ['classes.write'])
  assert.equal(run.writes.length, 0)
})
test('invalid age ranges and category fields cannot reach the database', async () => {
  for (const patch of [{ name: ' ' }, { min_age: -1 }, { min_age: 1.5 }, { min_age: 20 }, { max_age: 101 }, { max_age: null }, { description: 'a'.repeat(501) }]) {
    const run = scenario()
    assert.ok((await run.actions.createAgeCategoryAction({ ...valid, ...patch })).error)
    assert.equal(run.writes.length, 0)
  }
})
test('new categories return their persisted identity for immediate selection and ignore forged metadata', async () => {
  const run = scenario()
  const result = await run.actions.createAgeCategoryAction({ ...valid, name: '  Sub-19  ', id: 'forged', created_at: '2000-01-01', actor_id: 'forged' })
  assert.equal(result.category.id, 'category-created')
  assert.equal(result.category.name, 'Sub-19')
  assert.equal(run.writes[0].description, null)
  for (const key of ['id', 'created_at', 'actor_id']) assert.equal(key in run.writes[0], false)
  assert.ok(run.refreshes.includes('/turmas'))
})
test('duplicate and failed category saves produce clear errors without updating options', async () => {
  const duplicate = scenario({ error: { code: '23505' } })
  assert.match((await duplicate.actions.createAgeCategoryAction(valid)).error, /Já existe/)
  assert.equal(duplicate.refreshes.length, 0)
  const failed = scenario({ error: { code: '42501' } })
  assert.ok((await failed.actions.createAgeCategoryAction(valid)).error)
  assert.equal(failed.refreshes.length, 0)
})
