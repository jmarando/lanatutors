import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bandCounts,
  familyName,
  matchesFilter,
  newestFirst,
  nextStepPill,
  searchLead,
  type ListContext,
  type ListFilter,
} from "../../src/components/admin/crm/crmListRules";
import type { Lead, LeadWithFamily } from "../../src/components/admin/crm/crmTypes";

// The CRM list's rules: which pill a row gets, what each quick filter keeps, and the band's counts. All of it reads the
// Nairobi calendar: 2026-11-16T10:00:00Z is 1:00 pm in Nairobi.

const lead = (over: Partial<Lead> = {}): Lead => ({
  id: "lead-1",
  family_id: "fam-1",
  channel: "whatsapp",
  source_table: null,
  source_id: null,
  stage: "contacted",
  owner_id: null,
  next_step: null,
  next_step_at: null,
  next_step_owner_id: null,
  needs_reply: false,
  student_name: null,
  grade_level: null,
  curriculum: null,
  subjects: [],
  mode: null,
  budget: null,
  urgency: null,
  assessment_at: null,
  assessment_outcome: null,
  recommended_tutor_id: null,
  quoted_rate_kes: null,
  quoted_package: null,
  lost_reason: null,
  won_at: null,
  lost_at: null,
  created_at: "2026-11-10T07:00:00Z",
  updated_at: "2026-11-10T07:00:00Z",
  last_activity_at: "2026-11-10T07:00:00Z",
  ...over,
});

const ctx: ListContext = {
  today: "2026-11-16",
  now: "2026-11-16T10:00:00Z",
  me: "me",
  topUps: new Map([
    ["fam-topup", 1],
    ["fam-empty", 0],
  ]),
};

describe("nextStepPill", () => {
  it("puts a waiting WhatsApp reply first", () =>
    assert.deepEqual(
      nextStepPill(lead({ needs_reply: true, next_step: "Call", next_step_at: "2026-11-14T07:00:00Z" }), ctx),
      { text: "Reply on WhatsApp", tone: "red" },
    ));
  it("asks for the call to be logged once a booked call has passed, even earlier today", () => {
    assert.deepEqual(nextStepPill(lead({ stage: "call_booked", assessment_at: "2026-11-15T07:00:00Z" }), ctx), {
      text: "Log the call",
      tone: "red",
    });
    assert.deepEqual(nextStepPill(lead({ stage: "call_booked", assessment_at: "2026-11-16T05:00:00Z" }), ctx), {
      text: "Log the call",
      tone: "red",
    });
  });
  it("names today's call that is still ahead, in Nairobi time", () =>
    assert.deepEqual(nextStepPill(lead({ stage: "call_booked", assessment_at: "2026-11-16T13:00:00Z" }), ctx), {
      text: "Assessment call today, 4:00 pm",
      tone: "neutral",
    }));
  it("says how late a next step is, or that it is due today, or when it is due", () => {
    const step = (at: string | null) => nextStepPill(lead({ next_step: "Send the package", next_step_at: at }), ctx);
    assert.deepEqual(step("2026-11-15T09:00:00Z"), { text: "Send the package · 1 day late", tone: "red" });
    assert.deepEqual(step("2026-11-13T09:00:00Z"), { text: "Send the package · 3 days late", tone: "red" });
    assert.deepEqual(step("2026-11-16T15:00:00Z"), { text: "Send the package · today", tone: "amber" });
    assert.deepEqual(step("2026-11-18T07:00:00Z"), { text: "Send the package · Wed 18 Nov", tone: "neutral" });
    assert.deepEqual(step(null), { text: "Send the package", tone: "neutral" });
  });
  it("asks for a first call on a new lead, a top-up on a won family down to its last session, and a next step otherwise", () => {
    assert.deepEqual(nextStepPill(lead({ stage: "new" }), ctx), { text: "Needs first call", tone: "neutral" });
    assert.deepEqual(nextStepPill(lead({ stage: "won", family_id: "fam-topup" }), ctx), {
      text: "Top-up: 1 session left",
      tone: "amber",
    });
    assert.deepEqual(nextStepPill(lead({ stage: "won", family_id: "fam-empty" }), ctx), {
      text: "Top-up: no sessions left",
      tone: "amber",
    });
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
    assert.equal(is({ stage: "won", won_at: "2026-10-31T22:00:00Z" }, "wonMonth"), true); // 1 Nov, 1 am in Nairobi
    assert.equal(is({ stage: "won", won_at: "2026-10-31T20:00:00Z" }, "wonMonth"), false); // 31 Oct, 11 pm in Nairobi
  });
  it("keeps closed leads, new ones, those in progress and those due a top-up", () => {
    assert.equal(is({ stage: "lost" }, "closed"), true);
    assert.equal(is({ stage: "new" }, "new"), true);
    assert.equal(is({ stage: "call_done" }, "progress"), true);
    assert.equal(is({ stage: "new" }, "progress"), false);
    assert.equal(is({ stage: "won", family_id: "fam-topup" }, "topup"), true);
    assert.equal(is({ stage: "won", family_id: "fam-other" }, "topup"), false);
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
    assert.deepEqual(bandCounts(open, closed, ctx), {
      newCount: 2,
      newThisWeek: 1,
      inProgress: 2,
      dueToday: 1,
      wonThisMonth: 1,
      wonLastMonth: 1,
    });
  });
});

describe("searching, naming and order", () => {
  const withFamily = (families: LeadWithFamily["families"], over: Partial<Lead> = {}) =>
    ({ ...lead(over), families }) as LeadWithFamily;
  it("matches the parent, phone, child, subject and next step, ignoring case", () => {
    const l = withFamily(
      { id: "f", parent_name: "Grace Achieng", phone: "254712345678", email: null, status: "prospect" },
      { student_name: "Zuri", subjects: ["English"], next_step: "Send the package" },
    );
    for (const q of ["achieng", "2547123", "ZURI", "english", "package", ""]) assert.equal(searchLead(l, q), true, q);
    assert.equal(searchLead(l, "maths"), false);
  });
  it("names a family by its parent, else its phone, else the child", () => {
    assert.equal(familyName(withFamily({ id: "f", parent_name: "Grace", phone: null, email: null, status: "prospect" })), "Grace");
    assert.equal(
      familyName(withFamily({ id: "f", parent_name: null, phone: "254712345678", email: null, status: "prospect" })),
      "+254 712 345 678",
    );
    assert.equal(familyName(withFamily(null, { student_name: "Zuri" })), "Zuri's family");
    assert.equal(familyName(withFamily(null)), "Unknown family");
  });
  it("puts the newest lead first", () => {
    const older = lead({ id: "a", created_at: "2026-11-01T07:00:00Z" });
    const newer = lead({ id: "b", created_at: "2026-11-15T07:00:00Z" });
    assert.deepEqual([older, newer].sort(newestFirst).map((l) => l.id), ["b", "a"]);
  });
});
