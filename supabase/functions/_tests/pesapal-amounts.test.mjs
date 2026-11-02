// Run with `npm run test:edge`. initiate-pesapal-payment: which amounts a signed-in user may pay for an order. The
// function works the amount out from the order in the database and from the platform's deposit percentage, the rule
// the booking, package and invoice screens use, and never takes the amount in the request on trust. Wrong one way, a
// family paying a real deposit is turned away; wrong the other way, a booking is confirmed for a fraction of its
// price. So each rule has its own test.
import assert from "node:assert/strict";
import { test } from "node:test";
import { loadFunction } from "./harness.mjs";

const STUDENT = "5a000000-0000-4000-8000-000000000001";
const TUTOR = "7a000000-0000-4000-8000-000000000001";
// The tutor whose deposit is 1%; the booking, package and invoice screens have the same id written into them.
const SPECIAL_TUTOR = "4d9426d7-7294-492a-a2e9-4b1642ba1954";
const BOOKING = "b1000000-0000-4000-8000-000000000001";
const PACKAGE = "b2000000-0000-4000-8000-000000000002";
const ENROLMENT = "b3000000-0000-4000-8000-000000000003";
const GROUP_ENROLMENT = "b4000000-0000-4000-8000-000000000004";
const signedIn = { authorization: "Bearer student-token" };

// The orders a family can pay for and what each is worth: the full price, the platform's 70% deposit, 30% and 1% of it.
// `kind` is the paymentType the screens send. Four of the kinds are the same package, and two the same booking.
const ORDERS = [
  { kind: "booking", referenceId: BOOKING, total: 2000, platform: 1400, thirty: 600, one: 20, withTutor: true },
  { kind: "tutor_booking_deposit", referenceId: BOOKING, total: 2000, platform: 1400, thirty: 600, one: 20, withTutor: true },
  { kind: "package_purchase", referenceId: PACKAGE, total: 10000, platform: 7000, thirty: 3000, one: 100, withTutor: true },
  { kind: "package", referenceId: PACKAGE, total: 10000, platform: 7000, thirty: 3000, one: 100, withTutor: true },
  { kind: "multi_package", referenceId: PACKAGE, total: 10000, platform: 7000, thirty: 3000, one: 100, withTutor: true },
  { kind: "intensive_enrollment", referenceId: ENROLMENT, total: 5000, platform: 3500, thirty: 1500, one: 50, withTutor: false },
];
const TUTOR_ORDERS = ORDERS.filter((order) => order.withTutor);

// Production as it is: the platform asks a 70% deposit (platform_settings, set 2026-08-22). The student has a booking of
// KES 2,000 with a balance of 600, a package of 10,000, a holiday enrolment of 5,000 and a group class seat of 1,400.
// `deposit: null` is a platform with no setting saved; `tutor` is who the booking and the package are with.
async function setup(t, { deposit = 70, tutor = TUTOR, balanceDue = 600, currency = "KES" } = {}) {
  const fn = await loadFunction("initiate-pesapal-payment", { env: { PESAPAL_CONSUMER_KEY: "key", PESAPAL_CONSUMER_SECRET: "secret" } });
  t.after(() => fn.dispose());
  const { tables, sessions } = fn.world;
  sessions["student-token"] = { id: STUDENT, email: "parent@example.com" };
  tables.platform_settings = deposit === null ? [] : [{ id: "global", deposit_percentage: deposit }];
  tables.bookings = [{ id: BOOKING, student_id: STUDENT, tutor_id: tutor, amount: 2000, balance_due: balanceDue, currency }];
  tables.package_purchases = [{ id: PACKAGE, student_id: STUDENT, tutor_id: tutor, total_amount: 10000, currency }];
  tables.intensive_enrollments = [{ id: ENROLMENT, student_id: STUDENT, total_amount: 5000 }];
  tables.group_class_enrollments = [{ id: GROUP_ENROLMENT, student_id: STUDENT, amount_paid: 1400 }];
  return fn;
}

const pay = (fn, body, headers = signedIn) => fn.deliver({ currency: "KES", description: "Test payment", ...body }, headers);
const payFor = (fn, order, amount) => pay(fn, { paymentType: order.kind, referenceId: order.referenceId, amount });
const charged = (fn) => fn.world.pesapalOrders.map((order) => order.amount);
const payments = (fn) => fn.world.tables.payments ?? [];
const forget = (fn) => { fn.world.pesapalOrders.length = 0; fn.world.tables.payments = []; };

// The payment went through at exactly this amount: Pesapal was asked to charge it and the payment record holds it.
async function assertCharged(fn, response, amount, what) {
  const body = await response.json();
  assert.equal(response.status, 200, `${what}: expected the payment to go through, got ${response.status} ${JSON.stringify(body)}`);
  assert.deepEqual(charged(fn), [amount], `${what}: the amount Pesapal was asked for`);
  assert.equal(payments(fn).length, 1, `${what}: payment records`);
  assert.equal(payments(fn)[0].amount, amount, `${what}: the amount on the payment record`);
}

// The payment was turned away before anything was charged or recorded.
async function assertRefused(fn, response, what) {
  const body = await response.json();
  assert.equal(response.status, 400, `${what}: expected a refusal, got ${response.status} ${JSON.stringify(body)}`);
  assert.deepEqual(charged(fn), [], `${what}: Pesapal was asked to charge something`);
  assert.equal(payments(fn).length, 0, `${what}: a payment was recorded`);
}

test("a deposit at the platform's 70% is accepted for every kind of order, and is what Pesapal is asked for", async (t) => {
  for (const order of ORDERS) {
    await t.test(order.kind, async (st) => {
      const fn = await setup(st);
      await assertCharged(fn, await payFor(fn, order, order.platform), order.platform, order.kind);
    });
  }
});

test("the deposit follows the platform's setting, not a percentage written into the function", async (t) => {
  const fn = await setup(t, { deposit: 50 });

  await assertCharged(fn, await pay(fn, { paymentType: "booking", referenceId: BOOKING, amount: 1000 }), 1000, "50% when the platform asks 50%");
  forget(fn);
  await assertRefused(fn, await pay(fn, { paymentType: "booking", referenceId: BOOKING, amount: 1400 }), "70% when the platform asks 50%");
});

test("with no deposit setting saved, the screens' default of 30% applies", async (t) => {
  const fn = await setup(t, { deposit: null });

  await assertCharged(fn, await pay(fn, { paymentType: "booking", referenceId: BOOKING, amount: 600 }), 600, "30% by default");
  forget(fn);
  await assertRefused(fn, await pay(fn, { paymentType: "booking", referenceId: BOOKING, amount: 1400 }), "70% by default");
});

test("a deposit with cents is rounded the way the screens round it", async (t) => {
  const fn = await setup(t);
  fn.world.tables.bookings[0].amount = 1999; // 70% of it is 1399.3, which the screens send as 1399

  await assertCharged(fn, await pay(fn, { paymentType: "booking", referenceId: BOOKING, amount: 1399 }), 1399, "70% of 1,999");
});

test("30% is refused when the platform's deposit is 70%, so a deposit cannot be undercut", async (t) => {
  for (const order of ORDERS) {
    await t.test(order.kind, async (st) => {
      const fn = await setup(st);
      await assertRefused(fn, await payFor(fn, order, order.thirty), order.kind);
    });
  }
});

test("1% is refused for an ordinary tutor's orders", async (t) => {
  for (const order of ORDERS) {
    await t.test(order.kind, async (st) => {
      const fn = await setup(st);
      await assertRefused(fn, await payFor(fn, order, order.one), order.kind);
    });
  }
});

test("the balance still to pay on a booking cannot be paid as its deposit", async (t) => {
  const fn = await setup(t, { balanceDue: 450 }); // an amount that is not also 30% of the booking

  await assertRefused(fn, await pay(fn, { paymentType: "booking", referenceId: BOOKING, amount: 450 }), "booking");
  await assertRefused(fn, await pay(fn, { paymentType: "tutor_booking_deposit", referenceId: BOOKING, amount: 450 }), "tutor_booking_deposit");
});

test("a booking's balance is paid with its own payment type, and only for exactly the balance", async (t) => {
  const fn = await setup(t, { balanceDue: 450 });

  await assertCharged(fn, await pay(fn, { paymentType: "booking_balance", referenceId: BOOKING, amount: 450 }), 450, "the balance");
  for (const [amount, what] of [[1400, "the deposit"], [2000, "the full price"], [20, "1%"]]) {
    forget(fn);
    await assertRefused(fn, await pay(fn, { paymentType: "booking_balance", referenceId: BOOKING, amount }), what);
  }
});

test("the special tutor's orders can be paid at 1%", async (t) => {
  for (const order of TUTOR_ORDERS) {
    await t.test(order.kind, async (st) => {
      const fn = await setup(st, { tutor: SPECIAL_TUTOR });
      await assertCharged(fn, await payFor(fn, order, order.one), order.one, order.kind);
    });
  }
});

test("the special tutor's orders can still be paid in full or at the platform's deposit", async (t) => {
  for (const order of TUTOR_ORDERS) {
    await t.test(order.kind, async (st) => {
      const fn = await setup(st, { tutor: SPECIAL_TUTOR });
      await assertCharged(fn, await payFor(fn, order, order.total), order.total, `${order.kind} in full`);
      forget(fn);
      await assertCharged(fn, await payFor(fn, order, order.platform), order.platform, `${order.kind} at the deposit`);
    });
  }
});

test("the full price of every kind of order is accepted", async (t) => {
  for (const order of ORDERS) {
    await t.test(order.kind, async (st) => {
      const fn = await setup(st);
      await assertCharged(fn, await payFor(fn, order, order.total), order.total, order.kind);
    });
  }
});

test("the amount in the request is never taken on trust", async (t) => {
  const fn = await setup(t);
  const attempts = [
    [1, "KES 1"], [5, "KES 5"], [0, "nothing"], [-5, "a negative amount"], ["lots", "an amount that is not a number"],
    [undefined, "no amount"], [null, "a null amount"], [1997, "3 below the price"], [2003, "3 above the price"], [2500, "more than the price"],
  ];

  for (const [amount, what] of attempts) {
    await assertRefused(fn, await pay(fn, { paymentType: "booking", referenceId: BOOKING, amount }), what);
  }
});

test("an amount within KES 2 of a legitimate one is charged at the legitimate amount, which absorbs rounding", async (t) => {
  const fn = await setup(t);

  await assertCharged(fn, await pay(fn, { paymentType: "booking", referenceId: BOOKING, amount: 1999 }), 2000, "1 below the price");
  forget(fn);
  await assertCharged(fn, await pay(fn, { paymentType: "booking", referenceId: BOOKING, amount: 1402 }), 1400, "2 above the deposit");
});

test("the order's own currency is the one that is charged, and any other is refused", async (t) => {
  const fn = await setup(t, { currency: "USD" });

  await assertRefused(fn, await pay(fn, { paymentType: "booking", referenceId: BOOKING, amount: 2000, currency: "KES" }), "KES for a USD order");
  await assertCharged(fn, await pay(fn, { paymentType: "booking", referenceId: BOOKING, amount: 2000, currency: "usd" }), 2000, "USD for a USD order");
  assert.equal(fn.world.pesapalOrders[0].currency, "USD");
});

test("an order that does not exist, and a payment type that is not known, are refused", async (t) => {
  const fn = await setup(t);
  const attempts = [
    [{ paymentType: "booking", referenceId: "99999999-0000-4000-8000-000000000000", amount: 2000 }, "a booking that does not exist"],
    [{ paymentType: "booking", amount: 2000 }, "no order named"],
    [{ paymentType: "holiday_package", referenceId: PACKAGE, amount: 10000 }, "a holiday package, whose price is not held anywhere to check against"],
    [{ paymentType: "made_up", referenceId: BOOKING, amount: 2000 }, "a payment type nobody sends"],
  ];

  for (const [body, what] of attempts) {
    await assertRefused(fn, await pay(fn, body), what);
  }
});

test("a recording is KES 200 and a subscription KES 500, and nothing else", async (t) => {
  const fn = await setup(t);

  await assertCharged(fn, await pay(fn, { paymentType: "single_recording", referenceId: "c1000000-0000-4000-8000-000000000001", amount: 200 }), 200, "a recording");
  forget(fn);
  await assertCharged(fn, await pay(fn, { paymentType: "subscription", amount: 500 }), 500, "a subscription");
  forget(fn);
  await assertRefused(fn, await pay(fn, { paymentType: "single_recording", referenceId: "c1000000-0000-4000-8000-000000000001", amount: 500 }), "a recording at the subscription price");
  await assertRefused(fn, await pay(fn, { paymentType: "subscription", amount: 200 }), "a subscription at the recording price");
});

test("a group class seat is paid for at exactly the price on the enrolment", async (t) => {
  const fn = await setup(t);

  await assertCharged(fn, await pay(fn, { paymentType: "group_class_enrollment", referenceId: GROUP_ENROLMENT, amount: 1400 }), 1400, "the price");
  forget(fn);
  await assertRefused(fn, await pay(fn, { paymentType: "group_class_enrollment", referenceId: GROUP_ENROLMENT, amount: 700 }), "half the price");
});

test("when the deposit setting cannot be read, no deposit is charged and no percentage is guessed", async (t) => {
  const fn = await setup(t);
  fn.world.failTables.add("platform_settings");

  for (const order of ORDERS) {
    for (const amount of [order.thirty, order.platform]) {
      const response = await payFor(fn, order, amount);
      await assertRefused(fn, response.clone(), `${order.kind} at ${amount}`);
      assert.match((await response.json()).error, /Unable to verify the amount/);
    }
  }
});

test("nothing is charged without a valid sign-in", async (t) => {
  const fn = await setup(t);

  for (const [headers, what] of [[{}, "no sign-in at all"], [{ authorization: "Bearer nobody" }, "a token that belongs to nobody"]]) {
    const response = await pay(fn, { paymentType: "booking", referenceId: BOOKING, amount: 2000 }, headers);
    assert.ok(response.status >= 400, `${what}: ${response.status}`);
    assert.deepEqual(charged(fn), [], what);
    assert.equal(payments(fn).length, 0, what);
  }
});

test("the payment record says who paid, for what, and how much", async (t) => {
  const fn = await setup(t);

  const response = await pay(fn, { paymentType: "booking", referenceId: BOOKING, amount: 2000 });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.redirect_url, "https://pay.pesapal.com/pay/track_fake");
  const [row] = payments(fn);
  assert.equal(row.user_id, STUDENT);
  assert.equal(row.payment_type, "booking");
  assert.equal(row.reference_id, BOOKING);
  assert.equal(row.amount, 2000);
  assert.equal(row.currency, "KES");
  assert.equal(row.status, "pending");
  assert.equal(row.pesapal_order_tracking_id, "track_fake");
});
