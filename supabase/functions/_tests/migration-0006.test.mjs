// Run with `npm run test:edge`. Migration 0006 (CRM lessons and payments) as a file: how it is recorded.
// What the SQL does is checked in a scratch Postgres by scripts/crm-verify/run.sh.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

// 0008 went into production before 0006. Drizzle's runner applies an entry only when its time is later than the newest
// one already recorded, so a 0006 dated before 0008 would be skipped without a word.
test("migration 0006 is listed after 0008 with a later time than everything before it, and a snapshot that follows 0008's", async () => {
  const journal = JSON.parse(await read("drizzle/migrations/meta/_journal.json"));
  const position = (tag) => journal.entries.findIndex((entry) => entry.tag === tag);
  const at0006 = position("0006_crm_lessons");
  const at0008 = position("0008_inchat_booking");
  const entry = journal.entries[at0006];

  assert.ok(at0008 >= 0 && at0006 > at0008, "0006 comes after 0008");
  assert.equal(entry.idx, at0006);
  assert.ok(journal.entries.slice(0, at0006).every((earlier) => earlier.when < entry.when), "it has a later time than the entries before it");

  const snapshot = JSON.parse(await read("drizzle/migrations/meta/0006_snapshot.json"));
  const before = JSON.parse(await read("drizzle/migrations/meta/0008_snapshot.json"));
  assert.equal(snapshot.prevId, before.id);
  assert.notEqual(snapshot.id, before.id);
});
