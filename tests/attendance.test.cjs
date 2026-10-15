const test = require("node:test");
const assert = require("node:assert/strict");
const { loadTS } = require("./support/load-ts.cjs");

function scenario({ guardians = [], delivery = true, writeError = null } = {}) {
  const deliveries = [];
  const writes = [];
  const students = [
    { id: "athlete-1", name: "Atleta de teste", guardian: guardians },
  ];
  const database = {
    rpc: async (name) => ({data:name==='attendance_notification_targets'?students:null,error:null}),
    from(table) {
      const rows = table === "students" ? students : [];
      const query = {
        select: () => query,
        eq: () => query,
        in: () => query,
        single: async () => ({ data: rows[0] || null, error: null }),
        upsert: async (records) => {
          writes.push(records);
          return { error: writeError };
        },
        then: (resolve, reject) =>
          Promise.resolve({ data: rows, error: null }).then(resolve, reject),
      };
      return query;
    },
  };
  const actions = loadTS("app/chamada/actions.ts", {
    "@/lib/supabase/admin": { createAdminClient: () => database },
    "next/cache": { revalidatePath() {} },
    "@/lib/whatsapp/tracked": { sendTrackedWhatsApp: async (_db,event,deliver) => { const g=guardians.find(g=>g.id===event.guardianId)||guardians[0]; const r=await deliver(g.phone); return {status:r.success?"accepted":"failed"}; } },
    "@/lib/whatsapp/evolution": {
      sendEvolutionWhatsApp: async (payload) => {
        deliveries.push(payload);
        return { success: delivery };
      },
    },
  });
  return { actions, deliveries, writes };
}
const present = [{ student_id: "athlete-1", status: "present" }];

test("saving attendance respects guardians who disabled WhatsApp notifications", async () => {
  const run = scenario({
    guardians: [
      { name: "Responsável", phone: "000", receives_notifications: false },
    ],
  });
  const result = await run.actions.saveAttendanceAction(
    "class-1",
    "2026-10-14",
    present,
  );
  assert.equal(result.success, true);
  assert.equal(result.notificationsSent, 0);
  assert.equal(run.deliveries.length, 0);
});

test("delivery failures are counted separately from successful notifications", async () => {
  const run = scenario({
    guardians: [
      { name: "Responsável", phone: "000", receives_notifications: true },
    ],
    delivery: false,
  });
  const result = await run.actions.saveAttendanceAction(
    "class-1",
    "2026-10-14",
    present,
  );
  assert.equal(result.success, true);
  assert.equal(result.notificationsSent, 0);
  assert.equal(result.notificationsFailed, 1);
});

test("only eligible guardians receive notifications and successful sends are counted", async () => {
  const run = scenario({
    guardians: [
      { name: "Habilitado", phone: "001", receives_notifications: true },
      { name: "Desabilitado", phone: "002", receives_notifications: false },
    ],
  });
  const result = await run.actions.saveAttendanceAction(
    "class-1",
    "2026-10-14",
    present,
  );
  assert.equal(result.notificationsSent, 1);
  assert.equal(run.deliveries[0].phone, "001");
  assert.equal(run.deliveries.length, 1);
});

test("a failed database write never triggers a presence notification", async () => {
  const run = scenario({
    guardians: [{ phone: "000" }],
    writeError: { message: "Simulated write failure" },
  });
  const result = await run.actions.notifySingleStudentAttendanceAction(
    "athlete-1",
    "2026-10-14",
    "present",
    "class-1",
  );
  assert.equal(result.success, false);
  assert.equal(run.deliveries.length, 0);
});

test("notifications can be disabled while preserving attendance", async () => {
  const run = scenario({
    guardians: [{ phone: "000", receives_notifications: true }],
  });
  const result = await run.actions.saveAttendanceAction(
    "class-1",
    "2026-10-14",
    present,
    { notifyAbsents: false, notifyPresences: false },
  );
  assert.equal(result.success, true);
  assert.equal(run.writes.length, 1);
  assert.equal(run.deliveries.length, 0);
});

test("pending or empty attendance cannot be persisted as an automatic absence", async () => {
  const run = scenario();
  const invalid = await run.actions.saveAttendanceAction(
    "class-1",
    "2026-10-14",
    [{ student_id: "athlete-1", status: null }],
  );
  assert.equal(invalid.success, false);
  const empty = await run.actions.saveAttendanceAction(
    "class-1",
    "2026-10-14",
    [],
  );
  assert.equal(empty.success, false);
  assert.equal(run.writes.length, 0);
});
