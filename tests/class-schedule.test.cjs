const test = require('node:test'), assert = require('node:assert/strict')
const { loadTS } = require('./support/load-ts.cjs')
const { classScheduleLabel } = loadTS('lib/class-schedule.ts')

test('shift-only imported groups never display an invented exact training time', () => {
  assert.equal(classScheduleLabel({ shift: 'morning' }), 'Manhã · horário a confirmar')
  assert.equal(classScheduleLabel({ shift: 'afternoon', start_time: null, end_time: null }), 'Tarde · horário a confirmar')
  assert.equal(classScheduleLabel({ shift: 'evening' }), 'Noite · horário a confirmar')
  assert.equal(classScheduleLabel({}), 'Turno a confirmar · horário a confirmar')
  assert.equal(classScheduleLabel({ shift: 'morning', start_time: '08:30:00', end_time: '09:45:00' }), '08:30 – 09:45')
})

test('class updates require classes.write and only forward class configuration fields', async () => {
  const calls = [], permissions = []
  const actions = loadTS('app/turmas/actions.ts', {
    '@/lib/supabase/admin': { createAdminClient: async permission => { permissions.push(permission); return { rpc: async (...args) => { calls.push(args); return { error: null } } } } },
    '@/lib/class-schedule': loadTS('lib/class-schedule.ts'),
    'next/cache': { revalidatePath() {} }, 'next/navigation': { redirect() {} },
  })
  const form = new FormData()
  for (const [key,value] of Object.entries({id:'class-id',name:'Terça e quinta — Tarde',shift:'afternoon',monthly_fee:'999',status:'active',import_source:'forged'})) form.set(key,value)
  form.append('days_of_week','ter'); form.append('days_of_week','qui')
  assert.equal((await actions.updateClassAction(form)).success, true)
  assert.equal(permissions[0], 'classes.write')
  const [name,args] = calls[0]
  assert.equal(name,'update_class_details')
  assert.equal(args.p_details.start_time,null)
  assert.equal(args.p_details.max_students,null)
  for (const field of ['monthly_fee','status','import_source','student_id','unit_id']) assert.equal(field in args.p_details,false)
})
