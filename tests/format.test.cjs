const test = require("node:test");
const assert = require("node:assert/strict");
const { loadTS } = require("./support/load-ts.cjs");
const { schoolClock, nextTraining, calculateAge, formatMonth } =
  loadTS("lib/format.ts");

test("school dates stay in Recife when the UTC month has already changed", () => {
  assert.equal(
    schoolClock(new Date("2026-11-01T01:30:00Z")).date,
    "2026-10-31",
  );
  assert.equal(schoolClock(new Date("2026-11-01T01:30:00Z")).time, "22:30");
});

test("next training skips an already started session and crosses month boundaries", () => {
  const next = nextTraining(
    ["qua"],
    "08:30:00",
    new Date("2026-10-28T12:00:00Z"),
  );
  assert.equal(next.date, "2026-11-04");
  assert.equal(next.time, "08:30");
  assert.equal(
    nextTraining(["qua"], "08:30", new Date("2026-10-28T10:00:00Z")).date,
    "2026-10-28",
  );
});

test("missing schedule does not produce an invented next training", () => {
  assert.equal(nextTraining([], "09:00"), null);
  assert.equal(nextTraining(["seg"], undefined), null);
});

test("existing full weekday names and accents resolve to the next real training", () => {
  const next = nextTraining(["terca", "Quinta-feira"], "08:30:00", new Date("2026-10-14T12:00:00Z"));
  assert.equal(next.date, "2026-10-15");
  assert.equal(nextTraining(["Sábado"], "09:00", new Date("2026-10-16T12:00:00Z")).date, "2026-10-17");
});

test("age and month labels do not depend on the host timezone", () => {
  assert.equal(calculateAge("2016-10-15", "2026-10-14"), 9);
  assert.equal(calculateAge("2016-10-15", "2026-10-15"), 10);
  assert.equal(calculateAge("2030-01-01", "2026-10-15"), null);
  assert.match(formatMonth("2026-10"), /outubro.*2026/);
});
