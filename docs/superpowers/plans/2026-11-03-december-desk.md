# December Desk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One CRM screen, `/admin/december`, where the team sees December seats, opens or archives classes, enrols reserved children, drafts the payment message and records paybill payments.

**Architecture:** Reservations stay `DEC26` timeline notes. A pure module (`src/utils/decemberDesk.ts`) reads them with the SQL counter's rules, and a golden fixture is checked against both the SQL and the parser. The screen reads the program, classes and notes straight from the database as an admin. One new admin-only edge function (`enrol-december-family`) finds or creates the family's login, the child record and the enrolment. A class's free-text `status` gains a middle value, `confirmed`. No database migration.

**Tech Stack:** React 18, TypeScript, Vite, shadcn/ui, supabase-js; Deno edge functions tested under Node with `supabase/functions/_tests/harness.mjs`; `npm run test:crm` (esbuild plus node:test) and `npm run test:edge`; Playwright (MCP) for the mocked walkthroughs.

Spec: `docs/superpowers/specs/2026-11-03-december-desk-design.md`. Read it first. This plan has two phases; each ends in its own pull request.

## Global Constraints

- No database migration, and nothing is applied to production by this work. Merging does not deploy edge functions; deploying `enrol-december-family` and the changed `sync-bootcamp-to-calendar` is a separate step the owner approves (Task 11).
- The seat totals on the screen follow the SQL counter's rule exactly (`scripts/crm-verify/december-count.sql`); the golden fixture checks both (Task 1).
- A failed read shows an error, never zero seats.
- The system sends nothing to a family. Every message is a draft the team copies or opens in WhatsApp.
- A timeline line the system writes (kind `system`) never starts with `DEC26`.
- The desk and its menu entry retire on `DECEMBER_DESK_UNTIL = "2026-12-19"`, the same day as the chat button and Lana's December reply; a test keeps the three equal. Reservations close `RESERVATIONS_CLOSE = "2026-11-27"`, pay by `PAY_BY = "2026-12-04"`. A class opens at `MIN_STUDENTS_TO_OPEN` (6) seats and its limit is the class row's `max_students` (12).
- Open never blocks (a class may run at 5). Archive and Back to reserving are refused while any unreleased enrolment includes the class.
- Families pay in full; class access and the morning reminder need `payment_status = 'completed'`.
- Do not modify `create-parent-profile` or `record-intensive-payment`; call them.
- The repo is public. Commit messages, PR text and docs carry no business figures beyond the code's own constants, no unpatched weaknesses and no production specifics.
- Commit only when the owner says to. Commit messages are `December desk: <what>` and end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Pull request descriptions end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Match the surrounding code: comment density, naming, plain English in user-facing text, no emojis.

## File Structure

Phase 1 (Tasks 0 to 4):

- `src/utils/decemberDesk.ts` (create): codes, constants, note parser, tally, family lists, class state, class code, seat-note builder, date helpers. Pure.
- `scripts/crm-tests/decemberDesk.test.ts` (create) and `scripts/crm-tests/fixtures/december-notes.json` (create): the unit tests and the golden notes.
- `scripts/crm-verify/december-count.sql` and `scripts/crm-verify/december-counter.sh` (create): the SQL counter and the script that checks the golden file against it.
- `src/components/admin/crm/useDecemberDesk.ts` (create): loads the program, classes and notes.
- `src/components/admin/crm/DecemberClassCard.tsx` (create): one class card.
- `src/pages/admin/CrmDecember.tsx` (create): the screen.
- `src/components/admin/crm/DecemberSeatsDialog.tsx` (create): Add December seats.
- `src/components/admin/crm/CrmShell.tsx`, `src/components/admin/crm/FamilyTimeline.tsx`, `src/App.tsx` (modify): the nav entry, the button, the route.
- `scripts/crm-verify/december-walkthrough.js` (create): the mocked browser walkthrough.

Phase 2 (Tasks 5 to 11):

- `supabase/functions/_tests/harness.mjs` (modify): delete, range, generated ids, the seat trigger, scripted insert failures.
- `src/utils/holidayClasses.ts`, `src/pages/DecemberClasses.tsx`, `src/components/admin/AdminIntensivePrograms.tsx`, `supabase/functions/sync-bootcamp-to-calendar/index.ts` (modify) and their tests: the `confirmed` status.
- `supabase/functions/_shared/december.ts` (create), `supabase/functions/enrol-december-family/index.ts` (create), `supabase/functions/_tests/enrol-december-family.test.mjs` (create), `supabase/config.toml` (modify): the Enrol step.
- `src/utils/paybill.ts` (create), `src/components/admin/AdminInvoices.tsx` (modify), `src/utils/decemberDesk.ts` (extend): the paybill wording, the messages, enrolment matching.
- `src/components/admin/crm/decemberActions.ts`, `DecemberEnrolDialog.tsx`, `DecemberMessageDialog.tsx` (create); `useDecemberDesk.ts`, `DecemberClassCard.tsx`, `CrmDecember.tsx` (modify): the actions on the screen.
- `src/components/tutor/TutorBootcampTab.tsx` (modify): the child's name on the roster.
- `scripts/crm-verify/december-walkthrough.js` (extend): Phase 2 steps.

---

## Phase 1: the screen and Add December seats

### Task 0: Work folder check

**Files:** none.

- [ ] **Step 1: Link `node_modules` and check the baseline**

The worktree has none, and the main checkout's works for it.

```bash
cd /Users/mac/lanatutors/.claude/worktrees/december-desk
ln -s /Users/mac/lanatutors/node_modules node_modules
git status -sb | head -3
npm run test:crm 2>&1 | tail -8
npm run test:edge 2>&1 | tail -8
npx tsc -p tsconfig.app.json --noEmit; echo "tsc exit $?"
```

Expected: `git status` shows `## claude/december-desk...origin/main` and an untracked `docs/superpowers/plans/` and `docs/superpowers/specs/2026-11-03-december-desk-design.md` only (the symlink is ignored). Both test commands end with `# fail 0`, and `tsc exit 0`. Write the two totals (`# pass N`) down; every later run must keep them passing.

### Task 1: The reservation rules, with tests and a golden check against the SQL counter

**Files:**
- Create: `scripts/crm-tests/fixtures/december-notes.json`
- Create: `scripts/crm-verify/december-count.sql`
- Create: `scripts/crm-verify/december-counter.sh`
- Create: `scripts/crm-tests/decemberDesk.test.ts`
- Create: `src/utils/decemberDesk.ts`

**Interfaces:**
- Produces (all from `src/utils/decemberDesk.ts`): constants `DECEMBER_CODES`, `CODE_INFO`, `DECEMBER_DESK_UNTIL`, `RESERVATIONS_CLOSE`, `PAY_BY`, `DEFAULT_FEE_PER_SUBJECT`; types `DecemberCode`, `DeskNote`, `ParsedNote`, `CodeTally`, `Holding`, `DeskLists`, `ClassState`; functions `isDeskActive(today: string): boolean`, `shortDay(day: string): string`, `longDay(day: string): string`, `parseDecemberNote(body: string | null | undefined): ParsedNote | null`, `tallyNotes(notes: DeskNote[]): CodeTally[]`, `readLists(notes: DeskNote[]): DeskLists`, `listsDisagree(tally: CodeTally[], lists: DeskLists): DecemberCode[]`, `classState(status: string, seats: number): { state: ClassState; needed: number }`, `classCode(c: { subject: string; grade_levels: string[] }): DecemberCode | null`, `buildSeatNote(input: { codes: DecemberCode[]; child: string; cancel?: boolean }): string | null`.

- [ ] **Step 1: Write the golden fixture**

`scripts/crm-tests/fixtures/december-notes.json` (invented notes; `expected` is what the SQL counter answers, checked in Step 3):

```json
{
  "about": "Invented December reservation notes. `expected` is what scripts/crm-verify/december-count.sql answers for them: scripts/crm-verify/december-counter.sh checks it (and --write refreshes it), and the parser is tested against the same numbers.",
  "notes": [
    { "id": "n01", "family_id": "a0000000-0000-4000-8000-00000000000a", "kind": "note", "occurred_at": "2026-11-09T07:00:00+00:00", "body": "DEC26 F3-MATHS F3-ENG - Amani" },
    { "id": "n02", "family_id": "a0000000-0000-4000-8000-00000000000a", "kind": "note", "occurred_at": "2026-11-09T07:01:00+00:00", "body": "DEC26 G8-MATHS - Baraka" },
    { "id": "n03", "family_id": "b0000000-0000-4000-8000-00000000000b", "kind": "note", "occurred_at": "2026-11-09T07:02:00+00:00", "body": "  dec26 f3-maths - Wanjiru" },
    { "id": "n04", "family_id": "c0000000-0000-4000-8000-00000000000c", "kind": "note", "occurred_at": "2026-11-09T07:03:00+00:00", "body": "DEC26 F3-MATHS F3-MATHS - Kip" },
    { "id": "n05", "family_id": "d0000000-0000-4000-8000-00000000000d", "kind": "note", "occurred_at": "2026-11-09T07:04:00+00:00", "body": "DEC26X F3-CHEM - not a reservation" },
    { "id": "n06", "family_id": "d0000000-0000-4000-8000-00000000000d", "kind": "note", "occurred_at": "2026-11-09T07:05:00+00:00", "body": "Remember to ask about DEC26 F3-CHEM" },
    { "id": "n07", "family_id": "a0000000-0000-4000-8000-00000000000a", "kind": "note", "occurred_at": "2026-11-09T07:06:00+00:00", "body": "DEC26 CANCEL F3-ENG - Amani" },
    { "id": "n08", "family_id": "b0000000-0000-4000-8000-00000000000b", "kind": "note", "occurred_at": "2026-11-09T07:07:00+00:00", "body": "DEC26 F3-CHEM G8-SCI" },
    { "id": "n09", "family_id": "e0000000-0000-4000-8000-00000000000e", "kind": "note", "occurred_at": "2026-11-09T07:08:00+00:00", "body": "DEC26 G8-ENG - Zawadi" },
    { "id": "n10", "family_id": "e0000000-0000-4000-8000-00000000000e", "kind": "note", "occurred_at": "2026-11-09T07:09:00+00:00", "body": "DEC26 G8-ENG - Zawadi" },
    { "id": "n11", "family_id": "c0000000-0000-4000-8000-00000000000c", "kind": "note", "occurred_at": "2026-11-09T07:10:00+00:00", "body": "DEC26 CANCELLED G8-ENG" },
    { "id": "n12", "family_id": "a0000000-0000-4000-8000-00000000000a", "kind": "note", "occurred_at": "2026-11-09T07:11:00+00:00", "body": "DEC26 hello" },
    { "id": "n13", "family_id": "c0000000-0000-4000-8000-00000000000c", "kind": "whatsapp", "occurred_at": "2026-11-09T07:12:00+00:00", "body": "DEC26 F3-MATHS" }
  ],
  "expected": [
    { "code": "F3-MATHS", "seats": 3, "families": 3 },
    { "code": "F3-CHEM", "seats": 1, "families": 1 },
    { "code": "F3-ENG", "seats": 0, "families": 1 },
    { "code": "G8-MATHS", "seats": 1, "families": 1 },
    { "code": "G8-SCI", "seats": 1, "families": 1 },
    { "code": "G8-ENG", "seats": 1, "families": 1 }
  ]
}
```

What each odd note shows: `n03` leading spaces and lower case; `n04` a code repeated in one note counts once; `n05` and `n06` are not December notes; `n07` a cancel; `n10` a duplicate entry; `n11` a cancel matched by `DEC26\s+CANCEL` although it says CANCELLED; `n12` a December note with no code; `n13` a WhatsApp copy, which the counter ignores.

- [ ] **Step 2: Add the SQL counter and the script that checks the golden file against it**

```bash
cd /Users/mac/lanatutors/.claude/worktrees/december-desk
cp /Users/mac/lanatutors/december-2026/count-reservations.sql scripts/crm-verify/december-count.sql
```

`scripts/crm-verify/december-counter.sh`:

```bash
#!/usr/bin/env bash
# Checks the golden December notes against the SQL counter the team used before the desk existed.
#
#   scripts/crm-verify/december-counter.sh           run the counter on a throw-away Postgres and compare
#   scripts/crm-verify/december-counter.sh --write   rewrite "expected" in the fixture from what the SQL answers
#
# The fixture is scripts/crm-tests/fixtures/december-notes.json. The parser in src/utils/decemberDesk.ts is tested against
# the same file (npm run test:crm), so the parser and the SQL cannot drift apart without one of the two checks failing.
# Needs the Postgres 14+ binaries on PATH (Homebrew: export PATH=/opt/homebrew/bin:$PATH). Nothing here touches a real
# database: the cluster lives in a temp folder and listens on 127.0.0.1 only.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
FIXTURE="$HERE/../crm-tests/fixtures/december-notes.json"
PORT="${DECEMBER_VERIFY_PORT:-54331}"
WORK="$(mktemp -d)"
WRITE=0
[ "${1:-}" = "--write" ] && WRITE=1

# macOS: the postmaster refuses to start with an unset or invalid locale in the environment.
export LC_ALL=C LANG=C
for bin in initdb pg_ctl psql python3; do
  command -v "$bin" >/dev/null || { echo "Missing $bin on PATH"; exit 2; }
done

cleanup() {
  pg_ctl -D "$WORK/pgdata" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

initdb -D "$WORK/pgdata" -U postgres --auth=trust -E UTF8 --locale=C >/dev/null
pg_ctl -D "$WORK/pgdata" -l "$WORK/server.log" -w \
  -o "-p $PORT -c listen_addresses=127.0.0.1 -c unix_socket_directories='' -c fsync=off" start >/dev/null
PSQL=(psql -h 127.0.0.1 -p "$PORT" -U postgres -X -q -v ON_ERROR_STOP=1 -d postgres)

# The one table the counter reads, with the columns it uses, and the fixture's notes as rows.
python3 - "$FIXTURE" > "$WORK/load.sql" <<'PY'
import json, sys
fixture = json.load(open(sys.argv[1]))
print("CREATE TABLE public.lead_activities (id text, family_id uuid NOT NULL, kind text NOT NULL, body text);")
for n in fixture["notes"]:
    body = n["body"].replace("'", "''")
    print(f"INSERT INTO public.lead_activities (id, family_id, kind, body) VALUES ('{n['id']}', '{n['family_id']}', '{n['kind']}', '{body}');")
PY
"${PSQL[@]}" -f "$WORK/load.sql"

# One row per class, in the order of the codes: seats and families are the 3rd and 4th columns.
"${PSQL[@]}" -At -F ',' -f "$HERE/december-count.sql" | cut -d',' -f3,4 > "$WORK/answer.csv"

python3 - "$FIXTURE" "$WORK/answer.csv" "$WRITE" <<'PY'
import json, sys
path, answer, write = sys.argv[1], sys.argv[2], sys.argv[3] == "1"
fixture = json.load(open(path))
rows = [line.split(",") for line in open(answer).read().strip().splitlines()]
if len(rows) != len(fixture["expected"]):
    sys.exit(f"The counter returned {len(rows)} rows, the fixture expects {len(fixture['expected'])}")
got = [{"code": e["code"], "seats": int(r[0]), "families": int(r[1])} for e, r in zip(fixture["expected"], rows)]
if write:
    fixture["expected"] = got
    with open(path, "w") as out:
        json.dump(fixture, out, indent=2)
        out.write("\n")
    print("expected rewritten from the SQL counter")
elif got != fixture["expected"]:
    print("SQL counter says:", got)
    print("fixture expects :", fixture["expected"])
    sys.exit(1)
else:
    print("ok: the SQL counter gives the fixture's totals")
PY
```

- [ ] **Step 3: Prove the golden numbers against the SQL**

```bash
chmod +x scripts/crm-verify/december-counter.sh
PATH=/opt/homebrew/bin:$PATH scripts/crm-verify/december-counter.sh
```

Expected: `ok: the SQL counter gives the fixture's totals`. If it prints a mismatch, the SQL is the truth: run it with `--write`, read the diff in the fixture, and use the new numbers in Step 4's expectations. (`git diff --stat` after `--write` must show only the `expected` block changed.)

- [ ] **Step 4: Write the failing tests**

`scripts/crm-tests/decemberDesk.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DECEMBER_CODES,
  DECEMBER_DESK_UNTIL,
  buildSeatNote,
  classCode,
  classState,
  isDeskActive,
  listsDisagree,
  longDay,
  parseDecemberNote,
  readLists,
  shortDay,
  tallyNotes,
  type DeskNote,
} from "../../src/utils/decemberDesk";
import fixture from "./fixtures/december-notes.json";

type Fixture = {
  notes: (DeskNote & { kind: string })[];
  expected: { code: string; seats: number; families: number }[];
};
const { notes: allNotes, expected } = fixture as unknown as Fixture;
// The desk reads timeline notes only, as the SQL counter does (kind = 'note').
const notes = allNotes.filter((n) => n.kind === "note");

describe("parseDecemberNote", () => {
  it("reads the codes and the child's name", () => {
    assert.deepEqual(parseDecemberNote("DEC26 F3-MATHS F3-ENG - Amani"), {
      kind: "reserve",
      codes: ["F3-MATHS", "F3-ENG"],
      child: "Amani",
    });
  });
  it("keeps a hyphen inside the name", () => {
    assert.deepEqual(parseDecemberNote("DEC26 F3-MATHS - Jean-Paul"), {
      kind: "reserve",
      codes: ["F3-MATHS"],
      child: "Jean-Paul",
    });
  });
  it("ignores leading spaces and letter case", () => {
    assert.deepEqual(parseDecemberNote("  dec26 f3-maths - Wanjiru"), {
      kind: "reserve",
      codes: ["F3-MATHS"],
      child: "Wanjiru",
    });
  });
  it("reads a cancel, with or without a name", () => {
    assert.deepEqual(parseDecemberNote("DEC26 CANCEL F3-ENG - Amani"), { kind: "cancel", codes: ["F3-ENG"], child: "Amani" });
    assert.deepEqual(parseDecemberNote("DEC26 CANCEL G8-SCI"), { kind: "cancel", codes: ["G8-SCI"], child: "" });
  });
  it("takes text after the last code as the name even without a dash", () => {
    assert.equal((parseDecemberNote("DEC26 G8-ENG Zawadi") as { child: string }).child, "Zawadi");
  });
  it("counts a code once however often it is repeated", () => {
    assert.deepEqual((parseDecemberNote("DEC26 F3-MATHS F3-MATHS - Kip") as { codes: string[] }).codes, ["F3-MATHS"]);
  });
  it("is not a December note unless it starts with the word DEC26", () => {
    for (const body of ["DEC26X F3-CHEM", "Remember to ask about DEC26 F3-CHEM", "", null, undefined]) {
      assert.equal(parseDecemberNote(body), null, String(body));
    }
  });
  it("calls a December note with no class code unreadable", () => {
    assert.deepEqual(parseDecemberNote("DEC26 hello"), { kind: "unreadable", text: "DEC26 hello" });
    assert.deepEqual(parseDecemberNote("DEC26 CANCEL"), { kind: "unreadable", text: "DEC26 CANCEL" });
  });
});

describe("tallyNotes", () => {
  it("gives the totals the SQL counter gives for the same notes", () => {
    const got = tallyNotes(notes).map((row) => ({ code: row.code, seats: row.seats, families: row.families }));
    assert.deepEqual(got, expected);
  });
  it("lists the six classes in code order even with no notes", () => {
    assert.deepEqual(tallyNotes([]).map((row) => row.code), [...DECEMBER_CODES]);
    assert.ok(tallyNotes([]).every((row) => row.seats === 0 && row.families === 0));
  });
});

describe("readLists", () => {
  const lists = readLists(notes);
  const holders = (code: string) => lists.held.filter((h) => h.code === code).map((h) => h.child || "(no name)");

  it("lists who holds each seat, applying cancels in the order the notes were written", () => {
    assert.deepEqual(holders("F3-MATHS"), ["Amani", "Wanjiru", "Kip"]);
    assert.deepEqual(holders("F3-CHEM"), ["(no name)"]);
    assert.deepEqual(holders("F3-ENG"), []);
    assert.deepEqual(holders("G8-MATHS"), ["Baraka"]);
    assert.deepEqual(holders("G8-ENG"), ["Zawadi", "Zawadi"]);
  });
  it("marks a child reserved twice for the same class", () => {
    assert.equal(lists.duplicates.length, 2);
    assert.ok(lists.duplicates.every((d) => d.code === "G8-ENG" && d.child === "Zawadi"));
  });
  it("lists December notes it could not read, and cancels that match no seat", () => {
    assert.deepEqual(lists.unreadable.map((u) => u.text), ["DEC26 hello"]);
    assert.deepEqual(lists.unmatchedCancels.map((u) => u.code), ["G8-ENG"]);
  });
  it("names the classes whose list does not add up to the total", () => {
    assert.deepEqual(listsDisagree(tallyNotes(notes), lists), ["G8-ENG"]);
  });
  it("takes a seat back from the most recent holder when the cancel names no child", () => {
    const own = readLists([
      { id: "1", family_id: "f", body: "DEC26 F3-ENG - Amani", occurred_at: "2026-11-09T07:00:00+00:00" },
      { id: "2", family_id: "f", body: "DEC26 F3-ENG - Baraka", occurred_at: "2026-11-09T07:01:00+00:00" },
      { id: "3", family_id: "f", body: "DEC26 CANCEL F3-ENG", occurred_at: "2026-11-09T07:02:00+00:00" },
    ]);
    assert.deepEqual(own.held.map((h) => h.child), ["Amani"]);
  });
});

describe("classState", () => {
  it("needs more until 6 seats, then is ready to open", () => {
    assert.deepEqual(classState("active", 0), { state: "needs", needed: 6 });
    assert.deepEqual(classState("active", 5), { state: "needs", needed: 1 });
    assert.deepEqual(classState("active", 6), { state: "ready", needed: 0 });
    assert.deepEqual(classState("active", 9), { state: "ready", needed: 0 });
  });
  it("is running when confirmed and archived when archived, whatever the seats", () => {
    assert.equal(classState("confirmed", 2).state, "running");
    assert.equal(classState("archived", 8).state, "archived");
  });
  it("never counts a negative seat total", () => {
    assert.deepEqual(classState("active", -1), { state: "needs", needed: 6 });
  });
});

describe("classCode", () => {
  const row = (subject: string, grade: string) => ({ subject, grade_levels: [grade] });
  it("maps the six seeded classes to their codes", () => {
    assert.equal(classCode(row("Mathematics", "Form 3")), "F3-MATHS");
    assert.equal(classCode(row("Chemistry", "Form 3")), "F3-CHEM");
    assert.equal(classCode(row("English", "Form 3")), "F3-ENG");
    assert.equal(classCode(row("Mathematics", "Grade 8")), "G8-MATHS");
    assert.equal(classCode(row("Integrated Science", "Grade 8")), "G8-SCI");
    assert.equal(classCode(row("English", "Grade 8")), "G8-ENG");
  });
  it("gives no code to any other class", () => {
    assert.equal(classCode(row("Physics", "Form 3")), null);
    assert.equal(classCode(row("English", "Form 4")), null);
  });
});

describe("buildSeatNote", () => {
  it("writes the exact note format, codes in class order", () => {
    assert.equal(buildSeatNote({ codes: ["F3-ENG", "F3-MATHS"], child: "  Amani  " }), "DEC26 F3-MATHS F3-ENG - Amani");
    assert.equal(buildSeatNote({ codes: ["F3-ENG"], child: "Amani", cancel: true }), "DEC26 CANCEL F3-ENG - Amani");
  });
  it("refuses a note with no child or no class", () => {
    assert.equal(buildSeatNote({ codes: [], child: "Amani" }), null);
    assert.equal(buildSeatNote({ codes: ["F3-ENG"], child: "   " }), null);
  });
  it("is read back by the parser as it was written", () => {
    const note = buildSeatNote({ codes: ["G8-SCI", "G8-MATHS"], child: "Jean-Paul" }) as string;
    assert.deepEqual(parseDecemberNote(note), { kind: "reserve", codes: ["G8-MATHS", "G8-SCI"], child: "Jean-Paul" });
  });
});

describe("dates", () => {
  it("shows the desk through 18 December and not from 19 December", () => {
    assert.equal(DECEMBER_DESK_UNTIL, "2026-12-19");
    assert.equal(isDeskActive("2026-12-18"), true);
    assert.equal(isDeskActive("2026-12-19"), false);
  });
  it("writes days short and long", () => {
    assert.equal(shortDay("2026-11-27"), "Fri 27 Nov");
    assert.equal(longDay("2026-12-04"), "Friday 4 December");
    assert.equal(longDay("2026-12-07"), "Monday 7 December");
  });
});
```

- [ ] **Step 5: Run the tests to see them fail**

Run: `npm run test:crm 2>&1 | tail -12`
Expected: FAIL with an esbuild error, `Could not resolve "../../src/utils/decemberDesk"`.

- [ ] **Step 6: Write the module**

`src/utils/decemberDesk.ts`:

```ts
// The rules behind the December desk (src/pages/admin/CrmDecember.tsx), kept free of React and of the database client so
// they can be tested on their own (scripts/crm-tests/decemberDesk.test.ts).
//
// The team records a reservation as a timeline note, `DEC26 F3-MATHS F3-ENG - Amani`, and takes a seat back with
// `DEC26 CANCEL F3-ENG - Amani`. The seat totals here follow the SQL counter the team used before the desk existed
// (scripts/crm-verify/december-count.sql) rule for rule, and scripts/crm-tests/fixtures/december-notes.json is checked
// against both.

import { MIN_STUDENTS_TO_OPEN } from "./holidayClasses";

export const DECEMBER_CODES = ["F3-MATHS", "F3-CHEM", "F3-ENG", "G8-MATHS", "G8-SCI", "G8-ENG"] as const;
export type DecemberCode = (typeof DECEMBER_CODES)[number];

export const CODE_INFO: Record<DecemberCode, { grade: string; subject: string }> = {
  "F3-MATHS": { grade: "Form 3", subject: "Mathematics" },
  "F3-CHEM": { grade: "Form 3", subject: "Chemistry" },
  "F3-ENG": { grade: "Form 3", subject: "English" },
  "G8-MATHS": { grade: "Grade 8", subject: "Mathematics" },
  "G8-SCI": { grade: "Grade 8", subject: "Integrated Science" },
  "G8-ENG": { grade: "Grade 8", subject: "English" },
};

// The day (exclusive) the desk and its menu entry stop showing. The chat button and Lana's December reply stop on the same
// day; supabase/functions/_tests/december-classes.test.mjs keeps the three equal.
export const DECEMBER_DESK_UNTIL = "2026-12-19";
export const RESERVATIONS_CLOSE = "2026-11-27";
export const PAY_BY = "2026-12-04";
// What the Enrol dialog starts from; the team can change it for a family.
export const DEFAULT_FEE_PER_SUBJECT = 4000;

/** `today` is a YYYY-MM-DD day in Nairobi. */
export const isDeskActive = (today: string): boolean => today < DECEMBER_DESK_UNTIL;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function dayParts(day: string): { weekday: string; date: number; month: string } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(day);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return { weekday: WEEKDAYS[date.getUTCDay()], date: date.getUTCDate(), month: MONTH_NAMES[date.getUTCMonth()] };
}

/** "Fri 27 Nov" from "2026-11-27". */
export function shortDay(day: string): string {
  const p = dayParts(day);
  return p ? `${p.weekday.slice(0, 3)} ${p.date} ${p.month.slice(0, 3)}` : day;
}

/** "Friday 4 December" from "2026-12-04". */
export function longDay(day: string): string {
  const p = dayParts(day);
  return p ? `${p.weekday} ${p.date} ${p.month}` : day;
}

// A code is a whole word, as in the SQL counter's \m ... \M. (JavaScript has no \m, and a look-behind would not run on
// older phones, so the character before the code is matched instead of looked at.)
const WORD = "A-Za-z0-9_";
const codePattern = (code: string, flags = "i"): RegExp => new RegExp(`(^|[^${WORD}])(${code})(?![${WORD}])`, flags);

const IS_DEC26 = /^\s*DEC26\b/i; // SQL: ^\s*DEC26\M
const IS_CANCEL = /DEC26\s+CANCEL/i; // SQL: DEC26\s+CANCEL, anywhere in the body

export type ParsedNote =
  | { kind: "reserve"; codes: DecemberCode[]; child: string }
  | { kind: "cancel"; codes: DecemberCode[]; child: string }
  | { kind: "unreadable"; text: string };

// Where the last class code in the body ends, or -1.
function lastCodeEnd(body: string): number {
  let end = -1;
  for (const code of DECEMBER_CODES) {
    for (const match of body.matchAll(codePattern(code, "gi"))) {
      end = Math.max(end, (match.index ?? 0) + match[1].length + match[2].length);
    }
  }
  return end;
}

/**
 * Reads one timeline note. null when it is not a December note (it must start with the word DEC26). A December note with no
 * class code is "unreadable". The child's name is what follows the last class code, after one hyphen or dash, trimmed.
 */
export function parseDecemberNote(body: string | null | undefined): ParsedNote | null {
  if (!body || !IS_DEC26.test(body)) return null;
  const codes = DECEMBER_CODES.filter((code) => codePattern(code).test(body));
  if (codes.length === 0) return { kind: "unreadable", text: body.trim() };
  const child = body
    .slice(lastCodeEnd(body))
    .replace(/^[\s\-–—:,]+/, "")
    .replace(/\s+/g, " ")
    .trim();
  return { kind: IS_CANCEL.test(body) ? "cancel" : "reserve", codes, child };
}

export type DeskNote = { id: string; family_id: string; body: string | null; occurred_at: string; created_at?: string | null };

export type CodeTally = { code: DecemberCode; reserved: number; takenBack: number; seats: number; families: number };

/**
 * Seats per class by the SQL counter's rule: notes containing the code that are not cancel notes, minus cancel notes
 * containing it, a code counting once per note. `families` is the distinct families with a non-cancel note for the code.
 * Pass timeline notes only (kind = 'note').
 */
export function tallyNotes(notes: DeskNote[]): CodeTally[] {
  const rows = DECEMBER_CODES.map((code) => ({ code, reserved: 0, takenBack: 0, families: new Set<string>() }));
  for (const note of notes) {
    const parsed = parseDecemberNote(note.body);
    if (!parsed || parsed.kind === "unreadable") continue;
    for (const code of parsed.codes) {
      const row = rows.find((r) => r.code === code);
      if (!row) continue;
      if (parsed.kind === "cancel") {
        row.takenBack += 1;
      } else {
        row.reserved += 1;
        row.families.add(note.family_id);
      }
    }
  }
  return rows.map((r) => ({ code: r.code, reserved: r.reserved, takenBack: r.takenBack, seats: r.reserved - r.takenBack, families: r.families.size }));
}

export type Holding = { familyId: string; child: string; code: DecemberCode };

export type DeskLists = {
  held: Holding[];
  unreadable: { familyId: string; text: string }[];
  unmatchedCancels: { familyId: string; code: DecemberCode }[];
  duplicates: Holding[];
};

const sameChild = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Who holds each seat. Best effort: notes are applied in the order written (occurred_at, then created_at, then id); a
 * reservation adds a holding; a cancel removes it from the named child, or from the family's most recent holder of the code
 * when no child is named. The totals come from tallyNotes, not from here.
 */
export function readLists(notes: DeskNote[]): DeskLists {
  const sorted = [...notes].sort(
    (a, b) =>
      a.occurred_at.localeCompare(b.occurred_at) ||
      (a.created_at ?? "").localeCompare(b.created_at ?? "") ||
      a.id.localeCompare(b.id),
  );
  const held: Holding[] = [];
  const unreadable: DeskLists["unreadable"] = [];
  const unmatchedCancels: DeskLists["unmatchedCancels"] = [];

  for (const note of sorted) {
    const parsed = parseDecemberNote(note.body);
    if (!parsed) continue;
    if (parsed.kind === "unreadable") {
      unreadable.push({ familyId: note.family_id, text: parsed.text });
      continue;
    }
    for (const code of parsed.codes) {
      if (parsed.kind === "reserve") {
        held.push({ familyId: note.family_id, child: parsed.child, code });
        continue;
      }
      let index = -1;
      for (let i = held.length - 1; i >= 0; i--) {
        const h = held[i];
        if (h.familyId === note.family_id && h.code === code && (!parsed.child || sameChild(h.child, parsed.child))) {
          index = i;
          break;
        }
      }
      if (index === -1) unmatchedCancels.push({ familyId: note.family_id, code });
      else held.splice(index, 1);
    }
  }

  const key = (h: Holding): string => `${h.familyId}|${h.child.trim().toLowerCase()}|${h.code}`;
  const counts = new Map<string, number>();
  for (const h of held) counts.set(key(h), (counts.get(key(h)) ?? 0) + 1);
  return { held, unreadable, unmatchedCancels, duplicates: held.filter((h) => (counts.get(key(h)) ?? 0) > 1) };
}

/** The classes whose family list does not add up to the total (or that have a cancel matching no seat): "check the notes". */
export function listsDisagree(tally: CodeTally[], lists: DeskLists): DecemberCode[] {
  return tally
    .filter(
      (row) =>
        lists.held.filter((h) => h.code === row.code).length !== Math.max(row.seats, 0) ||
        lists.unmatchedCancels.some((u) => u.code === row.code),
    )
    .map((row) => row.code);
}

export type ClassState = "needs" | "ready" | "running" | "archived";

/** What the card says: Needs N more, Ready to open (6 or more seats), Running (confirmed) or Archived. */
export function classState(status: string, seats: number): { state: ClassState; needed: number } {
  const needed = Math.max(MIN_STUDENTS_TO_OPEN - Math.max(seats, 0), 0);
  if (status === "archived") return { state: "archived", needed };
  if (status === "confirmed") return { state: "running", needed };
  return { state: needed === 0 ? "ready" : "needs", needed };
}

/** The reservation code of a class row, by its grade and subject; null for any other class. */
export function classCode(c: { subject: string; grade_levels: string[] }): DecemberCode | null {
  const grade = c.grade_levels.join(" and ");
  return DECEMBER_CODES.find((code) => CODE_INFO[code].grade === grade && CODE_INFO[code].subject === c.subject) ?? null;
}

/** The note the Add December seats box writes, or null without a child or a class. */
export function buildSeatNote(input: { codes: DecemberCode[]; child: string; cancel?: boolean }): string | null {
  const child = input.child.replace(/\s+/g, " ").trim();
  const codes = DECEMBER_CODES.filter((code) => input.codes.includes(code));
  if (!child || codes.length === 0) return null;
  return `DEC26 ${input.cancel ? "CANCEL " : ""}${codes.join(" ")} - ${child}`;
}
```

- [ ] **Step 7: Run the tests and the type check**

```bash
npm run test:crm 2>&1 | tail -12
npx tsc -p tsconfig.app.json --noEmit; echo "tsc exit $?"
```

Expected: the CRM suite ends `# fail 0` with the new `describe` blocks listed as passing; `tsc exit 0`. If a `readLists` or `tally` assertion fails, compare with the table in Step 1 before changing code: the fixture and SQL are the reference.

- [ ] **Step 8: Commit (only when the owner has said commit; otherwise carry on)**

```bash
git add scripts/crm-tests/fixtures/december-notes.json scripts/crm-tests/decemberDesk.test.ts scripts/crm-verify/december-count.sql scripts/crm-verify/december-counter.sh src/utils/decemberDesk.ts docs/superpowers/specs/2026-11-03-december-desk-design.md docs/superpowers/plans/2026-11-03-december-desk.md
git commit -m "December desk: read the DEC26 reservation notes by the SQL counter's rules, with a golden check

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task 2: The December screen, the nav entry and the route

**Files:**
- Create: `src/components/admin/crm/useDecemberDesk.ts`
- Create: `src/components/admin/crm/DecemberClassCard.tsx`
- Create: `src/pages/admin/CrmDecember.tsx`
- Modify: `src/components/admin/crm/CrmShell.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: everything Task 1 produces; `pickProgram`, `groupByGrade`, `formatProgramRange`, `formatSlot`, `type HolidayProgram` from `src/utils/holidayClasses`; `crmDb` from `./crmTypes`; `nairobiDate` from `./crmMeta`.
- Produces: `useDecemberDesk(): { data: DeskData; loading: boolean; error: string | null; reload: () => Promise<void> }`; types `DeskClass`, `DeskFamily`, `DeskNoteRow`, `DeskData`; `DecemberClassCard` with `HolderRow`; the page default export `CrmDecember`; `CrmSection` gains `"december"`.

There is no unit test for React here; Task 4's walkthrough is the check. Keep the files small and the logic in `decemberDesk.ts`.

- [ ] **Step 1: The data hook**

`src/components/admin/crm/useDecemberDesk.ts`:

```ts
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { pickProgram, type HolidayProgram } from "@/utils/holidayClasses";
import type { DeskNote } from "@/utils/decemberDesk";
import { crmDb } from "./crmTypes";
import { nairobiDate } from "./crmMeta";

export interface DeskClass {
  id: string;
  subject: string;
  curriculum: string;
  grade_levels: string[];
  time_slot: string;
  max_students: number;
  current_enrollment: number;
  status: string;
  tutor_id: string | null;
  meeting_link: string | null;
  tutor_name: string | null;
}

export interface DeskFamily {
  id: string;
  parent_name: string | null;
  phone: string | null;
  email: string | null;
  parent_profile_id: string | null;
}

export type DeskNoteRow = DeskNote & { families: DeskFamily | null };

export interface DeskData {
  program: HolidayProgram | null;
  classes: DeskClass[];
  notes: DeskNoteRow[];
}

const NOTE_LIMIT = 2000;
const EMPTY: DeskData = { program: null, classes: [], notes: [] };

async function readTutorNames(tutorIds: (string | null)[]): Promise<Map<string, string>> {
  const ids = [...new Set(tutorIds.filter((id): id is string => Boolean(id)))];
  const names = new Map<string, string>();
  if (ids.length === 0) return names;
  const { data: tutors, error } = await supabase.from("tutor_profiles").select("id, user_id").in("id", ids);
  if (error) throw error;
  const { data: people, error: peopleError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", (tutors ?? []).map((t) => t.user_id));
  if (peopleError) throw peopleError;
  for (const tutor of tutors ?? []) {
    const name = people?.find((p) => p.id === tutor.user_id)?.full_name;
    if (name) names.set(tutor.id, name);
  }
  return names;
}

/**
 * The December program, its classes and every `DEC26` timeline note. A failed read is an error, never an empty desk: the
 * page shows the error and no seat counts, so nothing reads as zero by mistake.
 */
export function useDecemberDesk() {
  const [data, setData] = useState<DeskData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data: programs, error: programError } = await supabase
        .from("intensive_programs")
        .select("id, name, description, start_date, end_date")
        .eq("is_active", true);
      if (programError) throw programError;
      const program = pickProgram(programs ?? [], nairobiDate());
      if (!program) {
        setData(EMPTY);
        setError(null);
        return;
      }

      const [classRes, noteRes] = await Promise.all([
        supabase
          .from("intensive_classes")
          .select("id, subject, curriculum, grade_levels, time_slot, max_students, current_enrollment, status, tutor_id, meeting_link")
          .eq("program_id", program.id)
          .in("status", ["active", "confirmed", "archived"]),
        crmDb
          .from("lead_activities")
          .select("id, family_id, body, occurred_at, created_at, families(id, parent_name, phone, email, parent_profile_id)")
          .eq("kind", "note")
          .ilike("body", "%DEC26%")
          .order("occurred_at", { ascending: true })
          .limit(NOTE_LIMIT),
      ]);
      if (classRes.error) throw classRes.error;
      if (noteRes.error) throw noteRes.error;
      const notes = (noteRes.data ?? []) as unknown as DeskNoteRow[];
      if (notes.length >= NOTE_LIMIT) throw new Error(`There are ${NOTE_LIMIT} or more December notes, more than the desk reads`);

      const rows = classRes.data ?? [];
      const tutorNames = await readTutorNames(rows.map((c) => c.tutor_id));
      setData({
        program,
        classes: rows.map((c) => ({ ...c, tutor_name: c.tutor_id ? (tutorNames.get(c.tutor_id) ?? null) : null })),
        notes,
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : ((e as { message?: string })?.message ?? "Something went wrong"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}
```

- [ ] **Step 2: The class card**

`src/components/admin/crm/DecemberClassCard.tsx`:

```tsx
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatSlot } from "@/utils/holidayClasses";
import { classCode, classState, type ClassState } from "@/utils/decemberDesk";
import { formatPhone } from "./crmMeta";
import type { DeskClass } from "./useDecemberDesk";

export interface HolderRow {
  key: string;
  familyId: string;
  child: string;
  parentName: string;
  phone: string | null;
  duplicate: boolean;
}

const CHIP: Record<ClassState, { label: (needed: number) => string; className: string }> = {
  needs: { label: (n) => `Needs ${n} more`, className: "bg-amber-100 text-amber-800" },
  ready: { label: () => "Ready to open", className: "bg-emerald-100 text-emerald-800" },
  running: { label: () => "Running", className: "bg-primary/10 text-primary" },
  archived: { label: () => "Archived", className: "bg-muted text-muted-foreground" },
};

interface DecemberClassCardProps {
  cls: DeskClass;
  seats: number;
  holders: HolderRow[];
  checkNotes: boolean;
}

/** One class: its slot, tutor, seats and state, and the families who hold the seats. */
export function DecemberClassCard({ cls, seats, holders, checkNotes }: DecemberClassCardProps) {
  const { state, needed } = classState(cls.status, seats);
  const chip = CHIP[state];
  return (
    <Card className={cn(state === "archived" && "opacity-60")} data-class-code={classCode(cls) ?? ""}>
      <CardHeader className="space-y-1 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold">{cls.subject}</CardTitle>
            <p className="text-xs text-muted-foreground">{formatSlot(cls.time_slot)}</p>
          </div>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", chip.className)}>{chip.label(needed)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Tutor: {cls.tutor_name ?? "No tutor yet"} · Reserved {Math.max(seats, 0)} of {cls.max_students}
          {checkNotes && <span className="ml-1 font-medium text-amber-700">· check the notes</span>}
        </p>
      </CardHeader>
      <CardContent>
        {holders.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nobody has reserved yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {holders.map((h) => (
              <li key={h.key} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {h.child || "(no name)"}
                    {h.duplicate && <span className="ml-2 text-xs font-normal text-amber-700">possible duplicate</span>}
                  </p>
                  <Link to={`/admin/families/${h.familyId}`} className="text-xs text-muted-foreground hover:underline">
                    {h.parentName}
                    {h.phone ? ` · ${formatPhone(h.phone)}` : ""}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: The page**

`src/pages/admin/CrmDecember.tsx`:

```tsx
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CrmShell } from "@/components/admin/crm/CrmShell";
import { DecemberClassCard, type HolderRow } from "@/components/admin/crm/DecemberClassCard";
import { useDecemberDesk } from "@/components/admin/crm/useDecemberDesk";
import { formatProgramRange, groupByGrade } from "@/utils/holidayClasses";
import {
  PAY_BY,
  RESERVATIONS_CLOSE,
  classCode,
  listsDisagree,
  readLists,
  shortDay,
  tallyNotes,
  type DecemberCode,
} from "@/utils/decemberDesk";

/** December: seats per class from the DEC26 timeline notes, and who holds them. */
export default function CrmDecember() {
  const desk = useDecemberDesk();
  const { program, classes, notes } = desk.data;

  const tally = useMemo(() => tallyNotes(notes), [notes]);
  const lists = useMemo(() => readLists(notes), [notes]);
  const disagree = useMemo(() => new Set(listsDisagree(tally, lists)), [tally, lists]);
  const families = useMemo(() => new Map(notes.flatMap((n) => (n.families ? [[n.family_id, n.families] as const] : []))), [notes]);
  const groups = useMemo(() => groupByGrade(classes), [classes]);

  const holdersOf = (code: DecemberCode | null): HolderRow[] =>
    code
      ? lists.held
          .filter((h) => h.code === code)
          .map((h, index) => ({
            key: `${h.familyId}-${h.child}-${index}`,
            familyId: h.familyId,
            child: h.child,
            parentName: families.get(h.familyId)?.parent_name || "Unknown parent",
            phone: families.get(h.familyId)?.phone ?? null,
            duplicate: lists.duplicates.some(
              (d) => d.familyId === h.familyId && d.code === h.code && d.child.trim().toLowerCase() === h.child.trim().toLowerCase(),
            ),
          }))
      : [];

  const subtitle = program
    ? `${formatProgramRange(program.start_date, program.end_date)} · reservations close ${shortDay(RESERVATIONS_CLOSE)} · pay by ${shortDay(PAY_BY)}`
    : undefined;

  return (
    <CrmShell
      title="December"
      subtitle={subtitle}
      active="december"
      actions={
        <Button variant="outline" size="sm" onClick={() => void desk.reload()} className="hidden sm:inline-flex">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      }
    >
      {desk.error ? (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-2">
            <p>Could not load the December desk: {desk.error}. The seat counts are not shown, so nothing here is zero by mistake.</p>
            <Button size="sm" variant="outline" onClick={() => void desk.reload()}>
              Try again
            </Button>
          </div>
        </div>
      ) : desk.loading && !program ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !program ? (
        <p className="py-6 text-sm text-muted-foreground">No December program is running, or it has already ended.</p>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.grade} aria-label={group.grade}>
              <h2 className="text-base font-semibold">
                {group.grade}
                {group.exam && <span className="ml-2 text-sm font-normal text-muted-foreground">Heading for {group.exam}</span>}
              </h2>
              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                {group.classes.map((cls) => {
                  const code = classCode(cls);
                  const seats = tally.find((t) => t.code === code)?.seats ?? 0;
                  return (
                    <DecemberClassCard
                      key={cls.id}
                      cls={cls}
                      seats={seats}
                      holders={holdersOf(code)}
                      checkNotes={code !== null && disagree.has(code)}
                    />
                  );
                })}
              </div>
            </section>
          ))}

          {lists.unreadable.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Notes the desk could not read</CardTitle>
                <p className="text-xs text-muted-foreground">
                  They start with DEC26 but name no class code, so they count as no seat. Fix them on the family's timeline.
                </p>
              </CardHeader>
              <CardContent>
                <ul className="divide-y rounded-md border">
                  {lists.unreadable.map((u, index) => (
                    <li key={`${u.familyId}-${index}`} className="px-3 py-2 text-sm">
                      <p className="break-words">{u.text}</p>
                      <Link to={`/admin/families/${u.familyId}`} className="text-xs text-muted-foreground hover:underline">
                        {families.get(u.familyId)?.parent_name || "Open the family"}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </CrmShell>
  );
}
```

- [ ] **Step 4: The nav entry**

In `src/components/admin/crm/CrmShell.tsx`, replace the import line and the nav block at the top:

```tsx
import { Home, Users, CalendarDays, MoreHorizontal, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export type CrmSection = "today" | "leads" | "lessons" | "family" | "more";

const NAV = [
  { key: "today", label: "Today", to: "/admin", icon: Home },
  { key: "leads", label: "Leads", to: "/admin/leads", icon: Users },
  { key: "lessons", label: "Lessons", to: "/admin/lessons", icon: CalendarDays },
  { key: "more", label: "More", to: "/admin/more", icon: MoreHorizontal },
] as const;
```

with:

```tsx
import { Home, Users, CalendarDays, GraduationCap, MoreHorizontal, ArrowLeft, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { isDeskActive } from "@/utils/decemberDesk";
import { nairobiDate } from "./crmMeta";

export type CrmSection = "today" | "leads" | "lessons" | "december" | "family" | "more";

interface NavItem {
  key: CrmSection;
  label: string;
  to: string;
  icon: LucideIcon;
}

const BASE_NAV: NavItem[] = [
  { key: "today", label: "Today", to: "/admin", icon: Home },
  { key: "leads", label: "Leads", to: "/admin/leads", icon: Users },
  { key: "lessons", label: "Lessons", to: "/admin/lessons", icon: CalendarDays },
];
// Shown until the holiday classes are over (DECEMBER_DESK_UNTIL).
const DECEMBER_NAV: NavItem = { key: "december", label: "December", to: "/admin/december", icon: GraduationCap };
const MORE_NAV: NavItem = { key: "more", label: "More", to: "/admin/more", icon: MoreHorizontal };
```

Then, inside `CrmShell`, after `const location = useLocation();` add:

```tsx
  const nav = isDeskActive(nairobiDate()) ? [...BASE_NAV, DECEMBER_NAV, MORE_NAV] : [...BASE_NAV, MORE_NAV];
```

Replace both `{NAV.map((item) => {` with `{nav.map((item) => {` (two occurrences), and replace `<div className="grid grid-cols-4">` with:

```tsx
        <div className={cn("grid", nav.length === 5 ? "grid-cols-5" : "grid-cols-4")}>
```

- [ ] **Step 5: The route**

In `src/App.tsx`:

After `const CrmLessons = lazy(() => import("./pages/admin/CrmLessons"));` add:

```tsx
const CrmDecember = lazy(() => import("./pages/admin/CrmDecember"));
```

In `isCrmRoute`, after `    location.pathname === "/admin/lessons" ||` add:

```tsx
    location.pathname === "/admin/december" ||
```

After the `/admin/lessons` `<Route .../>` line add:

```tsx
          <Route path="/admin/december" element={<RequireRole roles={["admin"]}><CrmDecember /></RequireRole>} />
```

- [ ] **Step 6: Type check, lint the touched files, build**

```bash
npx tsc -p tsconfig.app.json --noEmit; echo "tsc exit $?"
npx eslint src/utils/decemberDesk.ts src/components/admin/crm/useDecemberDesk.ts src/components/admin/crm/DecemberClassCard.tsx src/pages/admin/CrmDecember.tsx src/components/admin/crm/CrmShell.tsx src/App.tsx; echo "eslint exit $?"
npm run build 2>&1 | tail -6
```

Expected: `tsc exit 0`; eslint exit 0 (if `App.tsx` shows problems, check whether `origin/main` has the same ones with `git show origin/main:src/App.tsx | npx eslint --stdin --stdin-filename src/App.tsx`, and fix only what this edit added); the build ends with the prerender summary and exit 0 (`/admin/december` is not in the sitemap, so no new prerendered page).

- [ ] **Step 7: Commit (only when the owner has said commit)**

```bash
git add src/components/admin/crm/useDecemberDesk.ts src/components/admin/crm/DecemberClassCard.tsx src/pages/admin/CrmDecember.tsx src/components/admin/crm/CrmShell.tsx src/App.tsx
git commit -m "December desk: a CRM screen with seats per class and who holds them

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task 3: Add December seats on the family page

**Files:**
- Create: `src/components/admin/crm/DecemberSeatsDialog.tsx`
- Modify: `src/components/admin/crm/FamilyTimeline.tsx`

**Interfaces:**
- Consumes: `CODE_INFO`, `DECEMBER_CODES`, `buildSeatNote`, `readLists`, `isDeskActive`, `type DecemberCode` (Task 1); `crmDb`, `type LeadActivity` from `./crmTypes`; `nairobiDate` from `./crmMeta`.
- Produces: `DecemberSeatsDialog({ open, onOpenChange, familyId, leadId, activities, onAdded })`.

The note is saved exactly as the timeline's own note box saves one (`crmDb.from("lead_activities").insert({ family_id, lead_id, kind: "note", body })`), so the counter and the desk read it the same way.

- [ ] **Step 1: The dialog**

`src/components/admin/crm/DecemberSeatsDialog.tsx`:

```tsx
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CODE_INFO, DECEMBER_CODES, buildSeatNote, readLists, type DecemberCode } from "@/utils/decemberDesk";
import { crmDb } from "./crmTypes";
import type { LeadActivity } from "./crmTypes";

interface DecemberSeatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyId: string;
  leadId: string | null;
  activities: LeadActivity[];
  onAdded: () => void;
}

const GRADES = ["Form 3", "Grade 8"] as const;

/**
 * Add December seats: writes the DEC26 note in the exact format (see src/utils/decemberDesk.ts), so a mistyped class code
 * cannot lose a seat. "Take a seat back" writes the CANCEL note.
 */
export function DecemberSeatsDialog({ open, onOpenChange, familyId, leadId, activities, onAdded }: DecemberSeatsDialogProps) {
  const [mode, setMode] = useState<"reserve" | "cancel">("reserve");
  const [child, setChild] = useState("");
  const [picked, setPicked] = useState<DecemberCode[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setMode("reserve");
      setChild("");
      setPicked([]);
    }
  }, [open]);

  // What this family already holds, read from its own timeline notes.
  const held = useMemo(
    () =>
      readLists(
        activities
          .filter((a) => a.kind === "note")
          .map((a) => ({ id: a.id, family_id: a.family_id, body: a.body, occurred_at: a.occurred_at, created_at: a.created_at })),
      ).held,
    [activities],
  );
  const children = useMemo(() => [...new Set(held.map((h) => h.child).filter(Boolean))], [held]);
  const holds = useMemo(
    () => new Set(held.filter((h) => h.child.trim().toLowerCase() === child.trim().toLowerCase()).map((h) => h.code)),
    [held, child],
  );

  const choose = (nextMode: "reserve" | "cancel") => {
    setMode(nextMode);
    setPicked([]);
  };
  const toggle = (code: DecemberCode, on: boolean) =>
    setPicked((current) => (on ? [...current, code] : current.filter((c) => c !== code)));

  const note = buildSeatNote({ codes: picked, child, cancel: mode === "cancel" });

  const save = async () => {
    if (!note) return;
    setSaving(true);
    const { error } = await crmDb.from("lead_activities").insert({
      family_id: familyId,
      lead_id: leadId,
      kind: "note",
      body: note,
    });
    setSaving(false);
    if (error) {
      toast.error(`Could not save the seats: ${error.message}`);
      return;
    }
    toast.success(mode === "cancel" ? "Seat taken back" : "Seats noted");
    onOpenChange(false);
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>December seats</DialogTitle>
          <DialogDescription>Adds a note to this family's timeline that the December desk counts.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={mode === "reserve" ? "default" : "outline"} onClick={() => choose("reserve")}>
              Reserve seats
            </Button>
            <Button type="button" size="sm" variant={mode === "cancel" ? "default" : "outline"} onClick={() => choose("cancel")}>
              Take a seat back
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="seats-child">Child's name</Label>
            <Input
              id="seats-child"
              autoComplete="off"
              list="seats-children"
              value={child}
              onChange={(e) => setChild(e.target.value)}
            />
            <datalist id="seats-children">
              {children.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          {GRADES.map((grade) => (
            <fieldset key={grade} className="space-y-2">
              <legend className="text-sm font-medium">{grade}</legend>
              {DECEMBER_CODES.filter((code) => CODE_INFO[code].grade === grade).map((code) => {
                const label = `${CODE_INFO[code].grade} ${CODE_INFO[code].subject}`;
                const already = holds.has(code);
                // Reserving a seat the child already holds, or taking back one it does not hold, is not offered.
                const disabled = mode === "reserve" ? already : !already;
                return (
                  <div key={code} className="flex items-center gap-2">
                    <Checkbox
                      id={`seat-${code}`}
                      aria-label={label}
                      disabled={disabled}
                      checked={picked.includes(code)}
                      onCheckedChange={(on) => toggle(code, on === true)}
                    />
                    <Label htmlFor={`seat-${code}`} className="text-sm font-normal">
                      {CODE_INFO[code].subject}
                      {mode === "reserve" && already ? " (already reserved)" : ""}
                    </Label>
                  </div>
                );
              })}
            </fieldset>
          ))}

          {note && <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">Note: {note}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !note}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {mode === "cancel" ? "Take the seat back" : "Save seats"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: The button on the family timeline**

In `src/components/admin/crm/FamilyTimeline.tsx`:

Replace `  CalendarCheck,\n  Info,` (inside the lucide import list) with:

```tsx
  CalendarCheck,
  GraduationCap,
  Info,
```

Replace `import { formatDue } from "./crmMeta";` with:

```tsx
import { isDeskActive } from "@/utils/decemberDesk";
import { formatDue, nairobiDate } from "./crmMeta";
import { DecemberSeatsDialog } from "./DecemberSeatsDialog";
```

After `  const [saving, setSaving] = useState(false);` add:

```tsx
  const [seatsOpen, setSeatsOpen] = useState(false);
  const deskActive = isDeskActive(nairobiDate());
```

Replace `      <ol className="space-y-2">` with:

```tsx
      {deskActive && (
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={() => setSeatsOpen(true)}>
            <GraduationCap className="h-4 w-4" />
            December seats
          </Button>
        </div>
      )}

      <ol className="space-y-2">
```

Replace the end of the component, `      </ol>\n    </div>\n  );\n}`, with:

```tsx
      </ol>

      <DecemberSeatsDialog
        open={seatsOpen}
        onOpenChange={setSeatsOpen}
        familyId={familyId}
        leadId={leadId}
        activities={activities}
        onAdded={onAdded}
      />
    </div>
  );
}
```

- [ ] **Step 3: Type check and lint**

```bash
npx tsc -p tsconfig.app.json --noEmit; echo "tsc exit $?"
npx eslint src/components/admin/crm/DecemberSeatsDialog.tsx src/components/admin/crm/FamilyTimeline.tsx; echo "eslint exit $?"
```

Expected: both exit 0.

- [ ] **Step 4: Commit (only when the owner has said commit)**

```bash
git add src/components/admin/crm/DecemberSeatsDialog.tsx src/components/admin/crm/FamilyTimeline.tsx
git commit -m "December desk: an Add December seats box on the family page

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task 4: Phase 1 walkthrough, whole-repo checks and the first pull request

**Files:**
- Create: `scripts/crm-verify/december-walkthrough.js`

**Interfaces:**
- Consumes: the built app from Tasks 2 and 3.
- Produces: a walkthrough that returns `{ width, results, failed, errors }`; every result must be ok and `errors` must be empty.

The walkthrough follows `scripts/crm-verify/walkthrough.js`: a made-up admin session in `localStorage`, and every request to the Supabase host answered from fixtures, so no real data is read or written.

- [ ] **Step 1: Write the walkthrough**

`scripts/crm-verify/december-walkthrough.js`:

```js
// Headless walkthrough of the December desk (Phase 1) against a mocked Supabase.
//
// Run it with the Playwright MCP tool browser_run_code_unsafe (filename = this file), after
//   npm run build && npx vite preview --port 4179 --strictPort --host 127.0.0.1
// and after browser_resize (1280x800 for a desktop, 390x844 for a phone). Edit BASE and OUT if the port or the screenshot
// folder differ. Nothing real is touched: every request to the Supabase host is answered from the fixtures below.
//
// It signs in as a fake admin, opens /admin/december and checks the counts, the family lists, the "check the notes" and
// "possible duplicate" marks and the unreadable-notes list; makes the classes request fail and checks the desk shows an
// error and no counts; then opens a family page, opens December seats, reserves Form 3 Mathematics for a child and checks
// the exact note that was saved. It returns { width, results, failed, errors }.
async (page) => {
  const BASE = "http://127.0.0.1:4179";
  const OUT = "/tmp/december-walkthrough";
  const SUPA = "https://iccemuiqcdumgxiwxzdq.supabase.co";
  const WIDTH = (page.viewportSize() || { width: 1280 }).width;
  const results = [];
  const errors = [];
  const posts = [];
  const check = (name, ok, detail) => results.push({ name, ok: Boolean(ok), detail: detail === undefined ? "" : String(detail) });

  // ------------------------------------------------------------ fixtures (all invented)
  const ADMIN = "a0000000-0000-4000-8000-000000000001";
  const F1 = "f0000000-0000-4000-8000-000000000001";
  const iso = (t) => new Date(t).toISOString();
  const nowMs = Date.now();
  const D = 24 * 3600e3;
  const FA = "a0000000-0000-4000-8000-00000000000a";
  const FB = "b0000000-0000-4000-8000-00000000000b";
  const FC = "c0000000-0000-4000-8000-00000000000c";
  const FE = "e0000000-0000-4000-8000-00000000000e";
  const fam = (id, name, phone) => ({ id, parent_name: name, phone, email: null, parent_profile_id: null });
  const FAMILIES = { [FA]: fam(FA, "Mrs Alpha", "254712000001"), [FB]: fam(FB, "Mrs Beta", "254712000002"), [FC]: fam(FC, "Mrs Gamma", "254712000003"), [FE]: fam(FE, "Mrs Epsilon", "254712000005") };
  const program = { id: "90000000-0000-4000-8000-000000000001", name: "December 2099 Holiday Classes", description: null, start_date: "2099-12-07", end_date: "2099-12-18", is_active: true };
  const cls = (n, subject, curriculum, grade, slot) => ({ id: `c${n}000000-0000-4000-8000-000000000000`, program_id: program.id, subject, curriculum, grade_levels: [grade], time_slot: slot, max_students: 12, current_enrollment: 0, status: "active", tutor_id: null, meeting_link: null });
  const classes = [
    cls(1, "Mathematics", "8-4-4", "Form 3", "8:00 AM - 9:15 AM"),
    cls(2, "Chemistry", "8-4-4", "Form 3", "9:30 AM - 10:45 AM"),
    cls(3, "English", "8-4-4", "Form 3", "11:00 AM - 12:15 PM"),
    cls(4, "Mathematics", "CBC", "Grade 8", "8:00 AM - 9:15 AM"),
    cls(5, "Integrated Science", "CBC", "Grade 8", "9:30 AM - 10:45 AM"),
    cls(6, "English", "CBC", "Grade 8", "11:00 AM - 12:15 PM"),
  ];
  let t = 0;
  const note = (family, body, kind = "note") => ({ id: `n${++t}`, family_id: family, kind, body, occurred_at: iso(nowMs - D + t * 60e3), created_at: iso(nowMs - D + t * 60e3), families: FAMILIES[family] });
  const notes = [
    note(FA, "DEC26 F3-MATHS F3-ENG - Amani"),
    note(FA, "DEC26 G8-MATHS - Baraka"),
    note(FB, "  dec26 f3-maths - Wanjiru"),
    note(FC, "DEC26 F3-MATHS F3-MATHS - Kip"),
    note(FA, "DEC26 CANCEL F3-ENG - Amani"),
    note(FB, "DEC26 F3-CHEM G8-SCI"),
    note(FE, "DEC26 G8-ENG - Zawadi"),
    note(FE, "DEC26 G8-ENG - Zawadi"),
    note(FC, "DEC26 CANCELLED G8-ENG"),
    note(FA, "DEC26 hello"),
  ];
  const family = { id: F1, parent_name: "Test Parent", phone: "254712000111", email: "parent@example.test", area: null, parent_profile_id: null, status: "prospect", notes: null, created_at: iso(nowMs - 20 * D), updated_at: iso(nowMs) };
  const lead = { id: "l0000000-0000-4000-8000-000000000001", family_id: F1, channel: "phone", source_table: null, source_id: null, stage: "call_done", owner_id: null, next_step: "Send the package", next_step_at: iso(nowMs + D), next_step_owner_id: null, needs_reply: false, student_name: "Amani Test", grade_level: "Grade 6", curriculum: "CBC", subjects: ["Maths"], mode: null, budget: null, urgency: null, assessment_at: null, assessment_outcome: null, recommended_tutor_id: null, quoted_rate_kes: null, quoted_package: null, lost_reason: null, won_at: null, lost_at: null, created_at: iso(nowMs - 10 * D), updated_at: iso(nowMs), last_activity_at: iso(nowMs - D), families: { id: F1, parent_name: family.parent_name, phone: family.phone, email: family.email, status: "prospect" } };
  const ownNotes = [{ id: "own1", family_id: F1, lead_id: lead.id, kind: "note", body: "DEC26 F3-ENG - Amani Test", meta: {}, source_table: null, source_id: null, created_by: ADMIN, occurred_at: iso(nowMs - D), created_at: iso(nowMs - D) }];

  let failClasses = false;
  const tableRows = (table) => ({
    intensive_programs: () => [program],
    intensive_classes: () => classes,
    lead_activities: () => notes.concat(ownNotes),
    leads: () => [lead],
    families: () => [family],
    crm_settings: () => [{ id: true, default_owner_id: null, lessons_from: iso(nowMs - 40 * D), updated_at: iso(nowMs) }],
  }[table] || (() => []))();

  const matches = (row, key, value) => {
    const m = /^(eq|neq|in)\.(.*)$/.exec(value);
    if (!m) return true;
    const [, op, arg] = m;
    const cell = String(row[key]);
    if (op === "eq") return cell === arg;
    if (op === "neq") return cell !== arg;
    return arg.replace(/^\(|\)$/g, "").split(",").map((s) => s.replace(/^"|"$/g, "")).includes(cell);
  };
  const query = (table, params) => {
    let rows = tableRows(table).slice();
    for (const [key, value] of params.entries()) {
      if (["select", "order", "limit", "offset", "columns"].includes(key)) continue;
      rows = rows.filter((r) => matches(r, key, value));
    }
    const limit = Number(params.get("limit"));
    return limit ? rows.slice(0, limit) : rows;
  };

  const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS", "access-control-expose-headers": "*" };
  const reply = (route, status, body) => route.fulfill({ status, contentType: "application/json", headers: CORS, body: body === undefined ? "" : JSON.stringify(body) });
  const session = { access_token: "aaa.bbb.ccc", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 30 * 86400, refresh_token: "r", user: { id: ADMIN, aud: "authenticated", role: "authenticated", email: "admin@example.test", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" } };

  await page.route(`${SUPA}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const wantsObject = (req.headers()["accept"] || "").includes("vnd.pgrst.object+json");
    try {
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      if (path.startsWith("/auth/v1/")) return reply(route, 200, path.endsWith("/user") ? session.user : session);
      if (path.startsWith("/functions/v1/")) return reply(route, 200, {});
      if (path.startsWith("/rest/v1/rpc/")) {
        const name = path.split("/").pop();
        if (name === "has_role") return reply(route, 200, true);
        if (name === "crm_team_members") return reply(route, 200, [{ user_id: ADMIN, full_name: "Test Admin" }]);
        return reply(route, 404, { message: "unknown rpc " + name });
      }
      if (path.startsWith("/rest/v1/")) {
        const table = path.split("/").pop();
        if (req.method() === "GET") {
          if (table === "intensive_classes" && failClasses) return reply(route, 500, { message: "classes are down" });
          const rows = query(table, url.searchParams);
          if (wantsObject) return rows.length ? reply(route, 200, rows[0]) : reply(route, 406, { code: "PGRST116", message: "no rows" });
          return reply(route, 200, rows);
        }
        if (req.method() === "POST") {
          const body = req.postData() ? JSON.parse(req.postData()) : null;
          posts.push({ table, body });
          return reply(route, 201);
        }
        return reply(route, 204);
      }
      return reply(route, 200, []);
    } catch (e) {
      errors.push("mock: " + e.message);
      return reply(route, 500, { message: e.message });
    }
  });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1|localhost|iccemuiqcdumgxiwxzdq\.supabase\.co)/, (route) => route.abort());
  await page.addInitScript((value) => { try { localStorage.setItem("sb-iccemuiqcdumgxiwxzdq-auth-token", JSON.stringify(value)); } catch (e) { /* no storage */ } }, session);

  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|net::ERR_/.test(m.text())) errors.push("console: " + m.text()); });

  const noOverflow = async (label) => {
    const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`${label}: no sideways scrolling at ${WIDTH}px`, wide <= 1, `${wide}px wider than the window`);
  };
  const shot = (name) => page.screenshot({ path: `${OUT}/${name}-${WIDTH}.png`, fullPage: true });
  const visible = async (locator, name, timeout = 8000) => {
    try { await locator.first().waitFor({ state: "visible", timeout }); check(name, true); return true; } catch (e) { check(name, false, e.message.split("\n")[0]); return false; }
  };
  const card = (code) => page.locator(`[data-class-code="${code}"]`);
  const text = async (locator) => ((await locator.first().textContent()) || "").replace(/\s+/g, " ");

  // ------------------------------------------------------------ 1. The desk
  await page.goto(`${BASE}/admin/december`);
  await visible(card("F3-MATHS"), "Desk: the Form 3 Mathematics card is there");
  check("Desk: six class cards", (await page.locator("[data-class-code]").count()) === 6, await page.locator("[data-class-code]").count());
  const maths = await text(card("F3-MATHS"));
  check("Desk: Form 3 Mathematics shows 3 reserved and needs 3 more", /Reserved 3 of 12/.test(maths) && /Needs 3 more/.test(maths), maths);
  check("Desk: Form 3 Mathematics lists Amani, Wanjiru and Kip", ["Amani", "Wanjiru", "Kip"].every((n) => maths.includes(n)), maths);
  const english = await text(card("F3-ENG"));
  check("Desk: Form 3 English is back to 0 after the cancel", /Reserved 0 of 12/.test(english), english);
  const g8eng = await text(card("G8-ENG"));
  check("Desk: Grade 8 English says check the notes and flags the duplicate", /check the notes/.test(g8eng) && /possible duplicate/.test(g8eng), g8eng);
  check("Desk: the other cards do not say check the notes", !/check the notes/.test(maths) && !/check the notes/.test(english));
  await visible(page.getByText("Notes the desk could not read"), "Desk: the unreadable-notes list is there");
  await visible(page.getByText("DEC26 hello"), "Desk: it shows the unreadable note");
  await visible(page.getByRole("link", { name: "December" }).last(), "Desk: December is in the navigation");
  await visible(page.getByText(/reservations close Fri 27 Nov/), "Desk: the cut-off is in the heading");
  await noOverflow("Desk");
  await shot("1-desk");

  // ------------------------------------------------------------ 2. A failed read shows an error, never zeros
  failClasses = true;
  await page.reload();
  await visible(page.getByText(/Could not load the December desk/), "Failure: the desk says it could not load");
  check("Failure: no seat counts are shown", (await page.locator("[data-class-code]").count()) === 0);
  await shot("2-failure");
  failClasses = false;

  // ------------------------------------------------------------ 3. Add December seats on a family page
  await page.goto(`${BASE}/admin/families/${F1}`);
  await visible(page.getByRole("button", { name: "December seats" }), "Family: the December seats button is there");
  await page.getByRole("button", { name: "December seats" }).click();
  const dialog = page.getByRole("dialog");
  await visible(dialog.getByText("Adds a note to this family's timeline"), "Seats: the dialog opens");
  check("Seats: before a name is typed nothing is marked already reserved", (await dialog.getByText(/already reserved/).count()) === 0);
  await dialog.locator("#seats-child").fill("Amani Test");
  await visible(dialog.getByText(/English \(already reserved\)/), "Seats: Amani Test already holds Form 3 English");
  await dialog.locator("#seats-child").fill("Zuri");
  await dialog.getByRole("checkbox", { name: "Form 3 Mathematics" }).click();
  await visible(dialog.getByText("Note: DEC26 F3-MATHS - Zuri"), "Seats: it previews the exact note");
  await shot("3-seats-dialog");
  await dialog.getByRole("button", { name: "Save seats" }).click();
  await visible(page.getByText("Seats noted"), "Seats: saving says so");
  await page.waitForTimeout(400);
  const saved = posts.find((p) => p.table === "lead_activities");
  check("Seats: the saved note is exactly DEC26 F3-MATHS - Zuri", saved && saved.body.body === "DEC26 F3-MATHS - Zuri", JSON.stringify(saved));
  check("Seats: it is a note on this family", saved && saved.body.kind === "note" && saved.body.family_id === F1, JSON.stringify(saved));
  await noOverflow("Family");

  return { width: WIDTH, results, failed: results.filter((r) => !r.ok), errors };
}
```

- [ ] **Step 2: Build and run it at both widths**

```bash
cd /Users/mac/lanatutors/.claude/worktrees/december-desk
npm run build 2>&1 | tail -3
(npx vite preview --port 4179 --strictPort --host 127.0.0.1 > /tmp/december-preview.log 2>&1 &)
sleep 3; curl -s -o /dev/null -w "preview %{http_code}\n" http://127.0.0.1:4179/
```

Expected: `preview 200`. Then with the Playwright MCP tools: `browser_resize` to 1280x800, then `browser_run_code_unsafe` with `filename` `/Users/mac/lanatutors/.claude/worktrees/december-desk/scripts/crm-verify/december-walkthrough.js`. Expected: `failed: []` and `errors: []`. Repeat after `browser_resize` to 390x844 (also check that `Desk: December is in the navigation` finds the bottom-bar link). If the script dies with "Target page, context or browser has been closed" partway, `browser_navigate` to `about:blank` and run it again (a known flake). Stop the server afterwards: `lsof -ti tcp:4179 -sTCP:LISTEN | xargs kill`.

If a check fails because the app differs from what this script assumes (a label, a heading), fix the script to match the app only when the app is right; if the app is wrong, fix the app and re-run Task 2 or 3's checks.

- [ ] **Step 3: Whole-repo checks**

```bash
npm run test:crm 2>&1 | tail -6
npm run test:edge 2>&1 | tail -6
npx tsc -p tsconfig.app.json --noEmit; echo "tsc exit $?"
npm run build 2>&1 | tail -4
git status -sb | head -12
```

Expected: both suites `# fail 0` (the CRM total is the Task 0 total plus the new tests); `tsc exit 0`; build exit 0; `git status` lists only this phase's files.

- [ ] **Step 4: Commit (only when the owner has said commit), then stop for the owner**

```bash
git add scripts/crm-verify/december-walkthrough.js
git commit -m "December desk: a mocked walkthrough of the desk and Add December seats

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

Phase 1 is done. Do not push, open a pull request, merge or publish without the owner's go-ahead. When it is given, the pull request description says what the screen shows and that nothing is applied to the database; it carries no business figures. Publishing is `gh pr merge` then the Lovable `deploy_project` (see the notes on publishing), and needs no function deploy. After publishing, check the live bundle for the `CrmDecember` chunk.

---

## Phase 2: open, enrol and ask for payment

Start Phase 2 on its own branch, from the latest `origin/main` once Phase 1 is merged. If the owner wants to start before the merge, stack it on Phase 1's branch instead and retarget the pull request later.

```bash
cd /Users/mac/lanatutors/.claude/worktrees/december-desk
git fetch origin
git switch -c claude/december-desk-enrol origin/main      # after Phase 1 is merged
# or, stacked: git switch -c claude/december-desk-enrol    (from claude/december-desk)
```

### Task 5: The fake database learns what the Enrol step needs

**Files:**
- Modify: `supabase/functions/_tests/harness.mjs`
- Create: `supabase/functions/_tests/harness.test.mjs`

**Interfaces:**
- Produces (on the harness's fake supabase client): `.delete()`, `.range(from, to)`, a generated `id` for rows inserted into `students`, `intensive_enrollments`, `lead_activities` and `payments`, production's seat trigger on `intensive_enrollments` (insert takes a seat in each of its classes, delete gives it back), and `world.failInserts[table] = n` (the next `n` inserts into that table fail with `{ message: "boom" }`).

- [ ] **Step 1: Write the failing tests**

`supabase/functions/_tests/harness.test.mjs`:

```js
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
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test supabase/functions/_tests/harness.test.mjs 2>&1 | tail -20`
Expected: FAIL; the first test finds no `id` on the inserted row, `delete` is not a function, and `failInserts` is undefined.

- [ ] **Step 3: Teach the harness**

In `supabase/functions/_tests/harness.mjs`, make these seven edits.

Replace

```js
// The slice of the supabase-js query builder the functions use, over in-memory tables.
class Query {
```

with

```js
// Tables whose rows get a uuid `id` from the database when an insert does not give one.
const GENERATED_ID_TABLES = new Set(["students", "intensive_enrollments", "lead_activities", "payments"]);

// Production's update_intensive_enrollment_count trigger: an enrolment takes a seat in each of its classes when it is
// inserted and gives it back when it is deleted. It does nothing on update, as in production.
function adjustSeats(world, enrolments, step) {
  for (const enrolment of enrolments) {
    for (const klass of world.tables.intensive_classes ?? []) {
      if ((enrolment.enrolled_class_ids ?? []).includes(klass.id)) {
        klass.current_enrollment = Math.max(0, (klass.current_enrollment ?? 0) + step);
      }
    }
  }
}

// The slice of the supabase-js query builder the functions use, over in-memory tables.
class Query {
```

Replace `  limit(count) { this.cap = count; return this; }` with:

```js
  limit(count) { this.cap = count; return this; }
  range(from, to) { this.window = [from, to]; return this; }
  delete() { this.op = "delete"; return this; }
```

Replace

```js
    if (this.op === "insert") {
      // phone_number is the primary key, as in production.
```

with

```js
    if (this.op === "insert") {
      // A test can make the next insert(s) into a table fail, as the database would on a constraint or a dropped connection.
      if ((this.world.failInserts[this.table] ?? 0) > 0) {
        this.world.failInserts[this.table] -= 1;
        return { data: null, error: { code: "XX000", message: "boom" } };
      }
      // phone_number is the primary key, as in production.
```

Replace

```js
        : { escalated: false, messages: [], ...clone(this.payload), created_at: this.payload.created_at ?? at, updated_at: at };
      rows.push(row);
      out = [row];
```

with

```js
        : { escalated: false, messages: [], ...(GENERATED_ID_TABLES.has(this.table) ? { id: crypto.randomUUID() } : {}), ...clone(this.payload), created_at: this.payload.created_at ?? at, updated_at: at };
      rows.push(row);
      if (this.table === "intensive_enrollments") adjustSeats(this.world, [row], 1);
      out = [row];
```

Replace

```js
    } else {
      out = rows.filter(matches);
      if (this.sort) {
```

with

```js
    } else if (this.op === "delete") {
      out = rows.filter(matches);
      for (const row of out) rows.splice(rows.indexOf(row), 1);
      if (this.table === "intensive_enrollments") adjustSeats(this.world, out, -1);
    } else {
      out = rows.filter(matches);
      if (this.sort) {
```

Replace `      if (this.cap !== null) out = out.slice(0, this.cap);` with:

```js
      if (this.cap !== null) out = out.slice(0, this.cap);
      if (this.window) out = out.slice(this.window[0], this.window[1] + 1);
```

Replace `    failInsert: Boolean(failInsert), // the next insert into consultation_bookings fails` with:

```js
    failInsert: Boolean(failInsert), // the next insert into consultation_bookings fails
    failInserts: {}, // table name to how many of its next inserts fail, e.g. world.failInserts.intensive_enrollments = 1
```

- [ ] **Step 4: Run the new tests, then the whole edge suite**

```bash
node --test supabase/functions/_tests/harness.test.mjs 2>&1 | tail -12
npm run test:edge 2>&1 | tail -8
```

Expected: the six harness tests pass; the whole suite ends `# fail 0` with the Task 0 total plus 6. If an older test fails, it relied on a table row having no `id` (a `payments` or `lead_activities` row compared whole): compare by the fields it cares about; do not remove the id.

- [ ] **Step 5: Commit (only when the owner has said commit)**

```bash
git add supabase/functions/_tests/harness.mjs supabase/functions/_tests/harness.test.mjs
git commit -m "December desk: the test database learns delete, ranges, generated ids and the seat trigger

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task 6: A class can be `confirmed`

**Files:**
- Modify: `src/utils/holidayClasses.ts`
- Modify: `src/pages/DecemberClasses.tsx`
- Modify: `src/components/admin/AdminIntensivePrograms.tsx`
- Modify: `supabase/functions/sync-bootcamp-to-calendar/index.ts`
- Test: `supabase/functions/_tests/holiday-classes-page.test.mjs`, `supabase/functions/_tests/bootcamp-functions.test.mjs`

**Interfaces:**
- Produces: `isRunning(c: { status?: string | null }): boolean` and `seatsLeft(c: { max_students: number; current_enrollment?: number | null }): number` in `src/utils/holidayClasses.ts`; `HolidayClass` gains optional `current_enrollment` and `status`. The public page lists classes whose status is `active` or `confirmed`; Bootcamp Admin lists the same; the calendar sync creates events for `confirmed` classes only.

- [ ] **Step 1: Write the failing tests**

Append to `supabase/functions/_tests/holiday-classes-page.test.mjs`:

```js

test("a confirmed class is running, and the page can say how many seats are left", () => {
  assert.equal(h.isRunning({ status: "confirmed" }), true);
  assert.equal(h.isRunning({ status: "active" }), false);
  assert.equal(h.isRunning({}), false);
  assert.equal(h.seatsLeft({ max_students: 12, current_enrollment: 5 }), 7);
  assert.equal(h.seatsLeft({ max_students: 12, current_enrollment: 15 }), 0);
  assert.equal(h.seatsLeft({ max_students: 12 }), 12);
});
```

In `supabase/functions/_tests/bootcamp-functions.test.mjs`:

Replace `current_enrollment: 3, status: "active", ...extra,` with `current_enrollment: 3, status: "confirmed", ...extra,`.

Replace

```js
  const archived = klass(3, "prog-2099", "Physics", "9:30 AM - 10:45 AM", { status: "archived" });
```

with

```js
  const archived = klass(3, "prog-2099", "Physics", "9:30 AM - 10:45 AM", { status: "archived" });
  const reserving = klass(5, "prog-2099", "Chemistry", "9:30 AM - 10:45 AM", { status: "active" }); // still taking reservations
```

Replace `classes: [maths, english, archived, lastYears] });` with `classes: [maths, english, archived, reserving, lastYears] });`.

Replace

```js
  assert.ok(fn.world.googleEvents.every((e) => !/Physics|Biology/.test(e.summary)), "no archived class, no other year's class");
```

with

```js
  assert.ok(
    fn.world.googleEvents.every((e) => !/Physics|Biology|Chemistry/.test(e.summary)),
    "no archived class, no class still taking reservations, no other year's class",
  );
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm run test:edge 2>&1 | grep -E "^# (pass|fail)|not ok" | head`
Expected: FAIL in the new `holiday-classes-page` test (`h.isRunning is not a function`) and in the sync tests (the sync still reads `active` classes, so the now-`confirmed` classes produce no events).

- [ ] **Step 3: The helpers**

In `src/utils/holidayClasses.ts`, replace

```ts
  time_slot: string;
  max_students: number;
};
```

with

```ts
  time_slot: string;
  max_students: number;
  // Seats held, and where the class stands: `active` takes reservations, `confirmed` is running.
  current_enrollment?: number | null;
  status?: string | null;
};
```

and replace `export const MIN_STUDENTS_TO_OPEN = 6;` with:

```ts
export const MIN_STUDENTS_TO_OPEN = 6;

// A class the team has opened is running; until then it only takes reservations.
export const isRunning = (c: { status?: string | null }): boolean => c.status === "confirmed";

// Seats left in a class, from the seats the database counts (an enrolment holds a seat from the day it is made).
export const seatsLeft = (c: { max_students: number; current_enrollment?: number | null }): number =>
  Math.max(c.max_students - (c.current_enrollment ?? 0), 0);
```

- [ ] **Step 4: The calendar sync**

In `supabase/functions/sync-bootcamp-to-calendar/index.ts`:

Replace `    // Active classes of those programs only` with `    // Confirmed (running) classes of those programs only`.

Replace

```ts
      .eq("status", "active")
      .in("program_id", programs.map((p) => p.id));
```

with

```ts
      .eq("status", "confirmed")
      .in("program_id", programs.map((p) => p.id));
```

Replace ``console.log(`Found ${classes?.length || 0} active classes in ${programs.length} program(s)`);`` with ``console.log(`Found ${classes?.length || 0} confirmed classes in ${programs.length} program(s)`);``.

Replace `return respond({ message: "No active classes to sync" });` with `return respond({ message: "No confirmed classes to sync. Open a class on the December desk first" });`.

- [ ] **Step 5: The public page and Bootcamp Admin**

In `src/pages/DecemberClasses.tsx`:

Replace

```tsx
  groupByGrade,
  pickProgram,
  reserveMessage,
```

with

```tsx
  groupByGrade,
  isRunning,
  pickProgram,
  reserveMessage,
  seatsLeft,
```

Replace `.select("id, subject, curriculum, grade_levels, time_slot, max_students")` with `.select("id, subject, curriculum, grade_levels, time_slot, max_students, current_enrollment, status")`.

Replace `          .eq("status", "active");` with `          .in("status", ["active", "confirmed"]);`.

Replace

```tsx
                        <p className="text-sm text-muted-foreground">
                          Up to {c.max_students} students. Opens when {MIN_STUDENTS_TO_OPEN} reserve.
                        </p>
```

with

```tsx
                        <p className="text-sm text-muted-foreground">
                          {isRunning(c)
                            ? seatsLeft(c) > 0
                              ? `Running. ${seatsLeft(c)} ${seatsLeft(c) === 1 ? "seat" : "seats"} left.`
                              : "Running. Full."
                            : `Up to ${c.max_students} students. Opens when ${MIN_STUDENTS_TO_OPEN} reserve.`}
                        </p>
```

In `src/components/admin/AdminIntensivePrograms.tsx`, replace

```tsx
        .select("*")
        .eq("status", "active")
        .order("time_slot");
```

with

```tsx
        .select("*")
        .in("status", ["active", "confirmed"])
        .order("time_slot");
```

- [ ] **Step 6: Run everything**

```bash
npm run test:edge 2>&1 | grep -E "^# (pass|fail)"
npx tsc -p tsconfig.app.json --noEmit; echo "tsc exit $?"
npx eslint src/utils/holidayClasses.ts src/pages/DecemberClasses.tsx src/components/admin/AdminIntensivePrograms.tsx; echo "eslint exit $?"
```

Expected: `# fail 0`; `tsc exit 0`; eslint exit 0, or only problems that already exist on `origin/main` for those files (`AdminIntensivePrograms.tsx` is old: compare before fixing anything).

- [ ] **Step 7: Commit (only when the owner has said commit)**

```bash
git add src/utils/holidayClasses.ts src/pages/DecemberClasses.tsx src/components/admin/AdminIntensivePrograms.tsx supabase/functions/sync-bootcamp-to-calendar/index.ts supabase/functions/_tests/holiday-classes-page.test.mjs supabase/functions/_tests/bootcamp-functions.test.mjs
git commit -m "December desk: a class can be confirmed; the page, Bootcamp Admin and the calendar sync know it

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task 7: The Enrol step: `enrol-december-family`

**Files:**
- Create: `supabase/functions/_shared/december.ts`
- Create: `supabase/functions/enrol-december-family/index.ts`
- Create: `supabase/functions/_tests/enrol-december-family.test.mjs`
- Modify: `supabase/config.toml`

**Interfaces:**
- Consumes: `guardInternal` from `_shared/auth-guard.ts`; the function `create-parent-profile` (called with the caller's own token); the harness from Task 5.
- Produces: the pure helpers `UUID`, `PLACEHOLDER_DOMAIN`, `readEnrolInput(body: unknown): { ok: true; value: EnrolInput } | { ok: false; error: string }`, `lastNineDigits(phone: unknown): string | null`, `loginsWithPhone(profiles, phone): string[]`, `nairobiToday(now?: Date): string`, `sameSet(a: string[], b: string[]): boolean`; and the HTTP contract: POST `{ familyId, childName, classIds, feePerSubject, parentName?, phone?, email? }` returns 200 `{ success: true, enrollmentId, loginId, childId, loginCreated, emailIsPlaceholder, alreadyEnrolled, replaced, totalAmount }` or an error `{ error, code? }` with 400, 401, 403, 404, 409 (`class_not_running`, `class_full`, `already_paid`, `ambiguous_login`, `wrong_program`), 500, or 502 (the login could not be made).

- [ ] **Step 1: Write the failing tests**

`supabase/functions/_tests/enrol-december-family.test.mjs`:

```js
// Run with `npm run test:edge`. enrol-december-family: the team enrols a child who reserved a December class. A mistake here
// puts a child in a class that is not running, in a full class or twice, or gives a family a second login, so each rule has
// its own test.
import assert from "node:assert/strict";
import { test } from "node:test";
import { loadFunction, loadModule } from "./harness.mjs";

const d = await loadModule("_shared/december.ts");

const FAMILY = "f1000000-0000-4000-8000-000000000001";
const PROGRAM = "90000000-0000-4000-8000-000000000001";
const OTHER_PROGRAM = "90000000-0000-4000-8000-000000000002";
const MATHS = "c1000000-0000-4000-8000-000000000001";
const ENGLISH = "c2000000-0000-4000-8000-000000000002";
const CHEM = "c3000000-0000-4000-8000-000000000003";
const LOGIN = "a1000000-0000-4000-8000-0000000000a1";
const NEW_LOGIN = "a2000000-0000-4000-8000-0000000000a2";
const CREATE = "create-parent-profile";
const asAdmin = { authorization: "Bearer admin-token" };

const klass = (id, subject, extra = {}) => ({
  id, program_id: PROGRAM, subject, curriculum: "8-4-4", grade_levels: ["Form 3"], time_slot: "8:00 AM - 9:15 AM",
  max_students: 12, current_enrollment: 0, status: "confirmed", ...extra,
});
const KID = { id: "k1", parent_id: LOGIN, full_name: "Amani", grade_level: "Form 3", curriculum: "8-4-4" };
const pending = (extra = {}) => ({
  id: "old", program_id: PROGRAM, student_id: LOGIN, student_profile_id: "k1", enrolled_class_ids: [MATHS],
  total_subjects: 1, total_amount: 4000, payment_status: "pending", ...extra,
});

// One family, a running program with two confirmed classes, and a create-parent-profile that answers with a new login.
async function setup(t, { family = {}, classes, profiles = [], students = [], enrolments = [], payments = [], program = {}, create } = {}) {
  const fn = await loadFunction("enrol-december-family", {
    functions: { [CREATE]: create ?? [{ status: 200, body: { success: true, userId: NEW_LOGIN } }] },
  });
  t.after(() => fn.dispose());
  const { tables, sessions } = fn.world;
  sessions["admin-token"] = { id: "admin-1" };
  sessions["parent-token"] = { id: "parent-1" };
  tables.user_roles = [{ user_id: "admin-1", role: "admin" }];
  tables.families = [{ id: FAMILY, parent_name: "Mrs Test", phone: "0712 345 678", email: null, parent_profile_id: null, ...family }];
  tables.intensive_programs = [{ id: PROGRAM, name: "December 2099 Holiday Classes", is_active: true, start_date: "2099-12-07", end_date: "2099-12-18", ...program }];
  tables.intensive_classes = classes ?? [klass(MATHS, "Mathematics"), klass(ENGLISH, "English", { time_slot: "11:00 AM - 12:15 PM" })];
  tables.profiles.push(...profiles);
  tables.students = students;
  tables.intensive_enrollments = enrolments;
  tables.payments = payments;
  tables.lead_activities = [];
  return fn;
}

const enrol = (fn, body = {}, headers = asAdmin) =>
  fn.deliver({ familyId: FAMILY, childName: "Amani", classIds: [MATHS, ENGLISH], feePerSubject: 4000, ...body }, headers);
const seats = (fn) => fn.world.tables.intensive_classes.map((c) => c.current_enrollment);
// Nothing was written and no login was asked for.
const untouched = (fn) =>
  fn.world.tables.students.length === 0 &&
  fn.world.tables.intensive_enrollments.length === 0 &&
  fn.world.tables.lead_activities.length === 0 &&
  fn.world.functionCalls.length === 0;

test("phone numbers are compared on their last nine digits", () => {
  assert.equal(d.lastNineDigits("+254 712 345 678"), "712345678");
  assert.equal(d.lastNineDigits("0712-345-678"), "712345678");
  assert.equal(d.lastNineDigits("12345"), null);
  assert.equal(d.lastNineDigits(null), null);
  const profiles = [{ id: "a", phone_number: "0712345678" }, { id: "b", phone_number: "0722345678" }, { id: "c", phone_number: null }];
  assert.deepEqual(d.loginsWithPhone(profiles, "+254712345678"), ["a"]);
  assert.deepEqual(d.loginsWithPhone(profiles, "123"), []);
});

test("only a signed-in admin may enrol; nobody else changes anything", async (t) => {
  const fn = await setup(t);
  for (const [who, headers] of [
    ["no sign-in", {}],
    ["the public anon key, a valid token but no user's", { authorization: "Bearer anon-key" }],
    ["a signed-in parent", { authorization: "Bearer parent-token" }],
  ]) {
    const response = await enrol(fn, {}, headers);
    assert.ok([401, 403].includes(response.status), `${who} was let in: ${response.status}`);
  }
  assert.ok(untouched(fn));
});

test("a family with no login gets one, with the child's record and a pending enrolment", async (t) => {
  const fn = await setup(t);

  const response = await enrol(fn);
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.success, true);
  assert.equal(result.loginCreated, true);
  assert.equal(result.emailIsPlaceholder, true);
  assert.equal(result.alreadyEnrolled, false);
  assert.equal(result.replaced, false);
  assert.equal(result.totalAmount, 8000);

  const [call] = fn.world.functionCalls;
  assert.equal(call.name, CREATE);
  assert.equal(call.headers.Authorization, "Bearer admin-token", "the caller's own token is passed on");
  assert.deepEqual(call.body, { fullName: "Mrs Test", phoneNumber: "0712 345 678", sendWelcomeEmail: false });

  const [child] = fn.world.tables.students;
  assert.deepEqual(
    { parent_id: child.parent_id, full_name: child.full_name, grade_level: child.grade_level, curriculum: child.curriculum },
    { parent_id: NEW_LOGIN, full_name: "Amani", grade_level: "Form 3", curriculum: "8-4-4" },
  );
  const [enrolment] = fn.world.tables.intensive_enrollments;
  assert.equal(enrolment.id, result.enrollmentId);
  assert.equal(enrolment.student_id, NEW_LOGIN);
  assert.equal(enrolment.student_profile_id, child.id);
  assert.deepEqual([...enrolment.enrolled_class_ids].sort(), [MATHS, ENGLISH].sort());
  assert.equal(enrolment.total_subjects, 2);
  assert.equal(enrolment.total_amount, 8000);
  assert.equal(enrolment.payment_status, "pending");
  assert.equal(fn.world.tables.families[0].parent_profile_id, NEW_LOGIN, "the CRM family is linked to the login");
  assert.deepEqual(seats(fn), [1, 1], "each class has a seat held");
});

test("it adds a system line to the family's timeline that the December counter cannot read as a seat", async (t) => {
  const fn = await setup(t);
  await enrol(fn);
  const [line] = fn.world.tables.lead_activities;
  assert.equal(line.family_id, FAMILY);
  assert.equal(line.kind, "system");
  assert.equal(line.created_by, "admin-1");
  assert.match(line.body, /Amani/);
  assert.match(line.body, /Mathematics/);
  assert.doesNotMatch(line.body, /^\s*DEC26/i);
});

test("a real email is used for the login and kept on a family that had none", async (t) => {
  const fn = await setup(t);
  const result = await (await enrol(fn, { email: " Parent@Example.com " })).json();
  assert.equal(fn.world.functionCalls[0].body.email, "parent@example.com");
  assert.equal(result.emailIsPlaceholder, false);
  assert.equal(fn.world.tables.families[0].email, "parent@example.com");
});

test("a family already linked to a login keeps it: no new login is made", async (t) => {
  const fn = await setup(t, { family: { parent_profile_id: LOGIN } });
  fn.world.users[LOGIN] = { id: LOGIN, email: "mum@example.com" };
  const result = await (await enrol(fn)).json();
  assert.equal(result.loginCreated, false);
  assert.equal(result.emailIsPlaceholder, false);
  assert.equal(fn.world.functionCalls.length, 0);
  assert.equal(fn.world.tables.intensive_enrollments[0].student_id, LOGIN);
});

test("a login that has the family's phone number, in any format, is found and linked", async (t) => {
  const fn = await setup(t, { profiles: [{ id: LOGIN, phone_number: "+254 712 345 678" }, { id: "a9", phone_number: "0799 000 000" }] });
  fn.world.users[LOGIN] = { id: LOGIN, email: "parent_254712345678@lana-placeholder.local" };
  const result = await (await enrol(fn)).json();
  assert.equal(result.loginCreated, false);
  assert.equal(result.emailIsPlaceholder, true, "it says that login has no real email");
  assert.equal(fn.world.functionCalls.length, 0);
  assert.equal(fn.world.tables.families[0].parent_profile_id, LOGIN);
});

test("two logins with the family's phone number are refused, and nothing is created", async (t) => {
  const fn = await setup(t, { profiles: [{ id: LOGIN, phone_number: "0712345678" }, { id: NEW_LOGIN, phone_number: "+254712345678" }] });
  const response = await enrol(fn);
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, "ambiguous_login");
  assert.ok(untouched(fn));
});

test("a class that is not running is refused before any login is made", async (t) => {
  const fn = await setup(t, { classes: [klass(MATHS, "Mathematics"), klass(ENGLISH, "English", { status: "active" })] });
  const response = await enrol(fn);
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, "class_not_running");
  assert.ok(untouched(fn));
});

test("a full class is refused", async (t) => {
  const fn = await setup(t, { classes: [klass(MATHS, "Mathematics", { current_enrollment: 12 }), klass(ENGLISH, "English")] });
  const response = await enrol(fn);
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, "class_full");
  assert.ok(untouched(fn));
});

test("classes of two programs are refused", async (t) => {
  const fn = await setup(t, { classes: [klass(MATHS, "Mathematics"), klass(ENGLISH, "English", { program_id: OTHER_PROGRAM })] });
  const response = await enrol(fn);
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, "wrong_program");
  assert.ok(untouched(fn));
});

test("a program that has ended is refused", async (t) => {
  const fn = await setup(t, { program: { end_date: "2020-01-01" } });
  const response = await enrol(fn);
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, "wrong_program");
  assert.ok(untouched(fn));
});

test("the same request again returns the same enrolment and changes nothing", async (t) => {
  const fn = await setup(t);
  const first = await (await enrol(fn)).json();
  const second = await (await enrol(fn)).json();
  assert.equal(second.alreadyEnrolled, true);
  assert.equal(second.enrollmentId, first.enrollmentId);
  assert.equal(fn.world.tables.intensive_enrollments.length, 1);
  assert.equal(fn.world.tables.students.length, 1);
  assert.equal(fn.world.functionCalls.length, 1, "the login was made once");
  assert.deepEqual(seats(fn), [1, 1]);
});

test("a pending enrolment in other classes is replaced, and the seats move with it", async (t) => {
  const fn = await setup(t, {
    family: { parent_profile_id: LOGIN },
    students: [{ ...KID, full_name: "amani" }],
    classes: [klass(MATHS, "Mathematics", { current_enrollment: 1 }), klass(ENGLISH, "English")],
    enrolments: [pending()],
  });
  fn.world.users[LOGIN] = { id: LOGIN, email: "mum@example.com" };

  const result = await (await enrol(fn)).json();

  assert.equal(result.replaced, true);
  assert.equal(result.alreadyEnrolled, false);
  assert.deepEqual(fn.world.tables.intensive_enrollments.map((e) => e.id), [result.enrollmentId]);
  assert.equal(fn.world.tables.students.length, 1, "the child's record is reused, whatever the letter case");
  assert.deepEqual(seats(fn), [1, 1]);
});

test("a paid enrolment in other classes is refused and left alone", async (t) => {
  const paid = pending({ payment_status: "completed" });
  const fn = await setup(t, {
    family: { parent_profile_id: LOGIN },
    students: [KID],
    classes: [klass(MATHS, "Mathematics", { current_enrollment: 1 }), klass(ENGLISH, "English")],
    enrolments: [paid],
  });
  const response = await enrol(fn);
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, "already_paid");
  assert.deepEqual(fn.world.tables.intensive_enrollments, [paid]);
});

test("a pending enrolment that has a completed payment is treated as paid", async (t) => {
  const fn = await setup(t, {
    family: { parent_profile_id: LOGIN },
    students: [KID],
    classes: [klass(MATHS, "Mathematics", { current_enrollment: 1 }), klass(ENGLISH, "English")],
    enrolments: [pending()],
    payments: [{ id: "p1", reference_id: "old", payment_type: "intensive_enrollment", status: "completed", amount: 4000 }],
  });
  const response = await enrol(fn);
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, "already_paid");
  assert.deepEqual(fn.world.tables.intensive_enrollments.map((e) => e.id), ["old"]);
});

test("if the new enrolment cannot be saved, the old one is put back", async (t) => {
  const fn = await setup(t, {
    family: { parent_profile_id: LOGIN },
    students: [KID],
    classes: [klass(MATHS, "Mathematics", { current_enrollment: 1 }), klass(ENGLISH, "English")],
    enrolments: [pending()],
  });
  fn.world.users[LOGIN] = { id: LOGIN, email: "mum@example.com" };
  fn.world.failInserts.intensive_enrollments = 1;

  const response = await enrol(fn);

  assert.equal(response.status, 500);
  assert.deepEqual(fn.world.tables.intensive_enrollments.map((e) => e.id), ["old"]);
  assert.deepEqual(seats(fn), [1, 0], "the seat in Mathematics is back");
});

test("a second child of the same family gets its own record and enrolment under the same login", async (t) => {
  const fn = await setup(t);
  await enrol(fn);
  const second = await (await enrol(fn, { childName: "Baraka", classIds: [MATHS] })).json();
  assert.equal(second.loginCreated, false);
  assert.equal(fn.world.functionCalls.length, 1, "the login was made once");
  assert.deepEqual(fn.world.tables.students.map((s) => s.full_name), ["Amani", "Baraka"]);
  assert.equal(fn.world.tables.intensive_enrollments.length, 2);
  assert.ok(fn.world.tables.intensive_enrollments.every((e) => e.student_id === NEW_LOGIN));
});

test("if the login cannot be made nothing else is written", async (t) => {
  const fn = await setup(t, { create: [{ status: 400, body: { error: "A user with this email already exists" } }] });
  const response = await enrol(fn);
  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /already exists/);
  assert.equal(fn.world.tables.students.length, 0);
  assert.equal(fn.world.tables.intensive_enrollments.length, 0);
});

test("bad input is refused with 400 before anything is read", async (t) => {
  const fn = await setup(t);
  const manyClasses = Array.from({ length: 7 }, (_, i) => `c${i}000000-0000-4000-8000-000000000000`);
  for (const [what, body] of [
    ["a family that is not an id", { familyId: "nope" }],
    ["no classes", { classIds: [] }],
    ["seven classes", { classIds: manyClasses }],
    ["a class that is not an id", { classIds: ["x"] }],
    ["a one-letter child name", { childName: "A" }],
    ["a zero fee", { feePerSubject: 0 }],
    ["a fee that is not a number", { feePerSubject: "lots" }],
    ["an email that is not one", { email: "not-an-email" }],
  ]) {
    assert.equal((await enrol(fn, body)).status, 400, what);
  }
  assert.ok(untouched(fn));
});

test("a family with no phone number and none in the request is refused", async (t) => {
  const fn = await setup(t, { family: { phone: null } });
  assert.equal((await enrol(fn)).status, 400);
  assert.ok(untouched(fn));
});

test("an unknown family or class is a 404", async (t) => {
  const fn = await setup(t);
  assert.equal((await enrol(fn, { familyId: "f9000000-0000-4000-8000-000000000009" })).status, 404);
  assert.equal((await enrol(fn, { classIds: [MATHS, CHEM] })).status, 404);
  assert.ok(untouched(fn));
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test supabase/functions/_tests/enrol-december-family.test.mjs 2>&1 | tail -12`
Expected: FAIL at load, `Could not resolve` for `_shared/december.ts` (the module and the function do not exist yet).

- [ ] **Step 3: The pure helpers**

`supabase/functions/_shared/december.ts`:

```ts
// Rules for enrol-december-family that need neither Deno nor the database, kept apart so the tests can load them directly.

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// create-parent-profile gives a family without an email a login on an address like this one.
export const PLACEHOLDER_DOMAIN = "@lana-placeholder.local";
export const MAX_FEE_PER_SUBJECT = 100000;

export type EnrolInput = {
  familyId: string;
  childName: string;
  classIds: string[];
  feePerSubject: number;
  parentName?: string;
  phone?: string;
  email?: string;
};

const text = (value: unknown): string => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");

/** Reads the request body, or says what is wrong with it. */
export function readEnrolInput(body: unknown): { ok: true; value: EnrolInput } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;

  const familyId = text(b.familyId);
  if (!UUID.test(familyId)) return { ok: false, error: "Choose the family to enrol" };

  const childName = text(b.childName);
  if (childName.length < 2 || childName.length > 80) return { ok: false, error: "Enter the child's name: 2 to 80 characters" };

  const classIds = [...new Set((Array.isArray(b.classIds) ? b.classIds : []).map((id) => text(id)))];
  if (classIds.length < 1 || classIds.length > 6 || !classIds.every((id) => UUID.test(id))) {
    return { ok: false, error: "Choose between 1 and 6 classes" };
  }

  const fee = Number(b.feePerSubject);
  if (typeof b.feePerSubject === "boolean" || !Number.isFinite(fee) || fee <= 0 || fee > MAX_FEE_PER_SUBJECT) {
    return { ok: false, error: `Enter the fee per subject: more than 0 and at most ${MAX_FEE_PER_SUBJECT}` };
  }

  const email = text(b.email).toLowerCase();
  if (email && (email.length > 254 || !EMAIL.test(email) || email.endsWith(PLACEHOLDER_DOMAIN))) {
    return { ok: false, error: "That email address does not look right" };
  }

  const value: EnrolInput = { familyId, childName, classIds, feePerSubject: Math.round(fee * 100) / 100 };
  const parentName = text(b.parentName);
  const phone = text(b.phone);
  if (parentName) value.parentName = parentName.slice(0, 120);
  if (phone) value.phone = phone.slice(0, 40);
  if (email) value.email = email;
  return { ok: true, value };
}

/** The last 9 digits of a phone number, so +254 712 345 678, 0712 345 678 and 712345678 are the same number. Fewer than 9 digits: null. */
export function lastNineDigits(phone: unknown): string | null {
  const digits = typeof phone === "string" ? phone.replace(/\D/g, "") : "";
  return digits.length >= 9 ? digits.slice(-9) : null;
}

/** The ids of the profiles whose phone number is the same as `phone`. */
export function loginsWithPhone(profiles: { id: string; phone_number: string | null }[], phone: unknown): string[] {
  const wanted = lastNineDigits(phone);
  if (!wanted) return [];
  return profiles.filter((p) => lastNineDigits(p.phone_number) === wanted).map((p) => p.id);
}

/** Today in Nairobi as YYYY-MM-DD. */
export function nairobiToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export const sameSet = (a: string[], b: string[]): boolean => a.length === b.length && a.every((x) => b.includes(x));
```

- [ ] **Step 4: The function**

`supabase/functions/enrol-december-family/index.ts`:

```ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { guardInternal } from "../_shared/auth-guard.ts";
import { PLACEHOLDER_DOMAIN, loginsWithPhone, nairobiToday, readEnrolInput, sameSet } from "../_shared/december.ts";

// The team enrols a child who reserved December classes: it finds or makes the family's login, the child's record and the
// enrolment (which holds a seat in each class), and says so on the family's timeline. It sends nothing to the family; the team
// sends the payment message from the desk. Admin only. The rules are in docs/superpowers/specs/2026-11-03-december-desk-design.md.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const fail = (message: string, error: unknown): Response => {
  console.error(message, error);
  return json(500, { error: `${message}. Nothing more was changed` });
};

const money = (n: number): number => Math.round(n * 100) / 100;
const classLabel = (c: { grade_levels: string[]; subject: string }): string => `${(c.grade_levels ?? []).join(" and ")} ${c.subject}`;
const labels = (list: { grade_levels: string[]; subject: string }[]): string => list.map(classLabel).join(", ");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const guard = await guardInternal(req, { requireAdmin: true });
  if (!guard.ok) return json(guard.status ?? 401, { error: guard.message });

  try {
    let raw: unknown = {};
    try {
      raw = await req.json();
    } catch (_) {
      // an empty body is refused below, field by field
    }
    const parsed = readEnrolInput(raw);
    if (!parsed.ok) return json(400, { error: parsed.error });
    const input = parsed.value;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    // Whether a login's address is a real one, for the answer (a placeholder gets no confirmation and no reminders).
    const emailIsPlaceholder = async (loginId: string): Promise<boolean> => {
      const { data } = await supabase.auth.admin.getUserById(loginId);
      const email = data?.user?.email ?? "";
      return !email || email.endsWith(PLACEHOLDER_DOMAIN);
    };

    // 1. The family, the classes and their program.
    const { data: family, error: familyError } = await supabase
      .from("families")
      .select("id, parent_name, phone, email, parent_profile_id")
      .eq("id", input.familyId)
      .maybeSingle();
    if (familyError) return fail("Could not read the family", familyError);
    if (!family) return json(404, { error: "That family was not found" });
    const phone = input.phone ?? family.phone ?? "";
    if (!phone) return json(400, { error: "This family has no phone number. Add one first" });

    const { data: classRows, error: classError } = await supabase
      .from("intensive_classes")
      .select("id, program_id, subject, curriculum, grade_levels, max_students, current_enrollment, status")
      .in("id", input.classIds);
    if (classError) return fail("Could not read the classes", classError);
    const classes = classRows ?? [];
    if (classes.length !== input.classIds.length) return json(404, { error: "One of those classes was not found" });

    const programId = classes[0].program_id;
    if (classes.some((c) => c.program_id !== programId)) {
      return json(409, { code: "wrong_program", error: "Those classes belong to different programs" });
    }
    const { data: program, error: programError } = await supabase
      .from("intensive_programs")
      .select("id, is_active, end_date")
      .eq("id", programId)
      .maybeSingle();
    if (programError) return fail("Could not read the program", programError);
    if (!program || !program.is_active || String(program.end_date).slice(0, 10) < nairobiToday()) {
      return json(409, { code: "wrong_program", error: "That program is not running or has already ended" });
    }
    const notRunning = classes.filter((c) => c.status !== "confirmed");
    if (notRunning.length > 0) {
      return json(409, { code: "class_not_running", error: `${labels(notRunning)} is not running yet. Open the class on the December desk first` });
    }

    // 2. The family's login, if it has one. Nothing is made yet.
    let loginId: string | null = family.parent_profile_id ?? null;
    if (!loginId) {
      const profiles: { id: string; phone_number: string | null }[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from("profiles").select("id, phone_number").order("id").range(from, from + 999);
        if (error) return fail("Could not look for the family's login", error);
        profiles.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      const matches = loginsWithPhone(profiles, phone);
      if (matches.length > 1) {
        return json(409, { code: "ambiguous_login", error: "More than one login has this phone number. Link the right one in Bootcamp Admin, then try again" });
      }
      loginId = matches[0] ?? null;
    }

    // 3. The child's record and enrolment under that login, if they exist.
    let child: { id: string; full_name: string } | null = null;
    let existing: { id: string; enrolled_class_ids: string[]; payment_status: string; total_amount: number } | null = null;
    if (loginId) {
      const { data: kids, error: kidsError } = await supabase.from("students").select("id, full_name").eq("parent_id", loginId);
      if (kidsError) return fail("Could not read the family's children", kidsError);
      child = (kids ?? []).find((k) => String(k.full_name).trim().toLowerCase() === input.childName.toLowerCase()) ?? null;
      if (child) {
        const { data: found, error: foundError } = await supabase
          .from("intensive_enrollments")
          .select("id, enrolled_class_ids, payment_status, total_amount")
          .eq("program_id", programId)
          .eq("student_profile_id", child.id);
        if (foundError) return fail("Could not read the child's enrolment", foundError);
        existing = (found ?? [])[0] ?? null;
      }
    }

    const total = money(input.feePerSubject * input.classIds.length);

    // 4. An enrolment the child already has: the same classes is a repeat, a paid one is not changed, an unpaid one is replaced.
    if (existing && child && loginId && sameSet(existing.enrolled_class_ids ?? [], input.classIds)) {
      return json(200, {
        success: true, enrollmentId: existing.id, loginId, childId: child.id, loginCreated: false,
        emailIsPlaceholder: await emailIsPlaceholder(loginId), alreadyEnrolled: true, replaced: false,
        totalAmount: Number(existing.total_amount),
      });
    }
    if (existing) {
      const { data: payments, error: paymentError } = await supabase
        .from("payments")
        .select("id")
        .eq("reference_id", existing.id)
        .eq("payment_type", "intensive_enrollment")
        .eq("status", "completed");
      if (paymentError) return fail("Could not read the enrolment's payments", paymentError);
      if (existing.payment_status !== "pending" || (payments ?? []).length > 0) {
        return json(409, { code: "already_paid", error: "This child's enrolment has been paid for. Change its classes by hand in Bootcamp Admin" });
      }
    }

    // 5. Room. A seat the child already holds in a class does not count against it.
    const ownSeats = new Set(existing?.enrolled_class_ids ?? []);
    const full = classes.filter((c) => Number(c.current_enrollment ?? 0) - (ownSeats.has(c.id) ? 1 : 0) >= Number(c.max_students));
    if (full.length > 0) return json(409, { code: "class_full", error: `${labels(full)} is full` });

    // 6. The login, made now if the family has none.
    let loginCreated = false;
    let placeholder = false;
    if (!loginId) {
      const email = input.email ?? family.email ?? undefined;
      const response = await fetch(`${supabaseUrl}/functions/v1/create-parent-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: req.headers.get("Authorization") ?? "" },
        body: JSON.stringify({ fullName: input.parentName ?? family.parent_name ?? "Parent", phoneNumber: phone, email, sendWelcomeEmail: false }),
      });
      const made = await response.json().catch(() => ({}));
      if (!response.ok || !made?.userId) {
        return json(502, { error: `Could not make the family's login: ${made?.error ?? response.status}` });
      }
      loginId = String(made.userId);
      loginCreated = true;
      placeholder = !email;
    } else {
      placeholder = await emailIsPlaceholder(loginId);
    }

    // 7. The child's record.
    if (!child) {
      const first = classes[0];
      const { data: made, error: childError } = await supabase
        .from("students")
        .insert({ parent_id: loginId, full_name: input.childName, grade_level: first.grade_levels?.[0] ?? "", curriculum: first.curriculum })
        .select("id, full_name")
        .single();
      if (childError || !made) return fail("Could not save the child's record", childError);
      child = made;
    }

    // 8. The enrolment. An unpaid one in other classes is replaced; if the new one cannot be saved, the old one goes back (without
    // its Pesapal tracking id, which an unpaid enrolment made here does not have).
    let replaced = false;
    if (existing) {
      const { error: deleteError } = await supabase.from("intensive_enrollments").delete().eq("id", existing.id);
      if (deleteError) return fail("Could not replace the earlier enrolment", deleteError);
      replaced = true;
    }
    const { data: enrolment, error: enrolError } = await supabase
      .from("intensive_enrollments")
      .insert({
        program_id: programId,
        student_id: loginId,
        student_profile_id: child.id,
        enrolled_class_ids: input.classIds,
        total_subjects: input.classIds.length,
        total_amount: total,
        payment_status: "pending",
      })
      .select("id")
      .single();
    if (enrolError || !enrolment) {
      if (existing) {
        const { error: restoreError } = await supabase.from("intensive_enrollments").insert({
          id: existing.id,
          program_id: programId,
          student_id: loginId,
          student_profile_id: child.id,
          enrolled_class_ids: existing.enrolled_class_ids,
          total_subjects: (existing.enrolled_class_ids ?? []).length,
          total_amount: existing.total_amount,
          payment_status: existing.payment_status,
        });
        if (restoreError) console.error("Could not put the earlier enrolment back:", restoreError);
      }
      return fail("Could not save the enrolment", enrolError);
    }

    // 9. The family: link the login, and keep an email the team just gave. The enrolment stands if this fails.
    const patch: Record<string, unknown> = {};
    if (!family.parent_profile_id) patch.parent_profile_id = loginId;
    if (input.email && !family.email) patch.email = input.email;
    if (Object.keys(patch).length > 0) {
      const { error: patchError } = await supabase.from("families").update(patch).eq("id", family.id);
      if (patchError) console.error("Could not update the family:", patchError);
    }

    // 10. The timeline. It never starts with DEC26, which the reservation counter would read as a seat.
    const { error: lineError } = await supabase.from("lead_activities").insert({
      family_id: family.id,
      lead_id: null,
      kind: "system",
      created_by: guard.userId ?? null,
      body: `Enrolled ${input.childName} in ${labels(classes)} (KES ${total.toLocaleString("en-US")}, waiting for payment).`,
    });
    if (lineError) console.error("Could not add the timeline line:", lineError);

    return json(200, {
      success: true, enrollmentId: enrolment.id, loginId, childId: child.id, loginCreated,
      emailIsPlaceholder: placeholder, alreadyEnrolled: false, replaced, totalAmount: total,
    });
  } catch (error) {
    console.error("Error enrolling the child:", error);
    return json(500, { error: error instanceof Error ? error.message : "unknown_error" });
  }
});
```

- [ ] **Step 5: Register the function**

In `supabase/config.toml`, replace

```
[functions.record-intensive-payment]
verify_jwt = true
```

with

```
[functions.record-intensive-payment]
verify_jwt = true

[functions.enrol-december-family]
verify_jwt = true
```

- [ ] **Step 6: Run the tests, then everything**

```bash
node --test supabase/functions/_tests/enrol-december-family.test.mjs 2>&1 | tail -30
npm run test:edge 2>&1 | grep -E "^# (pass|fail)"
```

Expected: all the new tests pass, `# fail 0` overall. If a test fails, read its message against the rule in the spec before touching code; the two likeliest slips are the order of steps 1 to 5 (a refusal must come before any login is made) and the seat arithmetic when an enrolment is replaced (delete first, then insert, as the harness trigger does).

- [ ] **Step 7: Strict type check of the function**

Deno is not installed here, so `deno check` cannot run. This is a throwaway strict `tsc` setup outside the repo: a `Deno` shim, an ambient module for the `serve` import, and `paths` that map the supabase-js URLs onto the repo's own package. It is not `deno check` (the supabase-js types are the frontend's version, and rows come back loosely typed), but it catches syntax and plain type errors.

```bash
R=/Users/mac/lanatutors/.claude/worktrees/december-desk
CHECK="$(mktemp -d)"
cat > "$CHECK/deno-shim.d.ts" <<'DTS'
declare const Deno: { env: { get(key: string): string | undefined } };
declare module "https://deno.land/std@0.190.0/http/server.ts" {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}
DTS
cat > "$CHECK/tsconfig.json" <<JSON
{
  "compilerOptions": {
    "target": "ES2022", "module": "ESNext", "moduleResolution": "Bundler", "strict": true, "noEmit": true,
    "allowImportingTsExtensions": true, "skipLibCheck": true, "lib": ["ES2022", "DOM"],
    "baseUrl": "$R",
    "paths": {
      "https://esm.sh/@supabase/supabase-js@2": ["node_modules/@supabase/supabase-js"],
      "https://esm.sh/@supabase/supabase-js@2.45.0": ["node_modules/@supabase/supabase-js"]
    }
  },
  "files": ["$CHECK/deno-shim.d.ts", "$R/supabase/functions/enrol-december-family/index.ts", "$R/supabase/functions/_shared/december.ts"]
}
JSON
npx tsc -p "$CHECK/tsconfig.json"; echo "tsc exit $?"
npx tsc -p "$CHECK/tsconfig.json" --listFiles | grep -c "enrol-december-family/index.ts"
rm -rf "$CHECK"
```

Expected: `tsc exit 0`, and `1` from the `grep -c` (the function file really was checked). To prove the check can fail, run it once with a deliberate error: add `const bad: number = "x";` to a scratch file listed under `files`, expect an error, then remove it.

- [ ] **Step 8: Commit (only when the owner has said commit)**

```bash
git add supabase/functions/_shared/december.ts supabase/functions/enrol-december-family/index.ts supabase/functions/_tests/enrol-december-family.test.mjs supabase/config.toml
git commit -m "December desk: enrol-december-family finds or makes the login, the child record and the enrolment

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task 8: The paybill wording, the three messages and the enrolment match

**Files:**
- Create: `src/utils/paybill.ts`
- Modify: `src/components/admin/AdminInvoices.tsx`
- Modify: `src/utils/decemberDesk.ts`
- Test: `scripts/crm-tests/decemberDesk.test.ts`

**Interfaces:**
- Consumes: Task 1's module; `formatSlot`, `MIN_STUDENTS_TO_OPEN` from `./holidayClasses`.
- Produces: `PAYBILL` (`label`, `number`, `account`, `recipient`, `sendTo`); in `decemberDesk.ts`: types `MessageClass { grade: string; subject: string; slot: string; tutorFirstName: string | null; meetingLink: string | null }`, `DeskEnrolment`, `DeskChild`, `HolderStage`; functions `paybillBlock(): string`, `buildPaymentMessage(m: { parentName: string; childName: string; classes: MessageClass[]; startDate: string; amount: number; payBy: string }): string`, `buildLinksMessage(m: { parentName: string; childName: string; classes: MessageClass[] }): string | null`, `buildNotRunningMessage(m: { parentName: string; childName: string; className: string }): string`, `waMessageLink(phone: string | null | undefined, text: string): string | null`, `holderStage(args: { holding: Holding; classId: string; family: { parent_profile_id: string | null } | undefined; enrolments: DeskEnrolment[]; children: DeskChild[] }): { stage: HolderStage; enrolment: DeskEnrolment | null }`.

- [ ] **Step 1: Write the failing tests**

In `scripts/crm-tests/decemberDesk.test.ts`, add `buildLinksMessage, buildNotRunningMessage, buildPaymentMessage, holderStage, waMessageLink, type Holding,` to the existing `../../src/utils/decemberDesk` import list, add this import below the existing ones:

```ts
import { PAYBILL } from "../../src/utils/paybill";
```

and append:

```ts
describe("messages", () => {
  const classes = [
    { grade: "Form 3", subject: "Mathematics", slot: "8:00 AM - 9:15 AM", tutorFirstName: "Jane", meetingLink: "https://meet.example/maths" },
    { grade: "Form 3", subject: "English", slot: "11:00 AM - 12:15 PM", tutorFirstName: null, meetingLink: null },
  ];

  it("asks for payment: the classes, the amount, the day to pay by and the paybill details", () => {
    const text = buildPaymentMessage({ parentName: "Mrs Test", childName: "Amani", classes, startDate: "2026-12-07", amount: 8000, payBy: "2026-12-04" });
    assert.match(text, /Good news, Mrs Test: Amani's classes are running from Monday 7 December/);
    assert.match(text, /- Form 3 Mathematics, 8:00 – 9:15 AM, with Jane/);
    assert.match(text, /- Form 3 English, 11:00 AM – 12:15 PM\n/); // no tutor yet, so no "with"
    assert.match(text, /please pay KES 8,000 by Friday 4 December/);
    assert.ok(text.includes(PAYBILL.number) && text.includes(PAYBILL.account) && text.includes(PAYBILL.recipient));
    assert.match(text, /class links once payment is confirmed/);
  });
  it("speaks of one class and one seat in the singular", () => {
    const text = buildPaymentMessage({ parentName: "Mrs Test", childName: "Amani", classes: [classes[0]], startDate: "2026-12-07", amount: 4000, payBy: "2026-12-04" });
    assert.match(text, /Amani's class is running/);
    assert.match(text, /keep Amani's seat/);
    assert.match(text, /the class link once/);
  });
  it("sends the class links only for classes that have one, and nothing when none has", () => {
    const text = buildLinksMessage({ parentName: "Mrs Test", childName: "Amani", classes }) as string;
    assert.match(text, /Form 3 Mathematics, 8:00 – 9:15 AM: https:\/\/meet\.example\/maths/);
    assert.doesNotMatch(text, /English/);
    assert.equal(buildLinksMessage({ parentName: "Mrs Test", childName: "Amani", classes: [classes[1]] }), null);
  });
  it("tells a family a class is not running, that nothing was charged, and offers the assessment call", () => {
    const text = buildNotRunningMessage({ parentName: "Mrs Test", childName: "Amani", className: "Form 3 Chemistry" });
    assert.match(text, /Form 3 Chemistry did not reach the 6 students it needs/);
    assert.match(text, /nothing has been charged/);
    assert.match(text, /book-consultation/);
  });
  it("opens WhatsApp with the text in the link, and gives no link without a number", () => {
    assert.equal(waMessageLink("254712345678", "Hi there & you"), "https://wa.me/254712345678?text=Hi%20there%20%26%20you");
    assert.equal(waMessageLink(null, "x"), null);
    assert.equal(waMessageLink("", "x"), null);
  });
});

describe("holderStage", () => {
  const holding: Holding = { familyId: "fam-1", child: "Amani", code: "F3-MATHS" };
  const family = { parent_profile_id: "login-1" };
  const children = [{ id: "kid-1", full_name: "amani" }];
  const enrolment = (extra = {}) => ({
    id: "e1", student_id: "login-1", student_profile_id: "kid-1", enrolled_class_ids: ["class-maths"],
    payment_status: "pending", total_amount: 4000, ...extra,
  });
  const stage = (over: Record<string, unknown> = {}) =>
    holderStage({ holding, classId: "class-maths", family, enrolments: [enrolment()], children, ...over } as Parameters<typeof holderStage>[0]);

  it("is enrolled while the enrolment is unpaid or part paid, whatever the letter case of the name", () => {
    assert.equal(stage().stage, "enrolled");
    assert.equal(stage({ enrolments: [enrolment({ payment_status: "deposit_paid" })] }).stage, "enrolled");
  });
  it("is paid once the enrolment is completed", () => {
    const found = stage({ enrolments: [enrolment({ payment_status: "completed" })] });
    assert.equal(found.stage, "paid");
    assert.equal(found.enrolment?.id, "e1");
  });
  it("stays reserved when the child is not enrolled in that class, or the family has no login, or the note names no child", () => {
    assert.equal(stage({ classId: "class-english" }).stage, "reserved");
    assert.equal(stage({ family: { parent_profile_id: null } }).stage, "reserved");
    assert.equal(stage({ family: undefined }).stage, "reserved");
    assert.equal(stage({ holding: { ...holding, child: "" } }).stage, "reserved");
    assert.equal(stage({ enrolments: [enrolment({ student_id: "someone-else" })] }).stage, "reserved");
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm run test:crm 2>&1 | tail -10`
Expected: FAIL, `Could not resolve "../../src/utils/paybill"`.

- [ ] **Step 3: The paybill wording, and the two places that used to hold it**

`src/utils/paybill.ts`:

```ts
// How a family pays by M-Pesa paybill: one place for the wording the invoice (email and screen) and the December payment
// message share.
export const PAYBILL = {
  label: "NCBA Paybill",
  number: "880100",
  account: "1006114657",
  recipient: "Lana Bespoke Limited",
  sendTo: "info@lanatutors.africa or WhatsApp +254 117 512316",
} as const;
```

In `src/components/admin/AdminInvoices.tsx`, make these edits in this order:

1. After `import lanaLogo from "@/assets/lana-tutors-invoice-logo.png";` add the line `import { PAYBILL } from "@/utils/paybill";`.
2. Replace `<tr><td style="color:#6b7280">NCBA Paybill</td><td style="text-align:right;font-weight:bold">880100</td></tr>` with `<tr><td style="color:#6b7280">${PAYBILL.label}</td><td style="text-align:right;font-weight:bold">${PAYBILL.number}</td></tr>`.
3. Replace `<tr><td style="color:#6b7280">Account Number</td><td style="text-align:right;font-weight:bold">1006114657</td></tr>` with `<tr><td style="color:#6b7280">Account Number</td><td style="text-align:right;font-weight:bold">${PAYBILL.account}</td></tr>`.
4. Replace `<tr><td style="color:#6b7280">Recipient</td><td style="text-align:right;font-weight:bold">Lana Bespoke Limited</td></tr>` with `<tr><td style="color:#6b7280">Recipient</td><td style="text-align:right;font-weight:bold">${PAYBILL.recipient}</td></tr>`.
5. Replace `After paying, send your M-Pesa confirmation to info@lanatutors.africa or WhatsApp +254 117 512316.</td></tr>` with `After paying, send your M-Pesa confirmation to ${PAYBILL.sendTo}.</td></tr>`.
6. Replace `<span className="text-muted-foreground">NCBA Paybill</span>` with `<span className="text-muted-foreground">{PAYBILL.label}</span>`.
7. Replace `<span className="font-bold">880100</span>` with `<span className="font-bold">{PAYBILL.number}</span>`.
8. Replace `<span className="font-bold">1006114657</span>` with `<span className="font-bold">{PAYBILL.account}</span>`.
9. Replace `<span className="font-bold">Lana Bespoke Limited</span>` with `<span className="font-bold">{PAYBILL.recipient}</span>`.
10. Replace `M-Pesa confirmation to info@lanatutors.africa or WhatsApp +254 117 512316.` (the one left, in the on-screen invoice) with `M-Pesa confirmation to {PAYBILL.sendTo}.`.

Check nothing was missed or altered: `grep -rn "880100\|1006114657" src/` must print only `src/utils/paybill.ts`.

- [ ] **Step 4: The messages and the match**

In `src/utils/decemberDesk.ts`, replace `import { MIN_STUDENTS_TO_OPEN } from "./holidayClasses";` with:

```ts
import { MIN_STUDENTS_TO_OPEN, formatSlot } from "./holidayClasses";
import { PAYBILL } from "./paybill";
```

and append at the end of the file:

```ts

export type MessageClass = {
  grade: string;
  subject: string;
  slot: string;
  tutorFirstName: string | null;
  meetingLink: string | null;
};

const kes = (amount: number): string => `KES ${Math.round(amount).toLocaleString("en-US")}`;

/** The M-Pesa paybill details, as the invoice shows them. */
export function paybillBlock(): string {
  return [
    "How to pay (M-Pesa)",
    `${PAYBILL.label}: ${PAYBILL.number}`,
    `Account number: ${PAYBILL.account}`,
    `Recipient: ${PAYBILL.recipient}`,
    `After paying, send your M-Pesa confirmation to ${PAYBILL.sendTo}.`,
  ].join("\n");
}

/** The message that asks a family to pay, sent by the team after Enrol. */
export function buildPaymentMessage(m: {
  parentName: string;
  childName: string;
  classes: MessageClass[];
  startDate: string;
  amount: number;
  payBy: string;
}): string {
  const one = m.classes.length === 1;
  return [
    `Good news, ${m.parentName}: ${m.childName}'s ${one ? "class is" : "classes are"} running from ${longDay(m.startDate)}, online (Nairobi time):`,
    ...m.classes.map(
      (c) => `- ${c.grade} ${c.subject}, ${formatSlot(c.slot)}${c.tutorFirstName ? `, with ${c.tutorFirstName}` : ""}`,
    ),
    "",
    `To keep ${m.childName}'s ${one ? "seat" : "seats"}, please pay ${kes(m.amount)} by ${longDay(m.payBy)}.`,
    "",
    paybillBlock(),
    "",
    `You will get the class ${one ? "link" : "links"} once payment is confirmed.`,
  ].join("\n");
}

/** The class links, for a family that has paid; null when no class has a link yet. */
export function buildLinksMessage(m: { parentName: string; childName: string; classes: MessageClass[] }): string | null {
  const withLinks = m.classes.filter((c) => c.meetingLink);
  if (withLinks.length === 0) return null;
  return [
    `Thank you, ${m.parentName}. We have received the payment for ${m.childName}. The class ${withLinks.length === 1 ? "link is" : "links are"} below (Nairobi time):`,
    ...withLinks.map((c) => `- ${c.grade} ${c.subject}, ${formatSlot(c.slot)}: ${c.meetingLink}`),
  ].join("\n");
}

/** For the families of a class that did not reach the seats it needs. */
export function buildNotRunningMessage(m: { parentName: string; childName: string; className: string }): string {
  return [
    `Thank you for reserving, ${m.parentName}. ${m.className} did not reach the ${MIN_STUDENTS_TO_OPEN} students it needs, so it will not run this December and nothing has been charged for ${m.childName}.`,
    "If you would like, we can arrange a free 20-minute assessment call with our Learning Coordinator and look at one-to-one options for January: https://lanatutors.africa/book-consultation",
  ].join("\n\n");
}

/** A WhatsApp link to a number with the text filled in; null without a number. */
export function waMessageLink(phone: string | null | undefined, text: string): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null;
}

export type DeskEnrolment = {
  id: string;
  student_id: string;
  student_profile_id: string | null;
  enrolled_class_ids: string[];
  payment_status: string;
  total_amount: number;
};
export type DeskChild = { id: string; full_name: string };
export type HolderStage = "reserved" | "enrolled" | "paid";

/**
 * Where one reservation stands: reserved, enrolled (waiting for payment) or paid. The enrolment is found by the family's login and
 * the child's name (the reservation note names the child; the enrolment points at the child's record).
 */
export function holderStage(args: {
  holding: Holding;
  classId: string;
  family: { parent_profile_id: string | null } | undefined;
  enrolments: DeskEnrolment[];
  children: DeskChild[];
}): { stage: HolderStage; enrolment: DeskEnrolment | null } {
  const { holding, classId, family, enrolments, children } = args;
  const login = family?.parent_profile_id;
  if (!login || !holding.child) return { stage: "reserved", enrolment: null };
  const kidIds = children.filter((k) => sameChild(k.full_name, holding.child)).map((k) => k.id);
  const found = enrolments.find(
    (e) =>
      e.student_id === login &&
      e.student_profile_id !== null &&
      kidIds.includes(e.student_profile_id) &&
      e.enrolled_class_ids.includes(classId),
  );
  if (!found) return { stage: "reserved", enrolment: null };
  return { stage: found.payment_status === "completed" ? "paid" : "enrolled", enrolment: found };
}
```

- [ ] **Step 5: Run the tests, the type check and the build**

```bash
npm run test:crm 2>&1 | tail -8
npx tsc -p tsconfig.app.json --noEmit; echo "tsc exit $?"
npx eslint src/utils/paybill.ts src/utils/decemberDesk.ts; echo "eslint exit $?"
grep -rn "880100\|1006114657" src/
```

Expected: `# fail 0`; `tsc exit 0`; eslint exit 0; the grep prints only `src/utils/paybill.ts`. (`AdminInvoices.tsx` is large and old; run `npm run build` to be sure the invoice screen still compiles.)

- [ ] **Step 6: Commit (only when the owner has said commit)**

```bash
git add src/utils/paybill.ts src/components/admin/AdminInvoices.tsx src/utils/decemberDesk.ts scripts/crm-tests/decemberDesk.test.ts
git commit -m "December desk: one paybill wording, the three messages and the enrolment match

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task 9: Open, archive, enrol, message, record paybill and release, on the desk

**Files:**
- Modify: `src/utils/decemberDesk.ts`, `scripts/crm-tests/decemberDesk.test.ts` (one more pure helper)
- Create: `src/components/admin/crm/decemberActions.ts`
- Create: `src/components/admin/crm/DecemberEnrolDialog.tsx`
- Create: `src/components/admin/crm/DecemberMessageDialog.tsx`
- Modify: `src/components/admin/crm/useDecemberDesk.ts`
- Replace: `src/components/admin/crm/DecemberClassCard.tsx`
- Replace: `src/pages/admin/CrmDecember.tsx`

**Interfaces:**
- Consumes: Task 1 and Task 8's helpers; `RecordPaybillDialog` and `PaybillEnrollment` from `src/components/admin/RecordPaybillDialog.tsx`; the `enrol-december-family` contract from Task 7.
- Produces: `childCodes(lists: DeskLists, familyId: string, child: string): DecemberCode[]`; `decemberActions.ts`: `messageFrom(error: unknown): Promise<string>`, `setClassStatus(classId: string, status: "active" | "confirmed" | "archived"): Promise<string | null>`, `releaseSeat(enrolmentId: string): Promise<string | null>`, `enrolFamily(request: EnrolRequest): Promise<{ result: EnrolResult } | { error: string }>`; `DeskData` gains `enrolments: DeskEnrolment[]` and `children: DeskChild[]`; `HolderRow` gains `email`, `stage` and `enrolment`.

- [ ] **Step 1: Write the failing test for `childCodes`**

Add `childCodes,` to the `../../src/utils/decemberDesk` import list in `scripts/crm-tests/decemberDesk.test.ts`, and append:

```ts
describe("childCodes", () => {
  const A = "a0000000-0000-4000-8000-00000000000a";
  const lists = readLists(notes);
  it("lists the classes one child holds, in class order, whatever the letter case", () => {
    assert.deepEqual(childCodes(lists, A, "amani"), ["F3-MATHS"]); // F3-ENG was cancelled
    assert.deepEqual(childCodes(lists, A, "Baraka"), ["G8-MATHS"]);
  });
  it("finds a child the note gave no name, and nobody else's", () => {
    const B = "b0000000-0000-4000-8000-00000000000b";
    assert.deepEqual(childCodes(lists, B, ""), ["F3-CHEM", "G8-SCI"]);
    assert.deepEqual(childCodes(lists, A, "Nobody"), []);
  });
});
```

Run: `npm run test:crm 2>&1 | tail -8`. Expected: FAIL (`childCodes` is not exported).

- [ ] **Step 2: Add `childCodes`**

Append to `src/utils/decemberDesk.ts`:

```ts

/** The classes one child of a family holds, in class order, from the family's reservation notes. */
export function childCodes(lists: DeskLists, familyId: string, child: string): DecemberCode[] {
  const held = lists.held.filter((h) => h.familyId === familyId && sameChild(h.child, child)).map((h) => h.code);
  return DECEMBER_CODES.filter((code) => held.includes(code));
}
```

Run: `npm run test:crm 2>&1 | tail -8`. Expected: `# fail 0`.

- [ ] **Step 3: The actions**

`src/components/admin/crm/decemberActions.ts`:

```ts
import { supabase } from "@/integrations/supabase/client";

/** A function that refuses says why in its response; the invoke error only carries the response, so read the message out of it. */
export async function messageFrom(error: unknown): Promise<string> {
  const response = (error as { context?: Response } | null)?.context;
  if (response && typeof response.json === "function") {
    try {
      const body = await response.json();
      if (body?.error) return String(body.error);
    } catch {
      // not JSON: fall through to the generic message
    }
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

export type ClassStatus = "active" | "confirmed" | "archived";

/**
 * Opens a class (confirmed), archives it, or puts it back to taking reservations. Admins already have full rights on
 * intensive_classes. Archiving or taking a class back to reservations is refused while an enrolment includes it, even if the
 * button was shown as usable on a stale screen. Opening never blocks.
 */
export async function setClassStatus(classId: string, status: ClassStatus): Promise<string | null> {
  if (status !== "confirmed") {
    const { data: held, error: heldError } = await supabase
      .from("intensive_enrollments")
      .select("id")
      .contains("enrolled_class_ids", [classId])
      .limit(1);
    if (heldError) return heldError.message;
    if ((held ?? []).length > 0) return "This class has enrolments. Release them first";
  }
  const { error } = await supabase.from("intensive_classes").update({ status }).eq("id", classId);
  return error ? error.message : null;
}

/**
 * Frees the seat of an enrolment that is still unpaid. The delete carries the `pending` filter, so a payment that lands in
 * between stops it, and a completed payment row stops it before that.
 */
export async function releaseSeat(enrolmentId: string): Promise<string | null> {
  const { data: payments, error: paymentError } = await supabase
    .from("payments")
    .select("id")
    .eq("reference_id", enrolmentId)
    .eq("payment_type", "intensive_enrollment")
    .eq("status", "completed");
  if (paymentError) return paymentError.message;
  if ((payments ?? []).length > 0) return "A payment has been recorded for this enrolment, so the seat cannot be released";
  const { data, error } = await supabase
    .from("intensive_enrollments")
    .delete()
    .eq("id", enrolmentId)
    .eq("payment_status", "pending")
    .select("id");
  if (error) return error.message;
  return (data ?? []).length === 0 ? "This enrolment is no longer unpaid, so it was not released" : null;
}

export interface EnrolRequest {
  familyId: string;
  childName: string;
  classIds: string[];
  feePerSubject: number;
  parentName?: string;
  phone?: string;
  email?: string;
}

export interface EnrolResult {
  enrollmentId: string;
  loginId: string;
  childId: string;
  loginCreated: boolean;
  emailIsPlaceholder: boolean;
  alreadyEnrolled: boolean;
  replaced: boolean;
  totalAmount: number;
}

/** Calls enrol-december-family. The message is the function's own sentence when it refused. */
export async function enrolFamily(request: EnrolRequest): Promise<{ result: EnrolResult } | { error: string }> {
  const { data, error } = await supabase.functions.invoke("enrol-december-family", { body: request });
  if (error) return { error: await messageFrom(error) };
  return { result: data as EnrolResult };
}
```

If `tsc` says `"completed"` is not a payment status for the `.eq("status", ...)` in `releaseSeat`, read the `payment_status` enum in `src/integrations/supabase/types.ts` and use the value it lists for a finished payment (the paybill function writes `completed`).

- [ ] **Step 4: Load enrolments and children**

In `src/components/admin/crm/useDecemberDesk.ts`:

Replace `import type { DeskNote } from "@/utils/decemberDesk";` with `import type { DeskChild, DeskEnrolment, DeskNote } from "@/utils/decemberDesk";`.

Replace

```ts
export interface DeskData {
  program: HolidayProgram | null;
  classes: DeskClass[];
  notes: DeskNoteRow[];
}
```

with

```ts
export interface DeskData {
  program: HolidayProgram | null;
  classes: DeskClass[];
  notes: DeskNoteRow[];
  enrolments: DeskEnrolment[];
  children: DeskChild[];
}
```

Replace `const EMPTY: DeskData = { program: null, classes: [], notes: [] };` with `const EMPTY: DeskData = { program: null, classes: [], notes: [], enrolments: [], children: [] };`.

Replace

```ts
      const rows = classRes.data ?? [];
      const tutorNames = await readTutorNames(rows.map((c) => c.tutor_id));
      setData({
        program,
        classes: rows.map((c) => ({ ...c, tutor_name: c.tutor_id ? (tutorNames.get(c.tutor_id) ?? null) : null })),
        notes,
      });
```

with

```ts
      const enrolRes = await supabase
        .from("intensive_enrollments")
        .select("id, student_id, student_profile_id, enrolled_class_ids, payment_status, total_amount")
        .eq("program_id", program.id);
      if (enrolRes.error) throw enrolRes.error;
      const enrolments = (enrolRes.data ?? []) as DeskEnrolment[];
      const childIds = [...new Set(enrolments.map((e) => e.student_profile_id).filter((id): id is string => Boolean(id)))];
      let children: DeskChild[] = [];
      if (childIds.length > 0) {
        const kidsRes = await supabase.from("students").select("id, full_name").in("id", childIds);
        if (kidsRes.error) throw kidsRes.error;
        children = kidsRes.data ?? [];
      }

      const rows = classRes.data ?? [];
      const tutorNames = await readTutorNames(rows.map((c) => c.tutor_id));
      setData({
        program,
        classes: rows.map((c) => ({ ...c, tutor_name: c.tutor_id ? (tutorNames.get(c.tutor_id) ?? null) : null })),
        notes,
        enrolments,
        children,
      });
```

- [ ] **Step 5: The message dialog**

`src/components/admin/crm/DecemberMessageDialog.tsx`:

```tsx
import { toast } from "sonner";
import { Copy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { waMessageLink } from "@/utils/decemberDesk";

interface DecemberMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  text: string;
  phone: string | null;
}

/** A message for the team to send. Nothing here is sent by the system: copy it, or open it in WhatsApp. */
export function DecemberMessageDialog({ open, onOpenChange, title, text, phone }: DecemberMessageDialogProps) {
  const link = waMessageLink(phone, text);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy. Select the text and copy it by hand");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            The system sends nothing to the family. Copy this, or open it in WhatsApp, and send it from the admin inbox.
          </DialogDescription>
        </DialogHeader>
        <Textarea readOnly rows={14} value={text} aria-label="Message" className="text-sm" />
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
          <Button variant="outline" onClick={copy}>
            <Copy className="h-4 w-4" />
            Copy
          </Button>
          {link ? (
            <Button asChild>
              <a href={link} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4" />
                Open in WhatsApp
              </a>
            </Button>
          ) : (
            <Button disabled>No phone number</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 6: The enrol dialog**

`src/components/admin/crm/DecemberEnrolDialog.tsx`:

```tsx
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatSlot, seatsLeft } from "@/utils/holidayClasses";
import { DEFAULT_FEE_PER_SUBJECT } from "@/utils/decemberDesk";
import { enrolFamily, type EnrolResult } from "./decemberActions";
import type { DeskClass } from "./useDecemberDesk";

export interface EnrolTarget {
  familyId: string;
  parentName: string;
  phone: string;
  email: string;
  child: string;
  /** Ids of the running classes the child holds a seat in. */
  preselected: string[];
}

export interface EnrolledAs {
  parentName: string;
  childName: string;
  phone: string;
  classIds: string[];
}

interface DecemberEnrolDialogProps {
  target: EnrolTarget;
  runningClasses: DeskClass[];
  onClose: () => void;
  onEnrolled: (result: EnrolResult, as: EnrolledAs) => void;
}

/**
 * Enrol a reserved child in the classes that are running: the family's login, the child's record and the enrolment are made in
 * one step by enrol-december-family. Render it only while a target is chosen; it starts from the target when it mounts.
 */
export function DecemberEnrolDialog({ target, runningClasses, onClose, onEnrolled }: DecemberEnrolDialogProps) {
  const [parentName, setParentName] = useState(target.parentName);
  const [phone, setPhone] = useState(target.phone);
  const [email, setEmail] = useState(target.email);
  const [child, setChild] = useState(target.child);
  const [picked, setPicked] = useState<string[]>(target.preselected);
  const [fee, setFee] = useState(String(DEFAULT_FEE_PER_SUBJECT));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setParentName(target.parentName);
    setPhone(target.phone);
    setEmail(target.email);
    setChild(target.child);
    setPicked(target.preselected);
    setFee(String(DEFAULT_FEE_PER_SUBJECT));
  }, [target]);

  const feeNumber = Number(fee);
  const total = Number.isFinite(feeNumber) && feeNumber > 0 ? feeNumber * picked.length : 0;
  const ready = child.trim().length >= 2 && picked.length > 0 && Number.isFinite(feeNumber) && feeNumber > 0;

  const toggle = (id: string, on: boolean) => setPicked((current) => (on ? [...current, id] : current.filter((c) => c !== id)));

  const save = async () => {
    setSaving(true);
    const outcome = await enrolFamily({
      familyId: target.familyId,
      childName: child.trim(),
      classIds: picked,
      feePerSubject: feeNumber,
      parentName: parentName.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
    });
    setSaving(false);
    if ("error" in outcome) {
      toast.error(outcome.error);
      return;
    }
    toast.success(outcome.result.alreadyEnrolled ? "Already enrolled in these classes" : "Enrolled. The seats are held");
    onEnrolled(outcome.result, { parentName: parentName.trim(), childName: child.trim(), phone: phone.trim(), classIds: picked });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enrol {target.child || "this child"}</DialogTitle>
          <DialogDescription>
            Makes the family's login if it has none, the child's record and the enrolment. The seats are held until it is paid or released.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="enrol-parent">Parent</Label>
              <Input id="enrol-parent" value={parentName} onChange={(e) => setParentName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="enrol-phone">Phone</Label>
              <Input id="enrol-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="enrol-email">Email (optional)</Label>
            <Input id="enrol-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {!email.trim() && (
              <p className="text-xs text-amber-700">
                With no email the confirmation and the daily reminders will not reach this family. Send them the class links on WhatsApp.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="enrol-child">Child</Label>
            <Input id="enrol-child" value={child} onChange={(e) => setChild(e.target.value)} />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Classes that are running</legend>
            {runningClasses.length === 0 && <p className="text-xs text-muted-foreground">No class is running yet. Open one first.</p>}
            {runningClasses.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <Checkbox
                  id={`enrol-class-${c.id}`}
                  aria-label={`${c.grade_levels.join(" and ")} ${c.subject}`}
                  checked={picked.includes(c.id)}
                  onCheckedChange={(on) => toggle(c.id, on === true)}
                />
                <Label htmlFor={`enrol-class-${c.id}`} className="text-sm font-normal">
                  {c.grade_levels.join(" and ")} {c.subject} · {formatSlot(c.time_slot)}
                  <span className="ml-1 text-xs text-muted-foreground">({seatsLeft(c)} seats left)</span>
                </Label>
              </div>
            ))}
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="enrol-fee">Fee per subject (KES)</Label>
            <Input id="enrol-fee" type="number" inputMode="decimal" min="1" value={fee} onChange={(e) => setFee(e.target.value)} />
            <p className="text-xs text-muted-foreground">Total KES {total.toLocaleString("en-US")} for {picked.length} {picked.length === 1 ? "subject" : "subjects"}.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !ready}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enrol
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 7: The class card, with its actions**

Replace the whole of `src/components/admin/crm/DecemberClassCard.tsx` with:

```tsx
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatSlot } from "@/utils/holidayClasses";
import { classCode, classState, type ClassState, type DeskEnrolment, type HolderStage } from "@/utils/decemberDesk";
import { formatPhone } from "./crmMeta";
import type { DeskClass } from "./useDecemberDesk";

export interface HolderRow {
  key: string;
  familyId: string;
  child: string;
  parentName: string;
  phone: string | null;
  email: string | null;
  duplicate: boolean;
  stage: HolderStage;
  enrolment: DeskEnrolment | null;
}

const CHIP: Record<ClassState, { label: (needed: number) => string; className: string }> = {
  needs: { label: (n) => `Needs ${n} more`, className: "bg-amber-100 text-amber-800" },
  ready: { label: () => "Ready to open", className: "bg-emerald-100 text-emerald-800" },
  running: { label: () => "Running", className: "bg-primary/10 text-primary" },
  archived: { label: () => "Archived", className: "bg-muted text-muted-foreground" },
};

export interface ClassCardActions {
  onOpenClass: () => void;
  onArchive: () => void;
  /** Puts a running class back to taking reservations, or restores an archived one. */
  onReopenReservations: () => void;
  onEnrol: (row: HolderRow) => void;
  onPaymentMessage: (row: HolderRow) => void;
  onPaybill: (row: HolderRow) => void;
  onRelease: (row: HolderRow) => void;
  onLinks: (row: HolderRow) => void;
  onNotRunning: (row: HolderRow) => void;
}

interface DecemberClassCardProps extends ClassCardActions {
  cls: DeskClass;
  seats: number;
  holders: HolderRow[];
  checkNotes: boolean;
  /** Enrolments that include this class, and how many of them are paid. */
  enrolled: number;
  paid: number;
}

const small = "h-7 px-2 text-xs";

/** One class: its slot, tutor, seats and state, the families who hold the seats, and what the team can do with them. */
export function DecemberClassCard({ cls, seats, holders, checkNotes, enrolled, paid, ...actions }: DecemberClassCardProps) {
  const { state, needed } = classState(cls.status, seats);
  const chip = CHIP[state];
  const label = `${cls.grade_levels.join(" and ")} ${cls.subject}`;
  const hasEnrolments = enrolled > 0;
  const lockedTitle = hasEnrolments ? "Release its enrolments first" : undefined;

  return (
    <Card className={cn(state === "archived" && "opacity-70")} data-class-code={classCode(cls) ?? ""}>
      <CardHeader className="space-y-1 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold">{cls.subject}</CardTitle>
            <p className="text-xs text-muted-foreground">{formatSlot(cls.time_slot)}</p>
          </div>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", chip.className)}>{chip.label(needed)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Tutor: {cls.tutor_name ?? "No tutor yet"} · Reserved {Math.max(seats, 0)} · Enrolled {enrolled} · Paid {paid} · of {cls.max_students}
          {checkNotes && <span className="ml-1 font-medium text-amber-700">· check the notes</span>}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {(state === "needs" || state === "ready") && (
            <Button size="sm" className={small} aria-label={`Open class ${label}`} onClick={actions.onOpenClass}>
              Open class
            </Button>
          )}
          {state === "running" && (
            <Button size="sm" variant="outline" className={small} aria-label={`Back to reserving ${label}`} disabled={hasEnrolments} title={lockedTitle} onClick={actions.onReopenReservations}>
              Back to reserving
            </Button>
          )}
          {state === "archived" && (
            <Button size="sm" variant="outline" className={small} aria-label={`Restore class ${label}`} onClick={actions.onReopenReservations}>
              Restore
            </Button>
          )}
          {state !== "archived" && (
            <Button size="sm" variant="outline" className={small} aria-label={`Archive class ${label}`} disabled={hasEnrolments} title={lockedTitle} onClick={actions.onArchive}>
              Archive
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {holders.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nobody has reserved yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {holders.map((h) => {
              const name = h.child || h.parentName;
              return (
                <li key={h.key} className="space-y-2 px-3 py-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {h.child || "(no name)"}
                        {h.duplicate && <span className="ml-2 text-xs font-normal text-amber-700">possible duplicate</span>}
                      </p>
                      <Link to={`/admin/families/${h.familyId}`} className="text-xs text-muted-foreground hover:underline">
                        {h.parentName}
                        {h.phone ? ` · ${formatPhone(h.phone)}` : ""}
                      </Link>
                    </div>
                    {h.stage !== "reserved" && (
                      <span className={cn("shrink-0 text-xs font-medium", h.stage === "paid" ? "text-emerald-700" : "text-amber-700")}>
                        {h.stage === "paid" ? "Paid" : "Enrolled, unpaid"}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {state === "running" && h.stage === "reserved" && (
                      <Button size="sm" className={small} aria-label={`Enrol ${name}`} onClick={() => actions.onEnrol(h)}>
                        Enrol
                      </Button>
                    )}
                    {state === "running" && h.stage === "enrolled" && (
                      <>
                        <Button size="sm" variant="outline" className={small} aria-label={`Payment message for ${name}`} onClick={() => actions.onPaymentMessage(h)}>
                          Payment message
                        </Button>
                        <Button size="sm" variant="outline" className={small} aria-label={`Record paybill for ${name}`} onClick={() => actions.onPaybill(h)}>
                          Record paybill
                        </Button>
                        <Button size="sm" variant="outline" className={small} aria-label={`Release seat of ${name}`} onClick={() => actions.onRelease(h)}>
                          Release seat
                        </Button>
                      </>
                    )}
                    {state === "running" && h.stage === "paid" && (
                      <Button size="sm" variant="outline" className={small} aria-label={`Class links for ${name}`} onClick={() => actions.onLinks(h)}>
                        Class links
                      </Button>
                    )}
                    {state === "archived" && (
                      <Button size="sm" variant="outline" className={small} aria-label={`Message ${name}`} onClick={() => actions.onNotRunning(h)}>
                        Not-running message
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 8: The page, wired to the actions**

Replace the whole of `src/pages/admin/CrmDecember.tsx` with:

```tsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordPaybillDialog, type PaybillEnrollment } from "@/components/admin/RecordPaybillDialog";
import { CrmShell } from "@/components/admin/crm/CrmShell";
import { DecemberClassCard, type HolderRow } from "@/components/admin/crm/DecemberClassCard";
import { DecemberEnrolDialog, type EnrolTarget } from "@/components/admin/crm/DecemberEnrolDialog";
import { DecemberMessageDialog } from "@/components/admin/crm/DecemberMessageDialog";
import { releaseSeat, setClassStatus, type ClassStatus, type EnrolResult } from "@/components/admin/crm/decemberActions";
import { useDecemberDesk, type DeskClass } from "@/components/admin/crm/useDecemberDesk";
import { MIN_STUDENTS_TO_OPEN, formatProgramRange, groupByGrade } from "@/utils/holidayClasses";
import {
  PAY_BY,
  RESERVATIONS_CLOSE,
  buildLinksMessage,
  buildNotRunningMessage,
  buildPaymentMessage,
  childCodes,
  classCode,
  holderStage,
  listsDisagree,
  readLists,
  shortDay,
  tallyNotes,
  type DecemberCode,
  type DeskEnrolment,
  type MessageClass,
} from "@/utils/decemberDesk";

interface Confirm {
  title: string;
  body: string;
  label: string;
  done: string;
  run: () => Promise<string | null>;
}

interface Message {
  title: string;
  text: string;
  phone: string | null;
}

const gradeOf = (c: DeskClass): string => c.grade_levels.join(" and ");

const messageClass = (c: DeskClass): MessageClass => ({
  grade: gradeOf(c),
  subject: c.subject,
  slot: c.time_slot,
  tutorFirstName: c.tutor_name ? c.tutor_name.split(" ")[0] : null,
  meetingLink: c.meeting_link,
});

/** December: seats per class from the DEC26 notes, who holds them, and what the team does with them until the classes start. */
export default function CrmDecember() {
  const desk = useDecemberDesk();
  const { program, classes, notes, enrolments, children } = desk.data;

  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [busy, setBusy] = useState(false);
  const [enrol, setEnrol] = useState<EnrolTarget | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [paybill, setPaybill] = useState<PaybillEnrollment | null>(null);

  const tally = useMemo(() => tallyNotes(notes), [notes]);
  const lists = useMemo(() => readLists(notes), [notes]);
  const disagree = useMemo(() => new Set(listsDisagree(tally, lists)), [tally, lists]);
  const families = useMemo(() => new Map(notes.flatMap((n) => (n.families ? [[n.family_id, n.families] as const] : []))), [notes]);
  const groups = useMemo(() => groupByGrade(classes), [classes]);

  const classById = (id: string) => classes.find((c) => c.id === id);
  const classesOf = (enrolment: DeskEnrolment): DeskClass[] =>
    enrolment.enrolled_class_ids.map(classById).filter((c): c is DeskClass => Boolean(c));

  const holdersOf = (cls: DeskClass, code: DecemberCode | null): HolderRow[] =>
    code
      ? lists.held
          .filter((h) => h.code === code)
          .map((h, index) => {
            const family = families.get(h.familyId);
            const { stage, enrolment } = holderStage({ holding: h, classId: cls.id, family, enrolments, children });
            return {
              key: `${h.familyId}-${h.child}-${index}`,
              familyId: h.familyId,
              child: h.child,
              parentName: family?.parent_name || "Unknown parent",
              phone: family?.phone ?? null,
              email: family?.email ?? null,
              duplicate: lists.duplicates.some(
                (d) => d.familyId === h.familyId && d.code === h.code && d.child.trim().toLowerCase() === h.child.trim().toLowerCase(),
              ),
              stage,
              enrolment,
            };
          })
      : [];

  // ---- class actions
  const changeStatus = (cls: DeskClass, status: ClassStatus, c: Pick<Confirm, "title" | "body" | "label" | "done">) =>
    setConfirm({ ...c, run: () => setClassStatus(cls.id, status) });

  const openClass = (cls: DeskClass, seats: number) => {
    const warnings = [
      seats < MIN_STUDENTS_TO_OPEN ? `It has ${Math.max(seats, 0)} of the ${MIN_STUDENTS_TO_OPEN} seats a class usually needs.` : "",
      !cls.tutor_name ? "It has no tutor yet." : "",
    ].filter(Boolean);
    changeStatus(cls, "confirmed", {
      title: `Open ${gradeOf(cls)} ${cls.subject}?`,
      body: `${warnings.join(" ")} The public page will say it is running, and the calendar sync will include it.`.trim(),
      label: "Open class",
      done: "Class opened",
    });
  };

  const archiveClass = (cls: DeskClass) =>
    changeStatus(cls, "archived", {
      title: `Archive ${gradeOf(cls)} ${cls.subject}?`,
      body: "It leaves the public page. The families who reserved can be sent the not-running message from this card.",
      label: "Archive class",
      done: "Class archived",
    });

  const reopenReservations = (cls: DeskClass) =>
    changeStatus(cls, "active", {
      title: `Take ${gradeOf(cls)} ${cls.subject} back to reservations?`,
      body: "The public page will say it opens when enough families reserve.",
      label: "Yes, take it back",
      done: "Class is taking reservations",
    });

  const runConfirmed = async () => {
    if (!confirm) return;
    setBusy(true);
    const problem = await confirm.run();
    setBusy(false);
    if (problem) {
      toast.error(problem);
      return;
    }
    toast.success(confirm.done);
    setConfirm(null);
    await desk.reload();
  };

  // ---- family actions
  const startEnrol = (row: HolderRow) => {
    const codes = childCodes(lists, row.familyId, row.child);
    setEnrol({
      familyId: row.familyId,
      parentName: row.parentName === "Unknown parent" ? "" : row.parentName,
      phone: row.phone ?? "",
      email: row.email ?? "",
      child: row.child,
      preselected: classes.filter((c) => c.status === "confirmed" && codes.includes(classCode(c) as DecemberCode)).map((c) => c.id),
    });
  };

  const showPaymentMessage = (
    who: { parentName: string; childName: string; phone: string | null },
    classIds: string[],
    amount: number,
  ) => {
    if (!program) return;
    setMessage({
      title: `Payment message for ${who.childName}`,
      phone: who.phone,
      text: buildPaymentMessage({
        parentName: who.parentName,
        childName: who.childName,
        classes: classIds.map(classById).filter((c): c is DeskClass => Boolean(c)).map(messageClass),
        startDate: program.start_date.slice(0, 10),
        amount,
        payBy: PAY_BY,
      }),
    });
  };

  const onEnrolled = async (result: EnrolResult, as: { parentName: string; childName: string; phone: string; classIds: string[] }) => {
    setEnrol(null);
    if (result.emailIsPlaceholder) {
      toast.warning("This family has no usable email, so the confirmation and daily reminders will not reach them. Send the class links on WhatsApp.");
    }
    showPaymentMessage({ parentName: as.parentName, childName: as.childName, phone: as.phone || null }, as.classIds, result.totalAmount);
    await desk.reload();
  };

  const paymentMessageFor = (row: HolderRow) => {
    if (!row.enrolment) return;
    showPaymentMessage(
      { parentName: row.parentName, childName: row.child || row.parentName, phone: row.phone },
      row.enrolment.enrolled_class_ids,
      Number(row.enrolment.total_amount),
    );
  };

  const recordPaybill = (row: HolderRow) => {
    if (!row.enrolment || !program) return;
    setPaybill({
      id: row.enrolment.id,
      totalAmount: Number(row.enrolment.total_amount),
      paymentStatus: row.enrolment.payment_status,
      who: row.child || row.parentName,
      subjects: classesOf(row.enrolment).map((c) => c.subject),
      programName: program.name,
    });
  };

  const release = (row: HolderRow) => {
    const enrolment = row.enrolment;
    if (!enrolment) return;
    setConfirm({
      title: `Release ${row.child || row.parentName}'s seats?`,
      body: "Deletes the unpaid enrolment and gives its seats back. Nothing has been paid on it.",
      label: "Release seats",
      done: "Seats released",
      run: () => releaseSeat(enrolment.id),
    });
  };

  const showLinks = (row: HolderRow) => {
    if (!row.enrolment) return;
    const text = buildLinksMessage({
      parentName: row.parentName,
      childName: row.child || row.parentName,
      classes: classesOf(row.enrolment).map(messageClass),
    });
    if (!text) {
      toast.info("No class has a meeting link yet. Generate the links in Bootcamp Admin first.");
      return;
    }
    setMessage({ title: `Class links for ${row.child || row.parentName}`, text, phone: row.phone });
  };

  const showNotRunning = (row: HolderRow, cls: DeskClass) =>
    setMessage({
      title: `Not-running message for ${row.child || row.parentName}`,
      phone: row.phone,
      text: buildNotRunningMessage({ parentName: row.parentName, childName: row.child || "your child", className: `${gradeOf(cls)} ${cls.subject}` }),
    });

  const subtitle = program
    ? `${formatProgramRange(program.start_date, program.end_date)} · reservations close ${shortDay(RESERVATIONS_CLOSE)} · pay by ${shortDay(PAY_BY)}`
    : undefined;

  return (
    <CrmShell
      title="December"
      subtitle={subtitle}
      active="december"
      actions={
        <Button variant="outline" size="sm" onClick={() => void desk.reload()} className="hidden sm:inline-flex">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      }
    >
      {desk.error ? (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-2">
            <p>Could not load the December desk: {desk.error}. The seat counts are not shown, so nothing here is zero by mistake.</p>
            <Button size="sm" variant="outline" onClick={() => void desk.reload()}>
              Try again
            </Button>
          </div>
        </div>
      ) : desk.loading && !program ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !program ? (
        <p className="py-6 text-sm text-muted-foreground">No December program is running, or it has already ended.</p>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.grade} aria-label={group.grade}>
              <h2 className="text-base font-semibold">
                {group.grade}
                {group.exam && <span className="ml-2 text-sm font-normal text-muted-foreground">Heading for {group.exam}</span>}
              </h2>
              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                {group.classes.map((cls) => {
                  const code = classCode(cls);
                  const seats = tally.find((t) => t.code === code)?.seats ?? 0;
                  const mine = enrolments.filter((e) => e.enrolled_class_ids.includes(cls.id));
                  return (
                    <DecemberClassCard
                      key={cls.id}
                      cls={cls}
                      seats={seats}
                      holders={holdersOf(cls, code)}
                      checkNotes={code !== null && disagree.has(code)}
                      enrolled={mine.length}
                      paid={mine.filter((e) => e.payment_status === "completed").length}
                      onOpenClass={() => openClass(cls, seats)}
                      onArchive={() => archiveClass(cls)}
                      onReopenReservations={() => reopenReservations(cls)}
                      onEnrol={startEnrol}
                      onPaymentMessage={paymentMessageFor}
                      onPaybill={recordPaybill}
                      onRelease={release}
                      onLinks={showLinks}
                      onNotRunning={(row) => showNotRunning(row, cls)}
                    />
                  );
                })}
              </div>
            </section>
          ))}

          {lists.unreadable.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Notes the desk could not read</CardTitle>
                <p className="text-xs text-muted-foreground">
                  They start with DEC26 but name no class code, so they count as no seat. Fix them on the family's timeline.
                </p>
              </CardHeader>
              <CardContent>
                <ul className="divide-y rounded-md border">
                  {lists.unreadable.map((u, index) => (
                    <li key={`${u.familyId}-${index}`} className="px-3 py-2 text-sm">
                      <p className="break-words">{u.text}</p>
                      <Link to={`/admin/families/${u.familyId}`} className="text-xs text-muted-foreground hover:underline">
                        {families.get(u.familyId)?.parent_name || "Open the family"}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && !busy && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void runConfirmed();
              }}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {confirm?.label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {enrol && (
        <DecemberEnrolDialog
          target={enrol}
          runningClasses={classes.filter((c) => c.status === "confirmed")}
          onClose={() => setEnrol(null)}
          onEnrolled={onEnrolled}
        />
      )}

      <DecemberMessageDialog
        open={message !== null}
        onOpenChange={(open) => !open && setMessage(null)}
        title={message?.title ?? ""}
        text={message?.text ?? ""}
        phone={message?.phone ?? null}
      />

      <RecordPaybillDialog
        open={paybill !== null}
        onOpenChange={(open) => !open && setPaybill(null)}
        enrollment={paybill}
        onRecorded={() => void desk.reload()}
      />
    </CrmShell>
  );
}
```

- [ ] **Step 9: Type check, lint, build**

```bash
npx tsc -p tsconfig.app.json --noEmit; echo "tsc exit $?"
npx eslint src/utils/decemberDesk.ts src/components/admin/crm/decemberActions.ts src/components/admin/crm/DecemberEnrolDialog.tsx src/components/admin/crm/DecemberMessageDialog.tsx src/components/admin/crm/DecemberClassCard.tsx src/components/admin/crm/useDecemberDesk.ts src/pages/admin/CrmDecember.tsx; echo "eslint exit $?"
npm run test:crm 2>&1 | grep -E "^# (pass|fail)"
```

Expected: `tsc exit 0`, eslint exit 0, `# fail 0`. The walkthrough in Task 11 is the check of the screen itself.

- [ ] **Step 10: Commit (only when the owner has said commit)**

```bash
git add src/utils/decemberDesk.ts scripts/crm-tests/decemberDesk.test.ts src/components/admin/crm/decemberActions.ts src/components/admin/crm/DecemberEnrolDialog.tsx src/components/admin/crm/DecemberMessageDialog.tsx src/components/admin/crm/DecemberClassCard.tsx src/components/admin/crm/useDecemberDesk.ts src/pages/admin/CrmDecember.tsx
git commit -m "December desk: open, archive, enrol, draft messages, record paybill and release seats from the desk

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task 10: The tutor's roster shows the child

**Files:**
- Modify: `src/components/tutor/TutorBootcampTab.tsx`

A child enrolled from the desk is a record under the parent's login, so the roster, which names the login, would show the parent. This reads the child's record when there is one.

- [ ] **Step 1: Read the child's name when there is one**

In `src/components/tutor/TutorBootcampTab.tsx`, replace

```tsx
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", studentIds);
```

with

```tsx
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", studentIds);

        // A child enrolled by the team has a record of their own under the parent's login: the roster shows the child.
        const childIds = [...new Set(enrollments?.map(e => e.student_profile_id).filter((id): id is string => Boolean(id)) || [])];
        const { data: children } = childIds.length > 0
          ? await supabase.from("students").select("id, full_name").in("id", childIds)
          : { data: [] as { id: string; full_name: string }[] };
```

Replace `                student_name: profile?.full_name || "Unknown Student",` with:

```tsx
                student_name: children?.find(c => c.id === enrollment.student_profile_id)?.full_name || profile?.full_name || "Unknown Student",
```

- [ ] **Step 2: Type check and lint**

```bash
npx tsc -p tsconfig.app.json --noEmit; echo "tsc exit $?"
npx eslint src/components/tutor/TutorBootcampTab.tsx; echo "eslint exit $?"
```

Expected: `tsc exit 0`. The file is old: if eslint reports problems, compare with `origin/main` and fix only what this edit added. The tutor tab needs a tutor sign-in, so it is checked in the dry run (Task 11, Step 6), not in the walkthrough.

- [ ] **Step 3: Commit (only when the owner has said commit)**

```bash
git add src/components/tutor/TutorBootcampTab.tsx
git commit -m "December desk: the tutor's class roster names the child, not the parent's login

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task 11: Phase 2 walkthrough, whole-repo checks and the rollout

**Files:**
- Create: `scripts/crm-verify/december-walkthrough-actions.js`

**Interfaces:**
- Consumes: the built app from Tasks 6 to 10.
- Produces: a walkthrough returning `{ width, results, failed, errors }` that must have no failures and no errors.

- [ ] **Step 1: Write the walkthrough**

`scripts/crm-verify/december-walkthrough-actions.js`:

```js
// Headless walkthrough of the December desk's actions (Phase 2) against a mocked Supabase. Run it like december-walkthrough.js
// (see its header): build, vite preview on 4179, browser_resize, then browser_run_code_unsafe with this file.
//
// Fixtures: Form 3 English is running with three families (one enrolled and unpaid, one paid, one only reserved); Form 3
// Mathematics has 6 seats and is ready to open; Grade 8 Science has one seat and will be archived. It enrols the reserved
// child (checking the request the screen sends and the payment message), opens Mathematics, archives Science and reads its
// not-running message, opens the paybill dialog, releases a seat, and checks Archive is refused for a class with enrolments.
// Nothing real is touched. It returns { width, results, failed, errors }.
async (page) => {
  const BASE = "http://127.0.0.1:4179";
  const OUT = "/tmp/december-walkthrough";
  const SUPA = "https://iccemuiqcdumgxiwxzdq.supabase.co";
  const WIDTH = (page.viewportSize() || { width: 1280 }).width;
  const results = [];
  const errors = [];
  const requests = [];
  const check = (name, ok, detail) => results.push({ name, ok: Boolean(ok), detail: detail === undefined ? "" : String(detail) });

  // ------------------------------------------------------------ fixtures (all invented)
  const ADMIN = "a0000000-0000-4000-8000-000000000001";
  const iso = (t) => new Date(t).toISOString();
  const nowMs = Date.now();
  const D = 24 * 3600e3;
  const fam = (id, name, phone, login = null) => ({ id, parent_name: name, phone, email: null, parent_profile_id: login });
  const FA = "a0000000-0000-4000-8000-00000000000a";
  const FB = "b0000000-0000-4000-8000-00000000000b";
  const FC = "c0000000-0000-4000-8000-00000000000c";
  const FD = "d0000000-0000-4000-8000-00000000000d";
  const FE = "e0000000-0000-4000-8000-00000000000e";
  const FAMILIES = {
    [FA]: fam(FA, "Mrs Alpha", "254712000001", "login-a"),
    [FB]: fam(FB, "Mrs Beta", "254712000002"),
    [FC]: fam(FC, "Mrs Gamma", "254712000003", "login-c"),
    [FD]: fam(FD, "Mrs Delta", "254712000004"),
    [FE]: fam(FE, "Mrs Epsilon", "254712000005"),
  };
  const program = { id: "90000000-0000-4000-8000-000000000001", name: "December 2099 Holiday Classes", description: null, start_date: "2099-12-07", end_date: "2099-12-18", is_active: true };
  const cls = (n, subject, curriculum, grade, slot, extra = {}) => ({ id: `c${n}000000-0000-4000-8000-000000000000`, program_id: program.id, subject, curriculum, grade_levels: [grade], time_slot: slot, max_students: 12, current_enrollment: 0, status: "active", tutor_id: null, meeting_link: null, ...extra });
  const classes = [
    cls(1, "Mathematics", "8-4-4", "Form 3", "8:00 AM - 9:15 AM"),
    cls(2, "Chemistry", "8-4-4", "Form 3", "9:30 AM - 10:45 AM"),
    cls(3, "English", "8-4-4", "Form 3", "11:00 AM - 12:15 PM", { status: "confirmed", tutor_id: "tp1", meeting_link: "https://meet.example.test/english", current_enrollment: 2 }),
    cls(4, "Mathematics", "CBC", "Grade 8", "8:00 AM - 9:15 AM"),
    cls(5, "Integrated Science", "CBC", "Grade 8", "9:30 AM - 10:45 AM"),
    cls(6, "English", "CBC", "Grade 8", "11:00 AM - 12:15 PM"),
  ];
  const [MATHS, , ENG, , SCI] = classes;
  let t = 0;
  const note = (family, body) => ({ id: `n${++t}`, family_id: family, kind: "note", body, occurred_at: iso(nowMs - D + t * 60e3), created_at: iso(nowMs - D + t * 60e3), families: FAMILIES[family] });
  const notes = [
    note(FA, "DEC26 F3-ENG - Amani"),
    note(FC, "DEC26 F3-ENG - Baraka"),
    note(FB, "DEC26 F3-ENG - Wanjiru"),
    note(FC, "DEC26 F3-MATHS - K1"), note(FC, "DEC26 F3-MATHS - K2"), note(FC, "DEC26 F3-MATHS - K3"),
    note(FC, "DEC26 F3-MATHS - K4"), note(FC, "DEC26 F3-MATHS - K5"), note(FC, "DEC26 F3-MATHS - K6"),
    note(FD, "DEC26 G8-SCI - Zuri"),
  ];
  const enrolments = [
    { id: "e-amani", student_id: "login-a", student_profile_id: "kid-amani", enrolled_class_ids: [ENG.id], payment_status: "pending", total_amount: 4000 },
    { id: "e-baraka", student_id: "login-c", student_profile_id: "kid-baraka", enrolled_class_ids: [ENG.id], payment_status: "completed", total_amount: 4000 },
  ];
  const kids = [{ id: "kid-amani", full_name: "Amani" }, { id: "kid-baraka", full_name: "Baraka" }];

  const tableRows = (table) => ({
    intensive_programs: () => [program],
    intensive_classes: () => classes,
    lead_activities: () => notes,
    intensive_enrollments: () => enrolments,
    students: () => kids,
    tutor_profiles: () => [{ id: "tp1", user_id: "u1" }],
    profiles: () => [{ id: "u1", full_name: "Jane Tutor" }],
    payments: () => [],
  }[table] || (() => []))();

  const matches = (row, key, value) => {
    const m = /^(eq|neq|in|cs)\.(.*)$/.exec(value);
    if (!m) return true;
    const [, op, arg] = m;
    // `cs` is "contains", what .contains("enrolled_class_ids", [id]) sends: enrolled_class_ids=cs.{id}
    if (op === "cs") return Array.isArray(row[key]) && row[key].includes(arg.replace(/^\{|\}$/g, "").replace(/"/g, ""));
    const cell = String(row[key]);
    if (op === "eq") return cell === arg;
    if (op === "neq") return cell !== arg;
    return arg.replace(/^\(|\)$/g, "").split(",").map((s) => s.replace(/^"|"$/g, "")).includes(cell);
  };
  const query = (table, params) => {
    let rows = tableRows(table).slice();
    for (const [key, value] of params.entries()) {
      if (["select", "order", "limit", "offset", "columns"].includes(key)) continue;
      rows = rows.filter((r) => matches(r, key, value));
    }
    return rows;
  };

  const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS", "access-control-expose-headers": "*" };
  const reply = (route, status, body) => route.fulfill({ status, contentType: "application/json", headers: CORS, body: body === undefined ? "" : JSON.stringify(body) });
  const session = { access_token: "aaa.bbb.ccc", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 30 * 86400, refresh_token: "r", user: { id: ADMIN, aud: "authenticated", role: "authenticated", email: "admin@example.test", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" } };

  await page.route(`${SUPA}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const wantsBody = (req.headers()["prefer"] || "").includes("return=representation");
    try {
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      if (path.startsWith("/auth/v1/")) return reply(route, 200, path.endsWith("/user") ? session.user : session);
      if (path === "/functions/v1/enrol-december-family") {
        const body = JSON.parse(req.postData());
        requests.push({ what: "enrol", body });
        const wanjiru = { id: "e-wanjiru", student_id: "login-new", student_profile_id: "kid-wanjiru", enrolled_class_ids: body.classIds, payment_status: "pending", total_amount: body.feePerSubject * body.classIds.length };
        enrolments.push(wanjiru);
        kids.push({ id: "kid-wanjiru", full_name: body.childName });
        FAMILIES[FB].parent_profile_id = "login-new";
        return reply(route, 200, { success: true, enrollmentId: "e-wanjiru", loginId: "login-new", childId: "kid-wanjiru", loginCreated: true, emailIsPlaceholder: true, alreadyEnrolled: false, replaced: false, totalAmount: wanjiru.total_amount });
      }
      if (path.startsWith("/functions/v1/")) return reply(route, 200, {});
      if (path.startsWith("/rest/v1/rpc/")) {
        const name = path.split("/").pop();
        if (name === "has_role") return reply(route, 200, true);
        if (name === "crm_team_members") return reply(route, 200, [{ user_id: ADMIN, full_name: "Test Admin" }]);
        return reply(route, 404, { message: "unknown rpc " + name });
      }
      if (path.startsWith("/rest/v1/")) {
        const table = path.split("/").pop();
        const rows = query(table, url.searchParams);
        if (req.method() === "GET") return reply(route, 200, rows);
        const body = req.postData() ? JSON.parse(req.postData()) : null;
        if (req.method() === "PATCH") {
          requests.push({ what: `patch ${table}`, query: url.search, body });
          rows.forEach((r) => Object.assign(r, body));
          return wantsBody ? reply(route, 200, rows) : reply(route, 204);
        }
        if (req.method() === "DELETE") {
          requests.push({ what: `delete ${table}`, query: url.search });
          if (table === "intensive_enrollments") for (const r of rows) enrolments.splice(enrolments.indexOf(r), 1);
          return wantsBody ? reply(route, 200, rows) : reply(route, 204);
        }
        return reply(route, 201);
      }
      return reply(route, 200, []);
    } catch (e) {
      errors.push("mock: " + e.message);
      return reply(route, 500, { message: e.message });
    }
  });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1|localhost|iccemuiqcdumgxiwxzdq\.supabase\.co)/, (route) => route.abort());
  await page.addInitScript((value) => { try { localStorage.setItem("sb-iccemuiqcdumgxiwxzdq-auth-token", JSON.stringify(value)); } catch (e) { /* no storage */ } }, session);

  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|net::ERR_/.test(m.text())) errors.push("console: " + m.text()); });

  const shot = (name) => page.screenshot({ path: `${OUT}/${name}-${WIDTH}.png`, fullPage: true });
  const visible = async (locator, name, timeout = 8000) => {
    try { await locator.first().waitFor({ state: "visible", timeout }); check(name, true); return true; } catch (e) { check(name, false, e.message.split("\n")[0]); return false; }
  };
  const card = (code) => page.locator(`[data-class-code="${code}"]`);
  const text = async (locator) => ((await locator.first().textContent()) || "").replace(/\s+/g, " ");
  const noOverflow = async (label) => {
    const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`${label}: no sideways scrolling at ${WIDTH}px`, wide <= 1, `${wide}px wider than the window`);
  };

  // ------------------------------------------------------------ 1. The desk with a running class
  await page.goto(`${BASE}/admin/december`);
  await visible(card("F3-ENG"), "Desk: the Form 3 English card is there");
  const eng = await text(card("F3-ENG"));
  check("Desk: English is Running with 3 reserved, 2 enrolled, 1 paid", /Running/.test(eng) && /Reserved 3 · Enrolled 2 · Paid 1/.test(eng), eng);
  check("Desk: the tutor is named", /Tutor: Jane Tutor/.test(eng), eng);
  await visible(card("F3-ENG").getByRole("button", { name: "Enrol Wanjiru" }), "Desk: the reserved child has Enrol");
  await visible(card("F3-ENG").getByRole("button", { name: "Record paybill for Amani" }), "Desk: the unpaid child has Record paybill");
  await visible(card("F3-ENG").getByRole("button", { name: "Class links for Baraka" }), "Desk: the paid child has Class links");
  const mathsText = await text(card("F3-MATHS"));
  check("Desk: Mathematics is ready to open", /Ready to open/.test(mathsText), mathsText);
  check("Desk: Back to reserving is disabled while English has enrolments", await card("F3-ENG").getByRole("button", { name: /Back to reserving/ }).isDisabled());
  check("Desk: Archive is disabled while English has enrolments", await card("F3-ENG").getByRole("button", { name: /Archive class/ }).isDisabled());
  await noOverflow("Desk");
  await shot("1-desk");

  // ------------------------------------------------------------ 2. Enrol the reserved child
  await card("F3-ENG").getByRole("button", { name: "Enrol Wanjiru" }).click();
  const enrolDialog = page.getByRole("dialog");
  await visible(enrolDialog.getByText("Enrol Wanjiru"), "Enrol: the dialog opens");
  check("Enrol: the parent is filled in", (await enrolDialog.locator("#enrol-parent").inputValue()) === "Mrs Beta");
  check("Enrol: English is ticked", await enrolDialog.getByRole("checkbox", { name: "Form 3 English" }).isChecked());
  await visible(enrolDialog.getByText(/With no email the confirmation/), "Enrol: it warns about no email");
  check("Enrol: the fee starts at 4000", (await enrolDialog.locator("#enrol-fee").inputValue()) === "4000");
  await shot("2-enrol-dialog");
  await enrolDialog.getByRole("button", { name: "Enrol", exact: true }).click();
  const enrolRequest = await (async () => { for (let i = 0; i < 40; i++) { const r = requests.find((x) => x.what === "enrol"); if (r) return r; await page.waitForTimeout(100); } return null; })();
  check("Enrol: the request names the family, child, class and fee", enrolRequest && enrolRequest.body.familyId === FB && enrolRequest.body.childName === "Wanjiru" && enrolRequest.body.classIds.length === 1 && enrolRequest.body.classIds[0] === ENG.id && enrolRequest.body.feePerSubject === 4000, JSON.stringify(enrolRequest));
  const payDialog = page.getByRole("dialog");
  await visible(payDialog.getByText("Payment message for Wanjiru"), "Enrol: the payment message opens");
  const payText = await payDialog.getByLabel("Message").inputValue();
  check("Enrol: the message has the amount, the pay-by day and the paybill", /KES 4,000 by Friday 4 December/.test(payText) && /Monday 7 December/.test(payText) && /Paybill/.test(payText), payText);
  check("Enrol: it can be opened in WhatsApp at the family's number", ((await payDialog.getByRole("link", { name: "Open in WhatsApp" }).getAttribute("href")) || "").startsWith("https://wa.me/254712000002?text="));
  await visible(page.getByText(/no usable email/), "Enrol: it warns that the family has no usable email");
  await shot("3-payment-message");
  await payDialog.getByRole("button", { name: "Done" }).click();
  await page.waitForTimeout(400);
  check("Enrol: the row now says Enrolled, unpaid", /Enrolled, unpaid/.test(await text(card("F3-ENG").locator("li", { hasText: "Wanjiru" }))));

  // ------------------------------------------------------------ 3. Open a class
  await card("F3-MATHS").getByRole("button", { name: /Open class/ }).click();
  const openDialog = page.getByRole("alertdialog");
  await visible(openDialog.getByText(/Open Form 3 Mathematics\?/), "Open: it asks first");
  await visible(openDialog.getByText(/It has no tutor yet/), "Open: it warns there is no tutor");
  await openDialog.getByRole("button", { name: "Open class" }).click();
  await visible(page.getByText("Class opened"), "Open: saying so");
  await page.waitForTimeout(400);
  const opened = requests.find((r) => r.what === "patch intensive_classes" && r.body.status === "confirmed");
  check("Open: the class was set to confirmed", opened && opened.query.includes(`id=eq.${MATHS.id}`), JSON.stringify(opened));
  check("Open: the card now says Running", /Running/.test(await text(card("F3-MATHS"))));

  // ------------------------------------------------------------ 4. Archive a class, read its not-running message
  await card("G8-SCI").getByRole("button", { name: /Archive class/ }).click();
  await visible(page.getByRole("alertdialog").getByText(/Archive Grade 8 Integrated Science\?/), "Archive: it asks first");
  await page.getByRole("alertdialog").getByRole("button", { name: "Archive class" }).click();
  await visible(page.getByText("Class archived"), "Archive: saying so");
  await page.waitForTimeout(400);
  check("Archive: the card now says Archived", /Archived/.test(await text(card("G8-SCI"))));
  await card("G8-SCI").getByRole("button", { name: "Message Zuri" }).click();
  const notRunning = page.getByRole("dialog");
  await visible(notRunning.getByText("Not-running message for Zuri"), "Archive: the not-running message opens");
  check("Archive: it says nothing has been charged and offers the call", /nothing has been charged/.test(await notRunning.getByLabel("Message").inputValue()) && /book-consultation/.test(await notRunning.getByLabel("Message").inputValue()));
  await shot("4-not-running");
  await notRunning.getByRole("button", { name: "Done" }).click();

  // ------------------------------------------------------------ 5. Record paybill, then release a seat
  await card("F3-ENG").getByRole("button", { name: "Record paybill for Amani" }).click();
  await visible(page.getByRole("dialog").getByText("Record a paybill payment"), "Paybill: the existing dialog opens for the enrolment");
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
  await card("F3-ENG").getByRole("button", { name: "Release seat of Amani" }).click();
  await visible(page.getByRole("alertdialog").getByText(/Release Amani's seats\?/), "Release: it asks first");
  await page.getByRole("alertdialog").getByRole("button", { name: "Release seats" }).click();
  await visible(page.getByText("Seats released"), "Release: saying so");
  await page.waitForTimeout(400);
  const released = requests.find((r) => r.what === "delete intensive_enrollments");
  check("Release: the delete is for that enrolment and only while it is pending", released && released.query.includes("id=eq.e-amani") && released.query.includes("payment_status=eq.pending"), JSON.stringify(released));
  check("Release: Amani is back to reserved", await card("F3-ENG").getByRole("button", { name: "Enrol Amani" }).isVisible());
  await noOverflow("Desk after the actions");

  return { width: WIDTH, results, failed: results.filter((r) => !r.ok), errors };
}
```

- [ ] **Step 2: Build and run it at both widths**

```bash
cd /Users/mac/lanatutors/.claude/worktrees/december-desk
npm run build 2>&1 | tail -3
(npx vite preview --port 4179 --strictPort --host 127.0.0.1 > /tmp/december-preview.log 2>&1 &)
sleep 3; curl -s -o /dev/null -w "preview %{http_code}\n" http://127.0.0.1:4179/
```

With the Playwright MCP tools: `browser_resize` 1280x800, then `browser_run_code_unsafe` with `filename` `/Users/mac/lanatutors/.claude/worktrees/december-desk/scripts/crm-verify/december-walkthrough-actions.js`; then again at 390x844. Expected: `failed: []`, `errors: []` each time. Re-run `december-walkthrough.js` (Phase 1's) too. The card line changed from `Reserved N of 12` to `Reserved N · Enrolled 0 · Paid 0 · of 12`, so in that file replace `/Reserved 3 of 12/` with `/Reserved 3 · Enrolled 0 · Paid 0 · of 12/` and `/Reserved 0 of 12/` with `/Reserved 0 · Enrolled 0 · Paid 0 · of 12/`, then run it again at both widths: it has to pass. Stop the server: `lsof -ti tcp:4179 -sTCP:LISTEN | xargs kill`.

- [ ] **Step 3: Whole-repo checks**

```bash
npm run test:crm 2>&1 | grep -E "^# (pass|fail)"
npm run test:edge 2>&1 | grep -E "^# (pass|fail)"
npx tsc -p tsconfig.app.json --noEmit; echo "tsc exit $?"
npm run build 2>&1 | tail -4
git status -sb | head -20
```

Expected: both suites `# fail 0` (CRM total = Task 0's plus the Phase 1 and 2 tests; edge total = Task 0's plus 6 harness tests and the new function's tests); `tsc exit 0`; build exit 0; `git status` lists only this phase's files.

- [ ] **Step 4: Commit (only when the owner has said commit), then stop for the owner**

```bash
git add scripts/crm-verify/december-walkthrough-actions.js scripts/crm-verify/december-walkthrough.js
git commit -m "December desk: a mocked walkthrough of open, archive, enrol, messages and release

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

Do not push, open a pull request, merge, publish or deploy without the owner's go-ahead for each. The pull request description says what the desk now does and that no migration is involved; it carries no business figures.

- [ ] **Step 5: Roll out (the owner decides each step)**

1. **Merge and publish the site.** `gh pr merge <number> --repo jmarando/lanatutors --merge`, then the Lovable `deploy_project` for the project (its id is in the owner's notes, not in this public repo). About three minutes later check the live bundle names a `CrmDecember` chunk containing "Open class" (grep the chunk from `https://lanatutors.africa/assets/`).
2. **Deploy the two functions.** Merging does not deploy them. With the owner's go-ahead naming both, send Lovable's agent this through `send_message` to the project: "Deploy only the edge functions enrol-december-family and sync-bootcamp-to-calendar. Do not edit or create any file, do not change config, secrets, database or settings, no commit. If a deploy fails do not fix it, report the error. List each function and whether it succeeded." Then probe the new one from outside; a made-up token is answered by the gateway without running the function:

```bash
curl -s -o /dev/null -w "enrol-december-family %{http_code}\n" -X POST "https://iccemuiqcdumgxiwxzdq.supabase.co/functions/v1/enrol-december-family" -H "Authorization: Bearer made-up" -H "Content-Type: application/json" -d '{}'
```

Expected: `401` (a `404` means it is not deployed). The changed `sync-bootcamp-to-calendar` cannot be told apart from its old version from outside; its first real run, after tutors are assigned, is its check. It now creates events only for confirmed classes, and it still shows TBD for a class with no tutor, so assign tutors before running it.
3. **Dry run with one test family, before 30 November** (the owner's go-ahead, at a quiet hour, because the public page says Running while a class is open):
   1. In the CRM make a family named "TEST December" with a phone number and an email the owner controls; on its page use December seats to reserve "Test Child" in Form 3 Mathematics.
   2. On the desk, Open class Form 3 Mathematics (accept the warnings). Enrol Test Child with the owner's email. Expect: the payment message with the amount, a "Enrolled, unpaid" row, a timeline line on the family, the family now linked to a login, one seat taken on the card.
   3. Optional, for the paid path (needs a second go-ahead because it writes a payment): Record paybill for the full amount with the reference `TESTDRYRUN1`, confirmation email on. Expect: the row says Paid and the confirmation email reaches the owner's mailbox. This is the one check of the paybill-to-email path on production.
   4. Clean up. If nothing was paid: Release seat, then Back to reserving, and close the test lead. If it was paid, release is refused by design; remove the test rows through the connector with the owner's go-ahead, in one transaction, after reading the ids off the desk and the family page:

```sql
begin;
delete from public.payments where reference_id = '<ENROLMENT_ID>' and payment_type = 'intensive_enrollment';
delete from public.intensive_enrollments where id = '<ENROLMENT_ID>';   -- the trigger gives the seats back
delete from public.students where id = '<CHILD_ID>';
update public.families set parent_profile_id = null where id = '<FAMILY_ID>';
commit;
```

   Then Back to reserving on the class. The test login (a parent account) can stay, or be removed in Lovable Cloud's user list.
4. **Tutor roster.** After a tutor is assigned to a class with an enrolled child, the owner (or the tutor) confirms the tutor's Bootcamp tab shows the child's name, not the parent's.
5. **Notes.** Update the memory notes (December and CRM files and the index) with what went live and what was checked.

## After 18 December

Not part of this plan: remove the route, the nav entry and the desk files, and take the public page and Lana's December reply down (the list is in `HANDOFF-DECEMBER.md`). `enrol-december-family` can be deleted with an explicit function delete if wanted; the `confirmed` handling is harmless to keep.

