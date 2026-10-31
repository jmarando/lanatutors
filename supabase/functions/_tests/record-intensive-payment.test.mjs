// Run with `npm run test:edge`. Recording a holiday-class payment that a family made to the paybill and not through
// Pesapal (record-intensive-payment): who may do it, what it writes, and the ways it refuses. A mistake here gives a
// child a place in a class that was not paid for, or loses a payment, so each rule has its own test.
import assert from "node:assert/strict";
import { test } from "node:test";
import { loadFunction } from "./harness.mjs";

const ENROLLMENT_ID = "e1000000-0000-4000-8000-000000000001";
const OTHER_ENROLLMENT_ID = "e2000000-0000-4000-8000-000000000002";
const STUDENT = "5a000000-0000-4000-8000-000000000001";
const EMAIL_FUNCTION = "send-intensive-enrollment-confirmation";
const asAdmin = { authorization: "Bearer admin-token" };

// One enrolment of KES 4,000 (10 lessons in one subject at last year's KES 400 a lesson), by default not yet paid.
async function setup(t, { status = "pending", total = 4000, payments = [], email = [{ status: 200, body: { success: true } }] } = {}) {
  const fn = await loadFunction("record-intensive-payment", { functions: { [EMAIL_FUNCTION]: email } });
  t.after(() => fn.dispose());
  const { tables, sessions } = fn.world;
  sessions["admin-token"] = { id: "admin-1" };
  sessions["parent-token"] = { id: "parent-1" };
  tables.user_roles = [{ user_id: "admin-1", role: "admin" }];
  tables.intensive_enrollments = [{ id: ENROLLMENT_ID, student_id: STUDENT, total_amount: total, payment_status: status }];
  tables.profiles.push({ id: STUDENT, full_name: "Wanjiru", phone_number: "+254700000001" });
  tables.payments = payments;
  return fn;
}

const pay = (fn, body, headers = asAdmin) => fn.deliver({ enrollmentId: ENROLLMENT_ID, ...body }, headers);
const status = (fn) => fn.world.tables.intensive_enrollments.find((e) => e.id === ENROLLMENT_ID).payment_status;
const emailCalls = (fn) => fn.world.functionCalls.filter((call) => call.name === EMAIL_FUNCTION);
const earlier = (amount, extra = {}) => ({
  id: crypto.randomUUID(), user_id: STUDENT, payment_type: "intensive_enrollment", reference_id: ENROLLMENT_ID,
  amount, currency: "KES", status: "completed", pesapal_payment_method: "MPESA", pesapal_confirmation_code: "PESAPAL1", ...extra,
});

test("only a signed-in admin may record a payment; nobody else changes anything", async (t) => {
  const fn = await setup(t);
  const attempts = [
    ["no sign-in at all", {}],
    ["the public anon key, which is a valid token but no user's", { authorization: "Bearer anon-key" }],
    ["a signed-in parent", { authorization: "Bearer parent-token" }],
  ];

  for (const [who, headers] of attempts) {
    const response = await pay(fn, { amount: 4000, reference: "SBK3F9XXXX" }, headers);
    assert.ok([401, 403].includes(response.status), `${who} was let in: ${response.status}`);
  }

  assert.equal(fn.world.tables.payments.length, 0, "no payment was written");
  assert.equal(status(fn), "pending", "the enrolment is untouched");
  assert.equal(emailCalls(fn).length, 0, "no email went out");
});

test("a signed-in parent is refused with 403 and an unknown token with 401", async (t) => {
  const fn = await setup(t);

  assert.equal((await pay(fn, { amount: 4000, reference: "SBK3F9XXXX" }, { authorization: "Bearer parent-token" })).status, 403);
  assert.equal((await pay(fn, { amount: 4000, reference: "SBK3F9XXXX" }, { authorization: "Bearer nobody" })).status, 401);
  assert.equal((await pay(fn, { amount: 4000, reference: "SBK3F9XXXX" }, {})).status, 401);
});

test("a payment in full records the money, marks the enrolment paid and sends the confirmation", async (t) => {
  const fn = await setup(t);

  const response = await pay(fn, { amount: 4000, reference: "sbk3f9xxxx" });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, status: "completed", paid_total: 4000, balance: 0, email_sent: true, already_recorded: false });
  const [row] = fn.world.tables.payments;
  assert.equal(row.user_id, STUDENT);
  assert.equal(row.payment_type, "intensive_enrollment");
  assert.equal(row.reference_id, ENROLLMENT_ID);
  assert.equal(row.amount, 4000);
  assert.equal(row.currency, "KES");
  assert.equal(row.status, "completed");
  assert.equal(row.pesapal_payment_method, "mpesa_paybill");
  assert.equal(row.pesapal_confirmation_code, "SBK3F9XXXX", "the reference is kept in capitals, as M-Pesa writes it");
  assert.equal(row.phone_number, "+254700000001");
  assert.equal(status(fn), "completed");
  assert.equal(emailCalls(fn).length, 1);
  assert.deepEqual(emailCalls(fn)[0].body, { enrollmentId: ENROLLMENT_ID });
  assert.equal(emailCalls(fn)[0].headers.Authorization, "Bearer service-role", "sent server to server");
});

test("a deposit leaves the enrolment as deposit paid with no email, and the balance then completes it", async (t) => {
  const fn = await setup(t);

  const deposit = await (await pay(fn, { amount: 1200, reference: "DEP1A2B3C4" })).json();

  assert.equal(deposit.status, "deposit_paid");
  assert.equal(deposit.paid_total, 1200);
  assert.equal(deposit.balance, 2800);
  assert.equal(deposit.email_sent, false);
  assert.equal(status(fn), "deposit_paid");
  assert.equal(emailCalls(fn).length, 0);

  const balance = await (await pay(fn, { amount: 2800, reference: "BAL5D6E7F8" })).json();

  assert.equal(balance.status, "completed");
  assert.equal(balance.paid_total, 4000);
  assert.equal(balance.balance, 0);
  assert.equal(balance.email_sent, true);
  assert.equal(status(fn), "completed");
  assert.equal(fn.world.tables.payments.length, 2);
  assert.equal(emailCalls(fn).length, 1, "the confirmation goes out once, when the last of it is paid");
});

test("money already paid through Pesapal counts towards the balance", async (t) => {
  const fn = await setup(t, { status: "deposit_paid", payments: [earlier(1200)] });

  const response = await pay(fn, { amount: 2800, reference: "BAL5D6E7F8" });

  assert.equal((await response.json()).status, "completed");
  assert.equal(status(fn), "completed");
});

test("payments that did not go through do not count towards the balance", async (t) => {
  const fn = await setup(t, { payments: [earlier(4000, { status: "failed" }), earlier(4000, { status: "pending" })] });

  const response = await pay(fn, { amount: 4000, reference: "SBK3F9XXXX" });

  assert.equal(response.status, 200);
  assert.equal(status(fn), "completed");
});

test("more than the balance is refused and nothing is written", async (t) => {
  const fn = await setup(t, { status: "deposit_paid", payments: [earlier(1200)] });

  const response = await pay(fn, { amount: 3000, reference: "SBK3F9XXXX" });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /balance of KES 2800/);
  assert.equal(fn.world.tables.payments.length, 1);
  assert.equal(status(fn), "deposit_paid");
  assert.equal(emailCalls(fn).length, 0);
});

test("an enrolment that is already paid in full is refused", async (t) => {
  const fn = await setup(t, { status: "completed" });

  const response = await pay(fn, { amount: 100, reference: "SBK3F9XXXX" });

  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /already paid/i);
  assert.equal(fn.world.tables.payments.length, 0);
});

test("one M-Pesa reference cannot pay for two enrolments", async (t) => {
  const taken = earlier(4000, { reference_id: OTHER_ENROLLMENT_ID, pesapal_payment_method: "mpesa_paybill", pesapal_confirmation_code: "SBK3F9XXXX" });
  const fn = await setup(t, { payments: [taken] });

  for (const reference of ["SBK3F9XXXX", "sbk3f9xxxx"]) {
    const response = await pay(fn, { amount: 4000, reference });
    assert.equal(response.status, 409, reference);
    assert.match((await response.json()).error, /already recorded/i);
  }

  assert.equal(fn.world.tables.payments.length, 1, "still only the first payment");
  assert.equal(status(fn), "pending");
});

test("sending the same payment twice records it once", async (t) => {
  const fn = await setup(t);

  await pay(fn, { amount: 1200, reference: "DEP1A2B3C4" });
  const again = await pay(fn, { amount: 1200, reference: "DEP1A2B3C4" });

  assert.equal(again.status, 200);
  assert.equal((await again.json()).already_recorded, true);
  assert.equal(fn.world.tables.payments.length, 1);
  assert.equal(status(fn), "deposit_paid");
});

test("if the payment was written but the enrolment was not updated, sending it again finishes the job", async (t) => {
  const written = earlier(4000, { pesapal_payment_method: "mpesa_paybill", pesapal_confirmation_code: "SBK3F9XXXX" });
  const fn = await setup(t, { payments: [written] }); // the enrolment still says pending

  const response = await pay(fn, { amount: 4000, reference: "SBK3F9XXXX" });
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.already_recorded, true);
  assert.equal(result.status, "completed");
  assert.equal(status(fn), "completed");
  assert.equal(fn.world.tables.payments.length, 1, "no second payment");
  assert.equal(emailCalls(fn).length, 1, "the confirmation the family never got goes out now");
});

test("bad input is refused before anything is written", async (t) => {
  const fn = await setup(t);
  const bad = [
    [{ amount: 0, reference: "SBK3F9XXXX" }, "no amount"],
    [{ amount: -50, reference: "SBK3F9XXXX" }, "a negative amount"],
    [{ amount: "lots", reference: "SBK3F9XXXX" }, "an amount that is not a number"],
    [{ reference: "SBK3F9XXXX" }, "a missing amount"],
    [{ amount: 4000, reference: "" }, "a blank reference"],
    [{ amount: 4000, reference: "AB" }, "a reference too short to be real"],
    [{ amount: 4000, reference: "<script>alert(1)</script>" }, "a reference with markup"],
    [{ amount: 4000 }, "a missing reference"],
  ];

  for (const [body, what] of bad) {
    const response = await pay(fn, body);
    assert.equal(response.status, 400, what);
  }
  const noEnrolment = await fn.deliver({ amount: 4000, reference: "SBK3F9XXXX" }, asAdmin);
  assert.equal(noEnrolment.status, 400, "no enrolment named");
  const unknown = await fn.deliver({ enrollmentId: "99999999-0000-4000-8000-000000000000", amount: 4000, reference: "SBK3F9XXXX" }, asAdmin);
  assert.equal(unknown.status, 404, "an enrolment that does not exist");

  assert.equal(fn.world.tables.payments.length, 0);
  assert.equal(status(fn), "pending");
});

test("a confirmation email that fails does not undo the payment", async (t) => {
  const fn = await setup(t, { email: [{ status: 500, body: { error: "Resend is down" } }] });

  const response = await pay(fn, { amount: 4000, reference: "SBK3F9XXXX" });
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.status, "completed");
  assert.equal(result.email_sent, false);
  assert.equal(status(fn), "completed");
  assert.equal(fn.world.tables.payments.length, 1);
});

test("the admin can choose not to send the confirmation", async (t) => {
  const fn = await setup(t);

  const result = await (await pay(fn, { amount: 4000, reference: "SBK3F9XXXX", sendEmail: false })).json();

  assert.equal(result.status, "completed");
  assert.equal(result.email_sent, false);
  assert.equal(emailCalls(fn).length, 0);
});

test("the day the money arrived is kept on the payment", async (t) => {
  const fn = await setup(t);

  await pay(fn, { amount: 4000, reference: "SBK3F9XXXX", receivedOn: "2026-12-01" });

  assert.match(fn.world.tables.payments[0].created_at, /^2026-12-01T/);
});

test("another edge function can call it with the service-role key", async (t) => {
  const fn = await setup(t);

  const response = await pay(fn, { amount: 4000, reference: "SBK3F9XXXX" }, { authorization: "Bearer service-role" });

  assert.equal(response.status, 200);
  assert.equal(status(fn), "completed");
});
