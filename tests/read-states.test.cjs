const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTS } = require('./support/load-ts.cjs');

function loadReadActions(file, failingTable) {
  const db = { rpc:async(name)=>({data:[],error:({'staff_class_catalog':'classes','staff_matches':'matches'}[name]===failingTable)?{message:'Connection unavailable'}:null}),from(table) {
    const query = {
      select: () => query, eq: () => query, order: () => query,
      then: (resolve, reject) => Promise.resolve({ data: [], error: table === failingTable ? { message: 'Connection unavailable' } : null }).then(resolve, reject),
    };
    return query;
  } };
  return loadTS(file, {
    '@/lib/supabase/admin': { createAdminClient: () => db },
    'next/cache': { revalidatePath() { throw Error('Read must not change data'); } },
    'next/navigation': { redirect() { throw Error('Read must not redirect'); } },
    '@/lib/whatsapp/evolution': {}, './utils': {}, fs: {}, path: {},
    '@/lib/whatsapp/tracked': {},
    '@/lib/class-schedule': loadTS('lib/class-schedule.ts'),
    '@/lib/supabase/family': {},
    '@/lib/callups/model': {}, '@/lib/callups/card': {},
  });
}

for (const [file, method, table] of [
  ['app/turmas/actions.ts', 'getClassesList', 'classes'],
  ['app/experimentais/actions.ts', 'getTrialClasses', 'trial_classes'],
  ['app/uniformes/actions.ts', 'getUniformInventory', 'uniform_inventory'],
  ['app/jogos/actions.ts', 'getMatchesList', 'matches'],
]) {
  test(`${method}: a connection failure cannot look like an empty list`, async () => {
    await assert.rejects(loadReadActions(file, table)[method](), /Não foi possível carregar/);
  });
  test(`${method}: an actual empty collection remains an empty state`, async () => {
    assert.equal((await loadReadActions(file)[method]()).length, 0);
  });
}

test('a failed form option query prevents an incomplete class registration form', async () => {
  await assert.rejects(loadReadActions('app/turmas/actions.ts', 'categories').getUnitsAndCategoriesForClasses(), /opções da turma/);
});
test('a failed trainer account lookup cannot appear as no available trainers', async () => {
  await assert.rejects(loadReadActions('app/turmas/actions.ts', 'staff_profiles').getUnitsAndCategoriesForClasses(), /opções da turma/);
});
