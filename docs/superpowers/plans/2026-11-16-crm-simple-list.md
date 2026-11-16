# Simpler CRM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The CRM becomes one list of families with a slide-out panel, shown inside the admin dashboard as its CRM tab.

**Architecture:** A pure module decides each row's next-step pill, the quick filters and the band's counts. The family page's logic moves, unchanged, into a hook that both a slide-out panel and (until it is deleted) the old page use. The admin dashboard gains three tabs with addresses (`/admin/crm`, `/admin/lessons`, `/admin/december`); the CRM's own shell shrinks to a page header; the old Today, Leads and family pages go.

**Tech Stack:** React 18, TypeScript, Vite, react-router 6, shadcn/ui (`Sheet`, `Tabs`), supabase-js; `npm run test:crm` (esbuild plus node:test, picks up every `scripts/crm-tests/*.test.ts`); Playwright MCP for mocked walkthroughs.

**Spec:** `docs/superpowers/specs/2026-11-16-crm-simple-list-design.md` (approved 2026-11-16). Read it first; the approved mockup is described there.

## Global Constraints

- No database migration and no edge function change.
- The repo is public: no business figures or production details in code, docs, commit messages or PR text.
- Commit only when the owner says to. Messages are `CRM: <what>` and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Nairobi time throughout (UTC+3, no daylight saving): "today", "late", "this month" and the times on pills.
- Everything the family page does today stays reachable, with the same behaviour (spec, anti-goal 1).
- A failed read shows an error with Try again, never an empty list or zero counts.
- Plain English in user-facing text, no emojis, match the surrounding code.

## Review Focus

1. A lead whose family row did not come back (`families` is null) still shows a row with a sensible name, and its panel opens.
2. Clicking a second row while the first family is still loading shows only the second family's details.
3. "Won and lost" over a long history stays usable: the first 100 rows, then "Show 100 more".
4. `/admin/crm/<id>` for an id that does not exist (or is not a uuid) shows "This family was not found" in the panel, and the list still works.
5. A family with no phone number: the Call and WhatsApp buttons are disabled with a "No phone number" title, never a dead `tel:` link.

Tests for these live in Task 1 (1) and Task 6 (2 to 5).

---

### Task 0: Branch and baseline

- [ ] **Step 1:** The December desk's Phase 2 (`claude/december-desk-enrol`, worktree `.claude/worktrees/december-desk`) must be committed first, with the owner's word. Then:

```bash
cd /Users/mac/lanatutors
git worktree add .claude/worktrees/crm-simple-list -b claude/crm-simple-list claude/december-desk-enrol
cd .claude/worktrees/crm-simple-list
ln -s /Users/mac/lanatutors/node_modules node_modules
```

(`.env` is tracked, so the new worktree already has it.)

- [ ] **Step 2: Baseline.** Run `npm run test:crm`, `npm run test:edge`, `npx tsc -p tsconfig.app.json --noEmit`.
Expected: crm 65 pass, edge 248 pass, tsc exit 0. Record the totals in the ledger.

---

### Task 1: The list's rules

**Files:**
- Create: `src/components/admin/crm/crmList.ts`
- Test: `scripts/crm-tests/crmList.test.ts`

**Interfaces:**
- Consumes: `Lead`, `LeadWithFamily`, `Stage` (`crmTypes.ts`); `dateKey`, `isOpen`, `formatPhone` (`crmMeta.ts`).
- Produces:
  - `type ListFilter = "open" | "reply" | "overdue" | "booked" | "topup" | "mine" | "closed" | "new" | "progress" | "wonMonth"`
  - `type PillTone = "red" | "amber" | "neutral"`
  - `interface ListContext { today: string; now: string; me: string | null; topUps: Map<string, number> }` (`today` is a Nairobi `YYYY-MM-DD`, `now` an ISO time, `topUps` maps a family id to its sessions left, for families at 1 or fewer)
  - `nextStepPill(lead: Lead, ctx: ListContext): { text: string; tone: PillTone } | null`
  - `matchesFilter(lead: Lead, filter: ListFilter, ctx: ListContext): boolean`
  - `bandCounts(open: Lead[], closed: Lead[], ctx: ListContext): { newCount: number; newThisWeek: number; inProgress: number; dueToday: number; wonThisMonth: number; wonLastMonth: number }`
  - `searchLead(lead: LeadWithFamily, query: string): boolean`
  - `familyName(lead: LeadWithFamily): string`
  - `newestFirst(a: Lead, b: Lead): number`

- [ ] **Step 1: Write the failing tests** in `scripts/crm-tests/crmList.test.ts` (node:test, `assert/strict`, importing from `../../src/utils/...` style relative paths as `decemberDesk.test.ts` does). A `lead(over)` factory returns a complete `Lead` (stage `contacted`, every optional field null, `needs_reply` false, `subjects` [], `created_at` `2026-11-10T07:00:00Z`) merged with `over`. `ctx` is `{ today: "2026-11-16", now: "2026-11-16T10:00:00Z", me: "me", topUps: new Map([["fam-topup", 1], ["fam-empty", 0]]) }` (10:00 UTC is 1:00 pm in Nairobi).

```ts
describe("nextStepPill", () => {
  it("puts a waiting WhatsApp reply first", () =>
    assert.deepEqual(nextStepPill(lead({ needs_reply: true, next_step: "Call", next_step_at: "2026-11-14T07:00:00Z" }), ctx),
      { text: "Reply on WhatsApp", tone: "red" }));
  it("asks for the call to be logged once a booked call has passed, even earlier today", () => {
    assert.deepEqual(nextStepPill(lead({ stage: "call_booked", assessment_at: "2026-11-15T07:00:00Z" }), ctx), { text: "Log the call", tone: "red" });
    assert.deepEqual(nextStepPill(lead({ stage: "call_booked", assessment_at: "2026-11-16T05:00:00Z" }), ctx), { text: "Log the call", tone: "red" });
  });
  it("names today's call that is still ahead, in Nairobi time", () =>
    assert.deepEqual(nextStepPill(lead({ stage: "call_booked", assessment_at: "2026-11-16T13:00:00Z" }), ctx),
      { text: "Assessment call today, 4:00 pm", tone: "neutral" }));
  it("says how late a next step is, or that it is due today, or when it is due", () => {
    const step = (at: string | null) => nextStepPill(lead({ next_step: "Send the package", next_step_at: at }), ctx);
    assert.deepEqual(step("2026-11-15T09:00:00Z"), { text: "Send the package · 1 day late", tone: "red" });
    assert.deepEqual(step("2026-11-13T09:00:00Z"), { text: "Send the package · 3 days late", tone: "red" });
    assert.deepEqual(step("2026-11-16T15:00:00Z"), { text: "Send the package · today", tone: "amber" });
    assert.deepEqual(step("2026-11-18T07:00:00Z"), { text: "Send the package · Tue 18 Nov", tone: "neutral" });
    assert.deepEqual(step(null), { text: "Send the package", tone: "neutral" });
  });
  it("asks for a first call on a new lead, a top-up on a won family down to its last session, and a next step otherwise", () => {
    assert.deepEqual(nextStepPill(lead({ stage: "new" }), ctx), { text: "Needs first call", tone: "neutral" });
    assert.deepEqual(nextStepPill(lead({ stage: "won", family_id: "fam-topup" }), ctx), { text: "Top-up: 1 session left", tone: "amber" });
    assert.deepEqual(nextStepPill(lead({ stage: "won", family_id: "fam-empty" }), ctx), { text: "Top-up: no sessions left", tone: "amber" });
    assert.deepEqual(nextStepPill(lead({ stage: "contacted" }), ctx), { text: "No next step", tone: "amber" });
    assert.equal(nextStepPill(lead({ stage: "won", family_id: "fam-other" }), ctx), null);
    assert.equal(nextStepPill(lead({ stage: "lost" }), ctx), null);
  });
});

describe("matchesFilter", () => {
  const is = (over: Partial<Lead>, f: ListFilter) => matchesFilter(lead(over), f, ctx);
  it("keeps open leads, the waiting ones and the booked ones", () => {
    assert.equal(is({ stage: "contacted" }, "open"), true);
    assert.equal(is({ stage: "won" }, "open"), false);
    assert.equal(is({ needs_reply: true }, "reply"), true);
    assert.equal(is({ needs_reply: true, stage: "lost" }, "reply"), false);
    assert.equal(is({ stage: "call_booked" }, "booked"), true);
  });
  it("counts as overdue a step due today or earlier, and a booked call that has passed", () => {
    assert.equal(is({ next_step: "x", next_step_at: "2026-11-15T09:00:00Z" }, "overdue"), true);
    assert.equal(is({ next_step: "x", next_step_at: "2026-11-16T18:00:00Z" }, "overdue"), true);
    assert.equal(is({ next_step: "x", next_step_at: "2026-11-17T09:00:00Z" }, "overdue"), false);
    assert.equal(is({ stage: "call_booked", assessment_at: "2026-11-16T05:00:00Z" }, "overdue"), true);
  });
  it("finds mine by owner or by who holds the next step, open leads only", () => {
    assert.equal(is({ owner_id: "me" }, "mine"), true);
    assert.equal(is({ next_step_owner_id: "me" }, "mine"), true);
    assert.equal(is({ owner_id: "someone" }, "mine"), false);
    assert.equal(is({ owner_id: "me", stage: "won" }, "mine"), false);
  });
  it("reads won this month on the Nairobi calendar", () => {
    assert.equal(is({ stage: "won", won_at: "2026-10-31T22:00:00Z" }, "wonMonth"), true);  // 1 Nov, 1 am in Nairobi
    assert.equal(is({ stage: "won", won_at: "2026-10-31T20:00:00Z" }, "wonMonth"), false); // 31 Oct, 11 pm in Nairobi
  });
  it("keeps closed leads, new ones, those in progress and those due a top-up", () => {
    assert.equal(is({ stage: "lost" }, "closed"), true);
    assert.equal(is({ stage: "new" }, "new"), true);
    assert.equal(is({ stage: "call_done" }, "progress"), true);
    assert.equal(is({ stage: "new" }, "progress"), false);
    assert.equal(is({ stage: "won", family_id: "fam-topup" }, "topup"), true);
  });
});

describe("bandCounts", () => {
  it("counts new leads, those in progress and those won, with this week's, today's and last month's numbers", () => {
    const open = [
      lead({ stage: "new", created_at: "2026-11-15T07:00:00Z" }),
      lead({ stage: "new", created_at: "2026-11-01T07:00:00Z" }),
      lead({ stage: "contacted", next_step: "x", next_step_at: "2026-11-16T12:00:00Z" }),
      lead({ stage: "call_booked" }),
    ];
    const closed = [
      lead({ stage: "won", won_at: "2026-11-03T07:00:00Z" }),
      lead({ stage: "won", won_at: "2026-10-20T07:00:00Z" }),
      lead({ stage: "won", won_at: "2026-09-20T07:00:00Z" }),
      lead({ stage: "lost", lost_at: "2026-11-02T07:00:00Z" }),
    ];
    assert.deepEqual(bandCounts(open, closed, ctx), { newCount: 2, newThisWeek: 1, inProgress: 2, dueToday: 1, wonThisMonth: 1, wonLastMonth: 1 });
  });
});

describe("searching and naming", () => {
  const withFamily = (families: LeadWithFamily["families"], over: Partial<Lead> = {}) => ({ ...lead(over), families }) as LeadWithFamily;
  it("matches the parent, phone, child, subject and next step, ignoring case", () => {
    const l = withFamily({ id: "f", parent_name: "Grace Achieng", phone: "254712345678", email: null, status: "prospect" },
      { student_name: "Zuri", subjects: ["English"], next_step: "Send the package" });
    for (const q of ["achieng", "2547123", "ZURI", "english", "package", ""]) assert.equal(searchLead(l, q), true, q);
    assert.equal(searchLead(l, "maths"), false);
  });
  it("names a family by its parent, else its phone, else the child", () => {
    assert.equal(familyName(withFamily({ id: "f", parent_name: "Grace", phone: null, email: null, status: "prospect" })), "Grace");
    assert.equal(familyName(withFamily({ id: "f", parent_name: null, phone: "254712345678", email: null, status: "prospect" })), "+254 712 345 678");
    assert.equal(familyName(withFamily(null, { student_name: "Zuri" })), "Zuri's family");
    assert.equal(familyName(withFamily(null)), "Unknown family");
  });
});
```

Check `formatPhone("254712345678")` in `crmMeta.ts` before running: the expected text is whatever it returns for that number; if it differs from `+254 712 345 678`, use its output in the assertion.

- [ ] **Step 2: Run** `npm run test:crm`. Expected: FAIL, `Could not resolve "../../src/components/admin/crm/crmList"`.

- [ ] **Step 3: Implement `crmList.ts`.** The pill follows the spec's order exactly: (1) `needs_reply`; (2) stage `call_booked` and `assessment_at` before `now`: Log the call; (3) stage `call_booked` and `assessment_at` later today: `Assessment call today, h:mm am|pm`; (4) a `next_step`: `· N day(s) late` (red), `· today` (amber), `· Ddd D Mon` (neutral), or the bare text when it has no date; (5) stage `new`: Needs first call; (6) stage `won` with the family in `topUps`: `Top-up: N session(s) left`, `no sessions` at 0; (7) any open stage: No next step; otherwise null. Days and times come from the ISO time plus three hours (Nairobi has no daylight saving), with English day and month abbreviations, so the output never depends on the machine's locale. `overdue` is `dueState`'s rule (a day key at or before `today`) on `next_step_at`, or rule (2). `mine` is Today's rule: `owner_id` or `next_step_owner_id` equals `me`, open leads only. This month starts at `today.slice(0, 7) + "-01"` on Nairobi day keys; last month is the month before. `newThisWeek` counts open stage-New leads whose Nairobi day is within the 7 days ending today. `dueToday` counts in-progress leads whose `next_step_at` is today. `searchLead` moves the Leads screen's matcher out of `CrmLeads.tsx` unchanged. `newestFirst` sorts by `created_at` descending.

- [ ] **Step 4: Run** `npm run test:crm`. Expected: `# fail 0`; the total is the baseline plus this file's tests.

- [ ] **Step 5: Commit** (only when the owner has said commit): `CRM: the list's rules (next-step pill, filters, band counts, search)`.

---

### Task 2: One home for the family page's logic

**Files:**
- Create: `src/components/admin/crm/useFamilyActions.ts`, `src/components/admin/crm/ChildDetails.tsx`
- Modify: `src/pages/admin/CrmFamily.tsx` (uses both; same screen)

**Interfaces:**
- Produces: `useFamilyActions(familyId: string | undefined)` returning `{ data: FamilyBundle; loading: boolean; error: string | null; reload: () => Promise<void>; family: Family | null; activeLead: Lead | null; earlierLeads: Lead[]; meetingLink: string | null; savingLead: boolean; patchLead(patch: LeadUpdate, successMessage?: string): Promise<boolean>; changeStage(value: string): Promise<void>; suggestWon(): void; logging: boolean; setLogging(v: boolean): void; closing: "won" | "lost" | null; setClosing(v: "won" | "lost" | null): void; savingDetails: boolean; saveDetails(fields: ChildFields): Promise<void> }`; `ChildDetails` with its current props (`lead`, `saving`, `onSave`), exported, plus `type ChildFields` (its `onSave` argument).

- [ ] **Step 1: Move, do not rewrite.** Cut `CrmFamily.tsx`'s state, the `activeLead`/`earlierLeads` memo, the meeting-link effect, `fireMeta`, `patchLead`, `changeStage`, `suggestWon` and the child-details save into `useFamilyActions`, and the `ChildDetails` component into its own file, keeping every line of behaviour (the Meta event on stage change, the toasts, the reloads). `CrmFamily.tsx` then calls the hook and renders exactly what it rendered.

- [ ] **Step 2: Prove nothing changed.** Build, serve on 4179 (`npx vite preview --port 4179 --strictPort --host 127.0.0.1`), and run the existing `scripts/crm-verify/walkthrough.js` at 1280 (see its header).
Expected: the same 49 checks, all ok, no errors. Also `npx tsc -p tsconfig.app.json --noEmit` exit 0 and eslint on the three files exit 0.

- [ ] **Step 3: Commit** (when the owner has said commit): `CRM: the family page's logic moves into useFamilyActions`.

---

### Task 3: The family panel

**Files:**
- Create: `src/components/admin/crm/FamilyPanel.tsx`

**Interfaces:**
- Consumes: `useFamilyActions`, `ChildDetails` (Task 2); `familyName` (Task 1); the existing `AssessmentCard`, `NextStepEditor`, `LogCallDialog`, `CloseLeadDialog`, `SessionsCard`, `StudentProgress`, `FamilyTimeline`, `useTeam`, `useListedTutors`, `useTutors`; `telLink`, `waLink`, `channelLabel`, `stageLabel`, `stageClass`, `formatPhone`, `formatDue`.
- Produces: `FamilyPanel({ familyId, onClose, onChanged }: { familyId: string; onClose: () => void; onChanged: () => void })`.

- [ ] **Step 1: Build the panel** from the spec's "The panel" section: a `Sheet` on the right, `w-full sm:max-w-[520px]`, its content keyed by `familyId`; the dark header (name, the child line `student_name · subjects · grade_level`, tiles Stage / Came in / Owner, Call and WhatsApp buttons, disabled with the title "No phone number" when there is none); `Tabs` Info, Follow-up, Payments, History holding, in order:
  - Info: how they found us (`channelLabel`, first seen `formatDue(family.created_at)`), `ChildDetails`, contact (phone, email, area), the assessment call's time and recommended tutor (read-only), earlier leads when there are any;
  - Follow-up: the stage and owner selects, `NextStepEditor`, Log call, `AssessmentCard`, Mark won and Mark lost (and the lost reason), with `LogCallDialog` and `CloseLeadDialog` wired as on the family page;
  - Payments: `SessionsCard` (with `onRecorded = suggestWon`), then `StudentProgress`;
  - History: `FamilyTimeline`.
  Every save calls `reload()` and then `onChanged()`. Loading shows a spinner, an error shows the message with Try again, and a family that does not exist shows "This family was not found."

- [ ] **Step 2: Check** `npx tsc -p tsconfig.app.json --noEmit` and eslint on the file. Expected: exit 0 for both. The panel is exercised in Task 6.

- [ ] **Step 3: Commit** (when the owner has said commit): `CRM: a slide-out panel for a family, with Info, Follow-up, Payments and History`.

---

### Task 4: The list

**Files:**
- Create: `src/components/admin/crm/CrmList.tsx`, `src/components/admin/crm/CrmListRow.tsx`
- Modify: `src/components/admin/crm/NewLeadDialog.tsx` (its two `navigate("/admin/families/…")` calls go to `/admin/crm/…`)

**Interfaces:**
- Consumes: Task 1's module; `FamilyPanel` (Task 3); `useOpenLeads`, `useClosedLeads`, `useTopUps`, `useTeamNames`; `useAuth`; `NewLeadDialog`.
- Produces: `export default function CrmList()`, reading `familyId` from `useParams` (route `/admin/crm/:familyId`); `CrmListRow({ lead, pill, ownerName, onOpen })`.

- [ ] **Step 1: Build the screen** from the spec's "The list" section and the mockup: header (title CRM, subtitle "Families who got in touch, newest first", search, + Add lead), the dark band whose three tiles set the filter (`new`, `progress`, `wonMonth`), the chips (`open` default, `reply`, `overdue`, `booked`, `topup`, `mine`, `closed`) each with its count, then the rows sorted with `newestFirst`. The filters `open`, `reply`, `overdue`, `booked`, `mine`, `new` and `progress` run over the open leads, `closed` and `wonMonth` over the closed ones, and `topup` over both (a family due a top-up is usually won, so closed). Each row shows `familyName`, the child line, the stage pill (`stageLabel`, `stageClass`), the next-step pill (red, amber or neutral), Came in as date-fns `formatDistanceToNowStrict(created_at, { addSuffix: true })` ("2 hours ago", as `GroupClassesTab` uses date-fns) over `channelLabel(channel)`, and the owner's name or a dash. Rows are a grid table from `md` up and cards below it, with Call and WhatsApp working without opening the panel. A row click navigates to `/admin/crm/<familyId>`; closing the panel navigates to `/admin/crm`. `closed` shows 100 rows and then "Show 100 more". `useClosedLeads` must cover the 1st of last month: check its window and pass enough days (62 or more), or read `won_at` directly if it filters on another column. A failed read of open leads, closed leads or top-ups shows the error box with Try again and no counts. `ctx.today` comes from `nairobiDate()`, `ctx.now` from `new Date().toISOString()`, `ctx.topUps` from `useTopUps` (family id to the lowest `sessions_left`).

- [ ] **Step 2: Check** `npx tsc -p tsconfig.app.json --noEmit` and eslint on the three files. Expected: exit 0. The screen is exercised in Task 6.

- [ ] **Step 3: Commit** (when the owner has said commit): `CRM: one list of families with counts, quick filters and search`.

---

### Task 5: The admin dashboard hosts the CRM

**Files:**
- Modify: `src/App.tsx`, `src/pages/AdminDashboard-Redesigned.tsx`, `src/components/admin/AdminSidebar.tsx`, `src/components/admin/AdminLayout.tsx`, `src/components/admin/crm/CrmShell.tsx`, `src/components/admin/crm/LessonRow.tsx`, `src/components/admin/crm/DecemberClassCard.tsx`, `src/pages/admin/CrmDecember.tsx`
- Delete: `src/pages/admin/CrmToday.tsx`, `src/pages/admin/CrmLeads.tsx`, `src/pages/admin/CrmFamily.tsx`, `src/components/admin/crm/LeadRow.tsx` and `TopUpRow.tsx` (when nothing else imports them), `src/components/admin/AdminCrm.tsx`, `src/components/admin/CrmNotesPanel.tsx` (check their real paths with `grep -rn "AdminCrm\|CrmNotesPanel" src`)

**Interfaces:**
- Consumes: `CrmList` (Task 4); `CrmLessons`, `CrmDecember`; `isDeskActive` (`decemberDesk.ts`); `nairobiDate`.
- Produces: the addresses in the spec ("Where it lives"); `AdminSidebar` counts gain `crmNeedsReply: number` and `lessonsToConfirm: number`.

- [ ] **Step 1: Routes.** In `App.tsx`, `/admin`, `/admin/crm`, `/admin/crm/:familyId`, `/admin/lessons` and `/admin/december` render `AdminDashboardRedesigned` (inside `RequireRole roles={["admin"]}`); `/admin/families/:id` redirects to `/admin/crm/:id` (a small component reading the param), `/admin/leads` to `/admin/crm`, `/admin/more` to `/admin`; the `CrmToday`, `CrmLeads` and `CrmFamily` imports and the `isCrmRoute` check go.

- [ ] **Step 2: The dashboard's tabs.** `activeTab` is `crm` on `/admin/crm` and `/admin/crm/:familyId`, `lessons` on `/admin/lessons`, `december` on `/admin/december`, and otherwise the existing state. Choosing one of those three navigates to its address; choosing any other tab sets the state and navigates to `/admin` when the address is one of the three. `renderContent` renders `CrmList`, `CrmLessons` and `CrmDecember` (lazy, inside `Suspense`) for them. Two light count queries feed the new badges: open leads with `needs_reply`, and lessons waiting to be confirmed (the same source as `usePendingLessons`).

- [ ] **Step 3: The menu and the frame.** In `AdminSidebar`, the CRM item loses `to` and shows `counts.crmNeedsReply`; a Lessons item (`id: "lessons"`, badge `counts.lessonsToConfirm`) follows it; the Programs group gains "December desk" (`id: "december"`) while `isDeskActive(nairobiDate())`. `AdminLayout` loses its Today button. `CrmShell` keeps its props but renders only its header (title, subtitle, back link, actions) and children: no rail, no bottom bar. Links to `/admin/families/<id>` in `LessonRow`, `DecemberClassCard` and `CrmDecember` become `/admin/crm/<id>`.

- [ ] **Step 4: Remove** the files listed above, then check nothing still points at them:

```bash
grep -rn "CrmToday\|CrmLeads\|pages/admin/CrmFamily\|AdminCrm\|CrmNotesPanel\|/admin/families/" src | grep -v "App.tsx"
npx tsc -p tsconfig.app.json --noEmit; echo "tsc exit $?"
npm run build 2>&1 | tail -3
```

Expected: the grep prints nothing; tsc exit 0; build exit 0.

- [ ] **Step 5: Commit** (when the owner has said commit): `CRM: the CRM, Lessons and the December desk live inside the admin dashboard`.

---

### Task 6: Walkthroughs and whole-repo checks

**Files:**
- Create: `scripts/crm-verify/crm-list-walkthrough.js`
- Modify: `scripts/crm-verify/walkthrough.js`, `scripts/crm-verify/december-walkthrough.js`, `scripts/crm-verify/december-walkthrough-actions.js`

**Interfaces:**
- Consumes: the built app from Tasks 1 to 5.
- Produces: walkthroughs returning `{ width, results, failed, errors }` with no failures and no errors.

- [ ] **Step 1: The new walkthrough.** Mock Supabase as `walkthrough.js` does (fixtures for families, open and closed leads, top-ups, lessons, the team). Check, at 1280 and 390:
  - `/admin` shows the dashboard; the menu's CRM item (badge = waiting replies) opens `/admin/crm`;
  - the band's three counts and each chip's count match the fixtures, and each filters the rows;
  - search narrows the rows; a row's Call and WhatsApp links carry the family's number;
  - a row opens the panel at `/admin/crm/<id>`, and each tab shows its part (Follow-up's Log call, Payments' Record payment, History's note box);
  - Review Focus 2: open family A, then family B before A's mocked reads answer (delay A's responses); the panel shows only B;
  - Review Focus 3: with 230 closed fixtures, Won and lost shows 100 rows, then 200 after "Show 100 more";
  - Review Focus 4: `/admin/crm/not-a-real-id` shows "This family was not found", and the list still shows its rows;
  - Review Focus 5: a family with no phone has disabled Call and WhatsApp buttons titled "No phone number";
  - a failed open-leads read shows the error and Try again, and no counts;
  - `/admin/families/<id>`, `/admin/leads` and `/admin/more` land on the right screen;
  - at 390 px: cards instead of the table, no sideways scrolling, and the panel fills the screen.

- [ ] **Step 2: Move the old walkthroughs** to the new addresses: in `walkthrough.js` the Today checks read the list and the menu's Lessons badge, and the family-page steps run in the panel's tabs. In the two December walkthroughs the desk is reached through the admin menu's "December desk", and December seats are added from the panel's History tab. Run each at 1280 and 390. Expected: every check ok, no errors.

- [ ] **Step 3: Whole repo.**

```bash
npm run test:crm 2>&1 | tail -4
npm run test:edge 2>&1 | tail -4
npx tsc -p tsconfig.app.json --noEmit; echo "tsc exit $?"
npm run build 2>&1 | tail -3
git status -sb
```

Expected: both suites `# fail 0` (crm = baseline + Task 1's tests; edge = baseline), tsc exit 0, build exit 0, `git status` lists only this plan's files.

- [ ] **Step 4: Commit** (when the owner has said commit): `CRM: walkthroughs for the list and the panel; the older ones follow the new addresses`. Then stop for the owner: push, the pull request (after the December desk's), merge and publish each need their go-ahead. After publishing, check that the live bundle names a chunk holding "Families who got in touch".
