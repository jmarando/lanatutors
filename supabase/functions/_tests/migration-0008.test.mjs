// Run with `npm run test:edge`. Migration 0008 (in-chat booking) as a file: what it contains and how it is recorded.
// That the SQL really runs, and what it does to the CRM, is checked in a scratch Postgres (see the plan, Task 7).
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

// The text of the CRM function that records an assessment booking, from its CREATE to its closing `END $$;`.
function bookingFunctionIn(sql) {
  const start = sql.indexOf("CREATE OR REPLACE FUNCTION public.crm_record_assessment_booking");
  const end = sql.indexOf("END $$;", start);
  assert.ok(start >= 0 && end > start, "found the function");
  return sql.slice(start, end + "END $$;".length);
}
const lines = (text) => text.split("\n").map((line) => line.trim()).filter(Boolean).join("\n");

test("migration 0008 adds the booked_via column and the one-booking-per-time rule that starts on 2026-11-01", async () => {
  const sql = await read("drizzle/migrations/0008_inchat_booking.sql");

  assert.match(sql, /ADD COLUMN IF NOT EXISTS booked_via text/);
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS consultation_bookings_one_per_slot/);
  assert.match(sql, /\(consultation_date, consultation_time\)/);
  assert.match(sql, /WHERE status <> 'cancelled' AND consultation_date >= DATE '2026-11-01'/);
});

test("migration 0008 replaces the CRM booking function with 0004's text plus the one line that clears needs_reply", async () => {
  const added = "needs_reply = CASE WHEN p.booked_via = 'whatsapp' THEN false ELSE needs_reply END,";
  const mine = bookingFunctionIn(await read("drizzle/migrations/0008_inchat_booking.sql"));
  const theirs = bookingFunctionIn(await read("drizzle/migrations/0004_crm_leads.sql"));

  assert.ok(mine.includes(added), "the new line is there");
  assert.equal(lines(mine.replace(added, "")), lines(theirs), "everything else is 0004's text");
});

test("migration 0008 keeps the function closed to the public, as 0004 did", async () => {
  const sql = await read("drizzle/migrations/0008_inchat_booking.sql");

  assert.match(sql, /REVOKE ALL ON FUNCTION public\.crm_record_assessment_booking\(public\.consultation_bookings\) FROM PUBLIC, anon, authenticated;/);
});

test("migration 0008 is the newest entry in the journal, with a snapshot that follows 0005's", async () => {
  const journal = JSON.parse(await read("drizzle/migrations/meta/_journal.json"));
  const last = journal.entries.at(-1);

  assert.equal(last.tag, "0008_inchat_booking");
  assert.equal(last.idx, journal.entries.length - 1);
  assert.ok(journal.entries.slice(0, -1).every((entry) => entry.when < last.when), "the newest entry has the latest time");

  const snapshot = JSON.parse(await read("drizzle/migrations/meta/0008_snapshot.json"));
  const before = JSON.parse(await read("drizzle/migrations/meta/0005_snapshot.json"));
  assert.equal(snapshot.prevId, before.id);
  assert.notEqual(snapshot.id, before.id);
});
