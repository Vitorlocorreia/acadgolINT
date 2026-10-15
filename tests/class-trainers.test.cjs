const test = require('node:test'), assert = require('node:assert/strict')
const { loadTS } = require('./support/load-ts.cjs')
const activeTrainer = { id: 'user-id', full_name: 'Ana Treinadora', username: 'ana', role: 'treinador', active: true, is_test: false, coach_id: 'coach-id', coach: { id: 'coach-id', is_active: true } }
function scenario(people = [activeTrainer]) {
  const writes = [], permissions = [], tables = []
  const db = { from(table) {
    tables.push(table)
    if (table === 'classes') return { insert: async values => { writes.push(values); return { error: null } } }
    let filters = [], maximum = Infinity
    function result() {
      let rows = table === 'staff_profiles' ? people : table === 'units' ? [{ id: 'school-unit', is_active: true }] : []
      rows = rows.filter(row => filters.every(([key, value]) => key.split('.').reduce((current, part) => current?.[part], row) === value))
      return rows.slice(0, maximum)
    }
    const query = {
      select: () => query,
      eq: (key, value) => { filters.push([key, value]); return query },
      order: () => query,
      limit: count => { maximum = count; return query },
      maybeSingle: async () => ({ data: result()[0] || null, error: null }),
      then: (resolve, reject) => Promise.resolve({ data: result(), error: null }).then(resolve, reject),
    }
    return query
  } }
  const actions = loadTS('app/turmas/actions.ts', {
    '@/lib/supabase/admin': { createAdminClient: async permission => { permissions.push(permission); return db } },
    'next/cache': { revalidatePath() {} },
    'next/navigation': { redirect() { throw new Error('REDIRECT') } },
    '@/lib/class-schedule': loadTS('lib/class-schedule.ts'),
  }, { process: { env: { SCHOOL_UNIT_ID: 'school-unit' } } })
  return { actions, writes, permissions, tables }
}
function classForm(coach = 'coach-id') {
  const form = new FormData()
  for (const [key, value] of Object.entries({ name: 'Sub-09 Tarde', category_id: 'category-id', coach_id: coach, start_time: '14:00', end_time: '15:00', max_students: '20' })) form.set(key, value)
  return form
}

test('class coach options come from active trainer accounts with their actual coach linkage', async () => {
  const run = scenario([
    activeTrainer,
    { ...activeTrainer, id: 'secretary', role: 'secretaria' },
    { ...activeTrainer, id: 'blocked', active: false },
    { ...activeTrainer, id: 'test', is_test: true },
    { ...activeTrainer, id: 'inactive-coach', coach: { is_active: false } },
  ])
  const options = await run.actions.getUnitsAndCategoriesForClasses()
  assert.equal(options.coaches.length, 1)
  assert.equal(options.coaches[0].name, 'Ana Treinadora')
  assert.equal(options.coaches[0].username, 'ana')
  assert.equal(options.coaches[0].user_id, 'user-id')
  assert.equal(options.coaches[0].id, 'coach-id')
  assert.equal(run.tables.includes('coaches'), false)
})

test('a blocked, demoted, test or unlinked trainer cannot be submitted as the class responsible', async () => {
  for (const people of [[], [{ ...activeTrainer, active: false }], [{ ...activeTrainer, role: 'financeiro' }], [{ ...activeTrainer, is_test: true }], [{ ...activeTrainer, coach: { is_active: false } }]]) {
    const run = scenario(people)
    await assert.rejects(run.actions.createClassAction(classForm()), /usuário ativo com cargo de treinador/)
    assert.equal(run.writes.length, 0)
    assert.equal(run.permissions[0], 'classes.write')
  }
})

test('class creation keeps the coach foreign key used to grant the selected trainer attendance access', async () => {
  const run = scenario()
  await assert.rejects(run.actions.createClassAction(classForm()), /REDIRECT/)
  assert.equal(run.writes.length, 1)
  assert.equal(run.writes[0].coach_id, activeTrainer.coach_id)
  assert.notEqual(run.writes[0].coach_id, activeTrainer.id)
})

test('a class may still be created with the responsible trainer to be defined later', async () => {
  const run = scenario([])
  await assert.rejects(run.actions.createClassAction(classForm('')), /REDIRECT/)
  assert.equal(run.writes[0].coach_id, null)
  assert.equal(run.tables.includes('staff_profiles'), false)
})
