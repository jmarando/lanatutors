// Run with `npm run test:edge`. The pure date and time-slot rules behind the holiday classes' functions
// (_shared/bootcamp.ts): what the confirmation email says about the program's dates, which days the calendar
// sync fills, and how a class's time slot is read. Last December these were written into the functions as 2025.
import assert from "node:assert/strict";
import { test } from "node:test";
import { loadModule } from "./harness.mjs";

const b = await loadModule("_shared/bootcamp.ts");

test("the program's dates read the way the old email did, from the program's own days", () => {
  assert.equal(b.formatProgramDates("2026-12-07", "2026-12-18"), "December 7-18, 2026");
  assert.equal(b.formatProgramDates("2025-12-08", "2025-12-19"), "December 8-19, 2025");
  assert.equal(b.formatProgramDates("2026-12-07", "2026-12-07"), "December 7, 2026");
  assert.equal(b.formatProgramDates("2026-11-30", "2026-12-11"), "November 30 - December 11, 2026");
  assert.equal(b.formatProgramDates("2026-12-28", "2027-01-08"), "December 28, 2026 - January 8, 2027");
  assert.equal(b.formatProgramDates("2026-12-07T00:00:00+00:00", "2026-12-18"), "December 7-18, 2026");
});

test("a program with no usable dates gives no text, so the email can leave the line out", () => {
  assert.equal(b.formatProgramDates(undefined, "2026-12-18"), "");
  assert.equal(b.formatProgramDates("not a date", "2026-12-18"), "");
  assert.equal(b.formatProgramDates("2026-12-18", "2026-12-07"), "", "an end before the start is not a program");
});

test("days of the month are said as ordinals", () => {
  const said = [1, 2, 3, 4, 7, 11, 12, 13, 21, 22, 23, 30].map(b.ordinalDay);
  assert.deepEqual(said, ["1st", "2nd", "3rd", "4th", "7th", "11th", "12th", "13th", "21st", "22nd", "23rd", "30th"]);
});

test("the first day is said as a month and an ordinal, or not at all", () => {
  assert.equal(b.formatLongDay("2026-12-07"), "December 7th");
  assert.equal(b.formatLongDay("2025-12-08"), "December 8th");
  assert.equal(b.formatLongDay("2026-11-30T00:00:00+00:00"), "November 30th");
  assert.equal(b.formatLongDay("2026-01-01"), "January 1st");
  assert.equal(b.formatLongDay(undefined), "");
  assert.equal(b.formatLongDay("soon"), "");
});

test("the days to fill are the Monday to Friday days from the first to the last", () => {
  assert.deepEqual(b.weekdayDates("2026-12-07", "2026-12-18"), [
    "2026-12-07", "2026-12-08", "2026-12-09", "2026-12-10", "2026-12-11",
    "2026-12-14", "2026-12-15", "2026-12-16", "2026-12-17", "2026-12-18",
  ]);
  assert.deepEqual(b.weekdayDates("2026-12-05", "2026-12-09"), ["2026-12-07", "2026-12-08", "2026-12-09"], "a Saturday start skips the weekend");
  assert.deepEqual(b.weekdayDates("2026-12-12", "2026-12-13"), [], "a weekend alone has no class days");
  assert.deepEqual(b.weekdayDates("2025-12-08", "2025-12-19").length, 10, "last December's ten days");
  assert.deepEqual(b.weekdayDates("2026-12-30", "2027-01-04"), ["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-04"], "across a year end");
  assert.deepEqual(b.weekdayDates("2026-12-18", "2026-12-07"), [], "backwards is empty");
});

test("a time slot reads the same in both label styles the platform has used", () => {
  const read = (label) => b.parseTimeSlot(label);
  // The style the calendar sync always expected, and the style last December's classes were stored in.
  assert.deepEqual(read("8:00 AM - 9:15 AM"), { start: "08:00", end: "09:15" });
  assert.deepEqual(read("8:00 - 9:15 AM"), { start: "08:00", end: "09:15" });
  assert.deepEqual(read("9:30 AM - 10:45 AM"), { start: "09:30", end: "10:45" });
  assert.deepEqual(read("9:30 - 10:45 AM"), { start: "09:30", end: "10:45" });
  assert.deepEqual(read("11:00 AM - 12:15 PM"), { start: "11:00", end: "12:15" });
  assert.deepEqual(read("1:00 PM - 2:15 PM"), { start: "13:00", end: "14:15" });
  assert.deepEqual(read("1:00 - 2:15 PM"), { start: "13:00", end: "14:15" });
  assert.deepEqual(read("2:30 - 3:45 PM"), { start: "14:30", end: "15:45" });
  assert.deepEqual(read("4:00 - 5:15 PM"), { start: "16:00", end: "17:15" });
});

test("a time slot that crosses noon is read as it was meant", () => {
  assert.deepEqual(b.parseTimeSlot("11:00 - 12:15 PM"), { start: "11:00", end: "12:15" });
  assert.deepEqual(b.parseTimeSlot("12:00 PM - 1:15 PM"), { start: "12:00", end: "13:15" });
  assert.deepEqual(b.parseTimeSlot("12:00 - 1:15 PM"), { start: "12:00", end: "13:15" });
  assert.deepEqual(b.parseTimeSlot("12:00 AM - 1:15 AM"), { start: "00:00", end: "01:15" });
});

test("dashes, spaces and case do not matter, and anything that is not a time slot is refused", () => {
  assert.deepEqual(b.parseTimeSlot("8:00 am – 9:15 am"), { start: "08:00", end: "09:15" });
  assert.deepEqual(b.parseTimeSlot("  8:00 AM to 9:15 AM "), { start: "08:00", end: "09:15" });
  assert.deepEqual(b.parseTimeSlot("8:00AM-9:15AM"), { start: "08:00", end: "09:15" });
  for (const bad of ["", "after lunch", "8:00", "8:00 - 9:15", "25:00 - 26:15 PM", "9:15 AM - 8:00 AM", undefined, null]) {
    assert.equal(b.parseTimeSlot(bad), null, `${JSON.stringify(bad)} is not a time slot`);
  }
});

test("a student's day is from the first class's start to the last class's end", () => {
  assert.equal(b.dailyWindow(["8:00 AM - 9:15 AM", "11:00 AM - 12:15 PM"]), "8:00 AM - 12:15 PM");
  assert.equal(b.dailyWindow(["9:30 - 10:45 AM"]), "9:30 AM - 10:45 AM");
  assert.equal(b.dailyWindow(["1:00 - 2:15 PM", "8:00 - 9:15 AM"]), "8:00 AM - 2:15 PM", "the order given does not matter");
  assert.equal(b.dailyWindow(["8:00 AM - 9:15 AM", "after lunch"]), "8:00 AM - 9:15 AM", "a slot that cannot be read is ignored");
  assert.equal(b.dailyWindow(["after lunch"]), null);
  assert.equal(b.dailyWindow([]), null);
  assert.equal(b.dailyWindow(undefined), null);
});

test("a calendar event id is the same every time for one class on one day, and Google accepts it", () => {
  const id = b.calendarEventId("0f8fad5b-d9cb-469f-a165-70867728950e", "2026-12-07");

  assert.equal(id, b.calendarEventId("0f8fad5b-d9cb-469f-a165-70867728950e", "2026-12-07"));
  assert.notEqual(id, b.calendarEventId("0f8fad5b-d9cb-469f-a165-70867728950e", "2026-12-08"));
  assert.notEqual(id, b.calendarEventId("1f8fad5b-d9cb-469f-a165-70867728950e", "2026-12-07"));
  // Google's rule for an event id: letters a to v and digits only, 5 to 1024 characters.
  assert.match(id, /^[a-v0-9]{5,1024}$/);
});
