// Run with `npm run test:edge`. Migration 0009 (running December classes stay readable) as a file: how it is recorded.
// What the SQL does is checked in a scratch Postgres by scripts/crm-verify/december-policy.sh.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

// Drizzle's runner applies an entry only when its time is later than the newest one already recorded (0006 is the newest
// in production), so a 0009 dated earlier would be skipped without a word.
test("migration 0009 is listed after 0006 with a later time than everything before it, and a snapshot that follows 0006's", async () => {
  const journal = JSON.parse(await read("drizzle/migrations/meta/_journal.json"));
  const position = (tag) => journal.entries.findIndex((entry) => entry.tag === tag);
  const at0006 = position("0006_crm_lessons");
  const at0009 = position("0009_december_running_classes");
  const entry = journal.entries[at0009];

  assert.ok(at0006 >= 0 && at0009 > at0006, "0009 comes after 0006");
  assert.equal(entry.idx, at0009);
  assert.ok(journal.entries.slice(0, at0009).every((earlier) => earlier.when < entry.when), "it has a later time than the entries before it");

  const snapshot = JSON.parse(await read("drizzle/migrations/meta/0009_snapshot.json"));
  const before = JSON.parse(await read("drizzle/migrations/meta/0006_snapshot.json"));
  assert.equal(snapshot.prevId, before.id);
  assert.notEqual(snapshot.id, before.id);
});
