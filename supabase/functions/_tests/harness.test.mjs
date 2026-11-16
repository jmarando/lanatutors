// Run with `npm run test:edge`. The fake database in harness.mjs has to act like the parts of production the December
// functions rely on: generated ids, delete, ranges, scripted insert failures and the trigger that counts class seats.
import assert from "node:assert/strict";
import { test } from "node:test";
import { loadFunction } from "./harness.mjs";

const CLASS_A = "c1000000-0000-4000-8000-000000000001";
const CLASS_B = "c2000000-0000-4000-8000-000000000002";

// Any function will do: the world is what is under test.
async function world(t) {
  const fn = await loadFunction("record-intensive-payment");
  t.after(() => fn.dispose());
  fn.world.tables.intensive_classes = [
    { id: CLASS_A, current_enrollment: 0 },
    { id: CLASS_B, current_enrollment: 2 },
  ];
  return fn.world;
}

test("a row inserted into a table with generated ids gets one", async (t) => {
  const w = await world(t);
  const { data } = await w.supabase.from("students").insert({ full_name: "Amani" }).select("id").single();
  assert.match(data.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  assert.equal(w.tables.students.length, 1);
});

test("an id the insert gives is kept", async (t) => {
  const w = await world(t);
  await w.supabase.from("intensive_enrollments").insert({ id: "old", enrolled_class_ids: [] });
  assert.equal(w.tables.intensive_enrollments[0].id, "old");
});

test("delete removes the matching rows and hands them back", async (t) => {
  const w = await world(t);
  w.tables.students = [{ id: "s1", full_name: "A" }, { id: "s2", full_name: "B" }];
  const { data } = await w.supabase.from("students").delete().eq("id", "s1");
  assert.deepEqual(data.map((row) => row.id), ["s1"]);
  assert.deepEqual(w.tables.students.map((row) => row.id), ["s2"]);
});

test("range slices the sorted rows the way PostgREST does", async (t) => {
  const w = await world(t);
  w.tables.profiles.push(...["c", "a", "b", "d"].map((id) => ({ id })));
  const { data } = await w.supabase.from("profiles").select("id").order("id").range(1, 2);
  assert.deepEqual(data.map((row) => row.id), ["b", "c"]);
});

test("an enrolment takes a seat in each of its classes and gives it back when it is deleted", async (t) => {
  const w = await world(t);
  const { data } = await w.supabase
    .from("intensive_enrollments")
    .insert({ student_id: "u1", enrolled_class_ids: [CLASS_A, CLASS_B], total_subjects: 2, total_amount: 8000, payment_status: "pending" })
    .select("id")
    .single();
  assert.deepEqual(w.tables.intensive_classes.map((c) => c.current_enrollment), [1, 3]);

  await w.supabase.from("intensive_enrollments").delete().eq("id", data.id);
  assert.deepEqual(w.tables.intensive_classes.map((c) => c.current_enrollment), [0, 2]);
});

test("a scripted insert failure hits only that table, and only as many times as it was set", async (t) => {
  const w = await world(t);
  w.failInserts.students = 1;

  const first = await w.supabase.from("students").insert({ full_name: "A" });
  assert.equal(first.error.message, "boom");
  assert.equal(w.tables.students?.length ?? 0, 0);

  assert.equal((await w.supabase.from("lead_activities").insert({ body: "x" })).error, null);
  assert.equal((await w.supabase.from("students").insert({ full_name: "B" })).error, null);
});
