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

test("a phone number that belongs to a team or tutor login is not linked, and nothing is created", async (t) => {
  for (const role of ["admin", "tutor"]) {
    const fn = await setup(t, { profiles: [{ id: LOGIN, phone_number: "+254 712 345 678" }] });
    fn.world.tables.user_roles.push({ user_id: LOGIN, role });
    const response = await enrol(fn);
    assert.equal(response.status, 409, role);
    assert.equal((await response.json()).code, "staff_login", role);
    assert.equal(fn.world.tables.families[0].parent_profile_id, null, role);
    assert.ok(untouched(fn), role);
  }
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
