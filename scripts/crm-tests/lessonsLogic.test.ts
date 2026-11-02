import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countsAsSession,
  computeProgress,
  formatKes,
  isTopUpDue,
  needsConfirming,
  parseSessions,
  weekRange,
  yesterdayRange,
  type LessonLike,
} from "../../src/components/admin/crm/lessonsLogic";

// Nairobi is UTC+3 all year. 2026-11-04 is a Wednesday.
const WED_10AM = new Date("2026-11-04T07:00:00Z");

describe("countsAsSession", () => {
  it("counts a delivered lesson, a student no-show and a late cancellation", () => {
    assert.equal(countsAsSession("delivered"), true);
    assert.equal(countsAsSession("student_absent"), true);
    assert.equal(countsAsSession("late_cancellation"), true);
  });
  it("does not count a tutor no-show or a cancelled lesson", () => {
    assert.equal(countsAsSession("tutor_absent"), false);
    assert.equal(countsAsSession("cancelled"), false);
  });
});

describe("weekRange", () => {
  it("runs Monday 00:00 to the next Monday 00:00 in Nairobi time", () => {
    const week = weekRange(WED_10AM);
    assert.equal(week.start.toISOString(), "2026-11-01T21:00:00.000Z"); // Mon 2 Nov 00:00 Nairobi
    assert.equal(week.end.toISOString(), "2026-11-08T21:00:00.000Z"); // Mon 9 Nov 00:00 Nairobi
    assert.equal(week.days.length, 7);
    assert.equal(week.days[0], "2026-11-02");
    assert.equal(week.days[6], "2026-11-08");
  });
  it("keeps Sunday night in the same week and starts a new one at Monday midnight", () => {
    assert.equal(weekRange(new Date("2026-11-08T20:30:00Z")).days[0], "2026-11-02"); // Sun 23:30 Nairobi
    assert.equal(weekRange(new Date("2026-11-08T21:10:00Z")).days[0], "2026-11-09"); // Mon 00:10 Nairobi
  });
  it("moves by whole weeks", () => {
    assert.equal(weekRange(WED_10AM, 1).days[0], "2026-11-09");
    assert.equal(weekRange(WED_10AM, -1).days[0], "2026-10-26");
  });
});

describe("yesterdayRange", () => {
  it("is the whole of yesterday in Nairobi", () => {
    const y = yesterdayRange(WED_10AM);
    assert.equal(y.start.toISOString(), "2026-11-02T21:00:00.000Z"); // Tue 3 Nov 00:00 Nairobi
    assert.equal(y.end.toISOString(), "2026-11-03T21:00:00.000Z"); // Wed 4 Nov 00:00 Nairobi
    assert.equal(y.day, "2026-11-03");
  });
  it("uses the Nairobi date just after local midnight", () => {
    assert.equal(yesterdayRange(new Date("2026-11-03T21:30:00Z")).day, "2026-11-03"); // Wed 00:30 Nairobi
  });
});

describe("isTopUpDue", () => {
  const base = { sessions_bought: 8, sessions_left: 1, status: "active" as const };
  it("is due at the last session, at none and when over-used", () => {
    assert.equal(isTopUpDue(base), true);
    assert.equal(isTopUpDue({ ...base, sessions_left: 0 }), true);
    assert.equal(isTopUpDue({ ...base, sessions_left: -1 }), true);
  });
  it("is not due with sessions to spare", () => {
    assert.equal(isTopUpDue({ ...base, sessions_left: 2 }), false);
  });
  it("ignores enrolments that never bought a pack, and paused or ended ones", () => {
    assert.equal(isTopUpDue({ ...base, sessions_bought: 0, sessions_left: 0 }), false);
    assert.equal(isTopUpDue({ ...base, status: "paused" }), false);
    assert.equal(isTopUpDue({ ...base, status: "ended" }), false);
  });
});

function lesson(over: Partial<LessonLike> & { day: string }): LessonLike {
  const { day, ...rest } = over;
  return {
    starts_at: `${day}T07:00:00Z`,
    ends_at: `${day}T08:00:00Z`,
    booking_status: "confirmed",
    attendance: null,
    engagement: null,
    covered: null,
    homework: null,
    tutor_name: "Tutor One",
    tracked: true,
    report_id: null,
    ...rest,
  };
}

describe("needsConfirming", () => {
  const now = new Date("2026-11-04T12:00:00Z");
  it("lists a past, tracked lesson with no report", () => {
    assert.equal(needsConfirming(lesson({ day: "2026-11-03" }), now), true);
  });
  it("skips lessons with a report, cancelled bookings, history and the future", () => {
    assert.equal(needsConfirming(lesson({ day: "2026-11-03", report_id: "r1", attendance: "delivered" }), now), false);
    assert.equal(needsConfirming(lesson({ day: "2026-11-03", booking_status: "cancelled" }), now), false);
    assert.equal(needsConfirming(lesson({ day: "2026-11-03", tracked: false }), now), false);
    assert.equal(needsConfirming(lesson({ day: "2026-11-05" }), now), false);
  });
  it("does not list a lesson that is still in progress", () => {
    assert.equal(needsConfirming({ ...lesson({ day: "2026-11-04" }), starts_at: "2026-11-04T11:30:00Z", ends_at: "2026-11-04T12:30:00Z" }, now), false);
  });
});

describe("computeProgress", () => {
  const now = new Date("2026-11-20T09:00:00Z");

  it("has nothing to say about a student with no lessons", () => {
    const p = computeProgress([], now, { active: true });
    assert.equal(p.attendanceRate, null);
    assert.equal(p.atRisk, false);
    assert.deepEqual(p.reasons, []);
    assert.equal(p.engagementTrend, null);
    assert.equal(p.lastLessonAt, null);
  });

  it("attendance counts delivered against delivered, student no-shows and late cancellations", () => {
    const p = computeProgress(
      [
        lesson({ day: "2026-11-02", attendance: "delivered" }),
        lesson({ day: "2026-11-04", attendance: "delivered" }),
        lesson({ day: "2026-11-06", attendance: "delivered" }),
        lesson({ day: "2026-11-09", attendance: "student_absent" }),
        lesson({ day: "2026-11-11", attendance: "tutor_absent" }),
        lesson({ day: "2026-11-13", attendance: "cancelled" }),
      ],
      now,
      { active: true },
    );
    assert.equal(p.attendanceRate, 75);
    assert.equal(p.countedLessons, 4);
  });

  it("counts this month's delivered lessons against the lessons scheduled, ignoring cancelled bookings", () => {
    const p = computeProgress(
      [
        lesson({ day: "2026-10-30", attendance: "delivered" }), // last month
        lesson({ day: "2026-11-03", attendance: "delivered" }),
        lesson({ day: "2026-11-10", attendance: "delivered" }),
        lesson({ day: "2026-11-17", attendance: "student_absent" }),
        lesson({ day: "2026-11-18", booking_status: "cancelled" }),
        lesson({ day: "2026-11-24" }), // still to come
      ],
      now,
      { active: true },
    );
    assert.equal(p.deliveredThisMonth, 2);
    assert.equal(p.scheduledThisMonth, 4);
  });

  it("keeps the last three notes, newest first, and skips lessons with none", () => {
    const p = computeProgress(
      [
        lesson({ day: "2026-11-02", attendance: "delivered", covered: "Fractions" }),
        lesson({ day: "2026-11-04", attendance: "delivered", covered: "Decimals", homework: "Page 4" }),
        lesson({ day: "2026-11-06", attendance: "delivered" }),
        lesson({ day: "2026-11-09", attendance: "delivered", homework: "Worksheet" }),
        lesson({ day: "2026-11-11", attendance: "delivered", covered: "Percentages" }),
      ],
      now,
      { active: true },
    );
    assert.deepEqual(
      p.feedback.map((f) => f.covered ?? f.homework),
      ["Percentages", "Worksheet", "Decimals"],
    );
  });

  it("reads the engagement trend from the latest three lessons against the three before", () => {
    const series = (values: number[]) =>
      values.map((engagement, i) =>
        lesson({ day: `2026-11-${String(i + 1).padStart(2, "0")}`, attendance: "delivered", engagement }),
      );
    // oldest to newest
    assert.equal(computeProgress(series([2, 2, 3, 4, 4, 5]), now, { active: true }).engagementTrend, "up");
    assert.equal(computeProgress(series([5, 4, 4, 2, 2, 3]), now, { active: true }).engagementTrend, "down");
    assert.equal(computeProgress(series([3, 3, 3, 3, 3, 3]), now, { active: true }).engagementTrend, "steady");
    assert.equal(computeProgress(series([4, 4, 5]), now, { active: true }).engagementTrend, null);
  });

  it("flags two absences in a row, but not when a delivered lesson sits between them", () => {
    const missed = computeProgress(
      [
        lesson({ day: "2026-11-09", attendance: "delivered" }),
        lesson({ day: "2026-11-12", attendance: "student_absent" }),
        lesson({ day: "2026-11-16", attendance: "late_cancellation" }),
      ],
      now,
      { active: true },
    );
    assert.equal(missed.atRisk, true);
    assert.match(missed.reasons.join(" "), /last two lessons/i);

    const mixed = computeProgress(
      [
        lesson({ day: "2026-11-09", attendance: "student_absent" }),
        lesson({ day: "2026-11-12", attendance: "delivered" }),
        lesson({ day: "2026-11-16", attendance: "student_absent" }),
      ],
      now,
      { active: true },
    );
    assert.equal(mixed.atRisk, false);
  });

  it("does not count a tutor no-show between two absences as a break", () => {
    const p = computeProgress(
      [
        lesson({ day: "2026-11-12", attendance: "student_absent" }),
        lesson({ day: "2026-11-14", attendance: "tutor_absent" }),
        lesson({ day: "2026-11-16", attendance: "student_absent" }),
      ],
      now,
      { active: true },
    );
    assert.equal(p.atRisk, true);
  });

  it("flags falling engagement", () => {
    const p = computeProgress(
      [5, 5, 4, 2, 2, 3].map((engagement, i) =>
        lesson({ day: `2026-11-${String(i + 8).padStart(2, "0")}`, attendance: "delivered", engagement }),
      ),
      now,
      { active: true },
    );
    assert.equal(p.atRisk, true);
    assert.match(p.reasons.join(" "), /engagement/i);
  });

  it("flags no lesson in 14 days, unless one is booked or the enrolment is not active", () => {
    const quiet = [lesson({ day: "2026-11-02", attendance: "delivered" })]; // 18 days ago
    assert.equal(computeProgress(quiet, now, { active: true }).atRisk, true);
    assert.match(computeProgress(quiet, now, { active: true }).reasons.join(" "), /14 days/);
    assert.equal(computeProgress([...quiet, lesson({ day: "2026-11-23" })], now, { active: true }).atRisk, false);
    assert.equal(computeProgress(quiet, now, { active: false }).atRisk, false);
    const recent = [lesson({ day: "2026-11-12", attendance: "delivered" })]; // 8 days ago
    assert.equal(computeProgress(recent, now, { active: true }).atRisk, false);
  });

  it("does not flag a student who has not had a first lesson yet", () => {
    assert.equal(computeProgress([lesson({ day: "2026-11-23" })], now, { active: true }).atRisk, false);
  });
});

describe("formatKes", () => {
  it("writes whole shillings with thousands separators", () => {
    assert.equal(formatKes(24000), "KES 24,000");
    assert.equal(formatKes(0), "KES 0");
  });
  it("keeps cents only when there are some", () => {
    assert.equal(formatKes(2333.33), "KES 2,333.33");
    assert.equal(formatKes(2100.5), "KES 2,100.50");
  });
  it("puts the sign in front for money the family owes", () => {
    assert.equal(formatKes(-1300), "-KES 1,300");
  });
  it("copes with missing values", () => {
    assert.equal(formatKes(null), "—");
    assert.equal(formatKes(undefined), "—");
  });
});

describe("parseSessions", () => {
  it("reads whole sessions and half sessions", () => {
    assert.equal(parseSessions("8"), 8);
    assert.equal(parseSessions("8.5"), 8.5);
    assert.equal(parseSessions(" 0.5 "), 0.5);
    assert.equal(parseSessions(".5"), 0.5);
    assert.equal(parseSessions("9999.99"), 9999.99);
  });
  it("reads a comma as the decimal point", () => {
    assert.equal(parseSessions("3,5"), 3.5);
  });
  it("refuses what is not a positive number the database can hold", () => {
    for (const bad of ["", "   ", "abc", "0", "0.00", "-2", "8.555", "1e3", "8 sessions", "10000", "."]) {
      assert.ok(Number.isNaN(parseSessions(bad)), `"${bad}" should be refused`);
    }
  });
});
