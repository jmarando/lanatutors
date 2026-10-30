// Headless walkthrough of the CRM lessons slice against a mocked Supabase.
//
// Run it with the Playwright MCP tool browser_run_code_unsafe (filename = this file), after
//   npm run build && npx vite preview --port 4179 --strictPort --host 127.0.0.1
// and after setting the window size with browser_resize (390x844 for a phone, 1280x800 for a desktop).
// Edit BASE and OUT below if the port or the screenshot folder differ. No real data is touched: every
// request to the Supabase host is answered from the fixtures below, which also mimic what the database
// does for the two writes the screens make (Record payment and confirming a lesson).
//
// It signs in as a fake admin, then: opens Today (top-ups and lessons to confirm), confirms a lesson
// and yesterday's lessons on /admin/lessons, records a payment on a family page and reads its
// progress. It returns {results, errors}; every result must be ok and errors must be empty.
async (page) => {
  const BASE = "http://127.0.0.1:4179";
  const OUT = "/tmp/crm-walkthrough";
  const SUPA = "https://iccemuiqcdumgxiwxzdq.supabase.co";
  const viewport = page.viewportSize() || { width: 1280, height: 800 };
  const WIDTH = viewport.width;
  const results = [];
  const errors = [];
  const check = (name, ok, detail) => results.push({ name, ok: Boolean(ok), detail: detail === undefined ? "" : String(detail) });

  // ------------------------------------------------------------ fixtures (all invented)
  const ADMIN = "a0000000-0000-4000-8000-000000000001";
  const F1 = "f0000000-0000-4000-8000-000000000001";
  const H = 3600e3;
  const D = 24 * H;
  const iso = (t) => new Date(t).toISOString();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
  const todayMid = Date.parse(`${today}T00:00:00+03:00`);
  const nowMs = Date.now();

  const family = { id: F1, parent_name: "Test Parent", phone: "254712000111", email: "parent@example.test", area: null, parent_profile_id: null, status: "prospect", notes: null, created_at: iso(nowMs - 20 * D), updated_at: iso(nowMs) };
  const lead = { id: "l0000000-0000-4000-8000-000000000001", family_id: F1, channel: "phone", source_table: null, source_id: null, stage: "call_done", owner_id: null, next_step: "Send the package", next_step_at: iso(nowMs + D), next_step_owner_id: null, needs_reply: false, student_name: "Amani Test", grade_level: "Grade 6", curriculum: "CBC", subjects: ["Maths"], mode: null, budget: null, urgency: null, assessment_at: null, assessment_outcome: null, recommended_tutor_id: null, quoted_rate_kes: null, quoted_package: null, lost_reason: null, won_at: null, lost_at: null, created_at: iso(nowMs - 10 * D), updated_at: iso(nowMs), last_activity_at: iso(nowMs - D), families: { id: F1, parent_name: family.parent_name, phone: family.phone, email: family.email, status: "prospect" } };
  const enrolments = [
    { id: "e0000000-0000-4000-8000-000000000001", family_id: F1, student_name: "Amani Test", student_id: null, subject: "Maths", tutor_id: "tp1", status: "active", rate_per_session: 3000, opening_tutor_pay_kes: null, opening_tutor_paid_kes: null, opening_tutor_reference: null, notes: null, created_at: iso(nowMs - 30 * D), updated_at: iso(nowMs) },
    { id: "e0000000-0000-4000-8000-000000000002", family_id: F1, student_name: "Zuri Test", student_id: null, subject: "English", tutor_id: "tp2", status: "active", rate_per_session: 2500, opening_tutor_pay_kes: null, opening_tutor_paid_kes: null, opening_tutor_reference: null, notes: null, created_at: iso(nowMs - 29 * D), updated_at: iso(nowMs) },
  ];
  const [E1, E2] = enrolments;
  const packs = [
    { id: "p0000000-0000-4000-8000-000000000001", enrolment_id: E1.id, amount_kes: 24000, reference: "TESTREF1", paid_on: "2026-10-01", sessions_bought: 8, rate_per_session: 3000, sessions_used: 7, notes: null, created_by: ADMIN, created_at: iso(nowMs - 28 * D) },
    { id: "p0000000-0000-4000-8000-000000000002", enrolment_id: E2.id, amount_kes: 10000, reference: "TESTREF2", paid_on: "2026-10-05", sessions_bought: 4, rate_per_session: 2500, sessions_used: 1, notes: null, created_by: ADMIN, created_at: iso(nowMs - 27 * D) },
  ];
  const tutorNames = { tp1: "Tutor One", tp2: "Tutor Two" };
  let seq = 100;
  const lesson = (id, enrolment, startMs, report) => ({
    booking_id: id, enrolment_id: enrolment.id, family_id: F1, family_name: family.parent_name, family_phone: family.phone,
    student_name: enrolment.student_name, subject: enrolment.subject, tutor_user_id: "u-" + enrolment.tutor_id, tutor_profile_id: enrolment.tutor_id,
    tutor_name: tutorNames[enrolment.tutor_id], starts_at: iso(startMs), ends_at: iso(startMs + H), booking_status: "confirmed", class_type: "online",
    report_id: report ? "r-" + id : null, attendance: report ? report.attendance : null, covered: report ? report.covered || null : null,
    homework: report ? report.homework || null : null, engagement: report ? report.engagement || null : null,
    tutor_pay_kes: report ? report.pay : null, pack_id: null, confirmed_at: report ? iso(startMs + 2 * H) : null, tracked: true,
  });
  const lessons = [
    lesson("b-pending-old", E2, todayMid - 3 * D + 10 * H),          // three days ago, not confirmed
    lesson("b-pending-yesterday", E1, todayMid - 8 * H),             // yesterday 16:00, not confirmed
    lesson("b-upcoming", E1, Math.ceil((nowMs + 3 * H) / H) * H),    // later today or tomorrow
    lesson("b-done-1", E1, todayMid - 12 * D + 9 * H, { attendance: "delivered", covered: "Place value", homework: "Page 3", engagement: 3, pay: 2100 }),
    lesson("b-done-2", E1, todayMid - 10 * D + 9 * H, { attendance: "delivered", covered: "Fractions", homework: "Page 9", engagement: 4, pay: 2100 }),
    lesson("b-done-3", E1, todayMid - 8 * D + 9 * H, { attendance: "student_absent", pay: 2100 }),
    lesson("b-done-4", E2, todayMid - 9 * D + 9 * H, { attendance: "delivered", covered: "Comprehension", engagement: 5, pay: 1750 }),
  ];

  const balances = () => enrolments.map((e) => {
    const mine = packs.filter((p) => p.enrolment_id === e.id);
    const sum = (f) => mine.reduce((a, p) => a + f(p), 0);
    const latest = [...mine].sort((a, b) => String(b.paid_on).localeCompare(String(a.paid_on)))[0];
    return {
      enrolment_id: e.id, family_id: F1, family_name: family.parent_name, family_phone: family.phone, student_name: e.student_name,
      subject: e.subject, tutor_id: e.tutor_id, tutor_name: tutorNames[e.tutor_id], status: e.status, rate_per_session: latest ? latest.rate_per_session : e.rate_per_session,
      packs: mine.length, sessions_bought: sum((p) => p.sessions_bought), sessions_used: sum((p) => p.sessions_used),
      sessions_left: sum((p) => p.sessions_bought - p.sessions_used), amount_paid: sum((p) => p.amount_kes),
      balance: sum((p) => p.amount_kes - p.sessions_used * p.rate_per_session), unpriced_lessons: 0, last_lesson_at: null,
    };
  });

  const COUNTS = ["delivered", "student_absent", "late_cancellation"];
  const confirm = (row) => {
    const l = lessons.find((x) => x.booking_id === row.booking_id);
    if (!l) throw new Error("no such lesson " + row.booking_id);
    if (l.report_id) return { status: 409, body: { code: "23505", message: "duplicate key value violates unique constraint" } };
    let pay = 0;
    let packId = null;
    if (COUNTS.includes(row.attendance)) {
      const pack = packs.filter((p) => p.enrolment_id === l.enrolment_id && p.sessions_used < p.sessions_bought)[0];
      if (pack) { pack.sessions_used += 1; packId = pack.id; pay = Math.round(pack.rate_per_session * 0.7 * 100) / 100; } else { pay = null; }
    }
    Object.assign(l, { report_id: "r-" + l.booking_id, attendance: row.attendance, covered: row.covered || null, homework: row.homework || null, engagement: row.engagement || null, tutor_pay_kes: pay, pack_id: packId, confirmed_at: iso(Date.now()) });
    return { status: 201, row: { id: l.report_id, booking_id: l.booking_id, enrolment_id: l.enrolment_id, attendance: l.attendance, covered: l.covered, homework: l.homework, engagement: l.engagement, tutor_pay_kes: pay, pack_id: packId, confirmed_by: ADMIN, confirmed_at: l.confirmed_at, created_at: l.confirmed_at } };
  };

  // ------------------------------------------------------------ a small PostgREST
  const tableRows = (table) => ({
    leads: () => [lead], families: () => [family], enrolments: () => enrolments, session_packs: () => packs,
    crm_enrolment_balances: balances, crm_lessons: () => lessons, lead_activities: () => [], whatsapp_conversations: () => [],
    consultation_bookings: () => [], crm_settings: () => [{ id: true, default_owner_id: null, lessons_from: iso(nowMs - 40 * D), updated_at: iso(nowMs) }],
    tutor_profiles: () => [{ id: "tp1", user_id: "u1", is_listed: true }, { id: "tp2", user_id: "u2", is_listed: true }],
    profiles: () => [{ id: "u1", full_name: "Tutor One" }, { id: "u2", full_name: "Tutor Two" }],
  }[table] || (() => []))();

  const matches = (row, key, value) => {
    const m = /^(eq|neq|gt|gte|lt|lte|is|in)\.(.*)$/.exec(value);
    if (!m) return true;
    let cell = row[key];
    if (key.includes(".")) { // embedded filter, only enrolments.family_id on packs
      const e = enrolments.find((x) => x.id === row.enrolment_id);
      cell = e ? e[key.split(".")[1]] : undefined;
    }
    const [, op, arg] = m;
    if (op === "is") return arg === "null" ? cell == null : String(cell) === arg;
    if (op === "in") return arg.replace(/^\(|\)$/g, "").split(",").map((s) => s.replace(/^"|"$/g, "")).includes(String(cell));
    const numeric = typeof cell === "number";
    const a = numeric ? cell : String(cell);
    const b = numeric ? Number(arg) : arg;
    return op === "eq" ? String(cell) === arg : op === "neq" ? String(cell) !== arg : op === "gt" ? a > b : op === "gte" ? a >= b : op === "lt" ? a < b : a <= b;
  };
  const query = (table, params) => {
    let rows = tableRows(table).slice();
    for (const [key, value] of params.entries()) {
      if (["select", "order", "limit", "offset", "columns"].includes(key)) continue;
      rows = rows.filter((r) => matches(r, key, value));
    }
    const order = params.get("order");
    if (order) {
      const keys = order.split(",").map((part) => { const [col, dir] = part.split("."); return { col, desc: dir === "desc" }; });
      rows.sort((x, y) => { for (const { col, desc } of keys) { const xa = x[col] == null ? "" : x[col]; const ya = y[col] == null ? "" : y[col]; if (xa < ya) return desc ? 1 : -1; if (xa > ya) return desc ? -1 : 1; } return 0; });
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
    const wantsBody = (req.headers()["prefer"] || "").includes("return=representation");
    try {
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      if (path.startsWith("/auth/v1/")) return reply(route, 200, path.endsWith("/user") ? session.user : session);
      if (path.startsWith("/functions/v1/")) return reply(route, 200, {});
      if (path.startsWith("/rest/v1/rpc/")) {
        const name = path.split("/").pop();
        const args = req.postData() ? JSON.parse(req.postData()) : {};
        if (name === "has_role") return reply(route, 200, true);
        if (name === "crm_team_members") return reply(route, 200, [{ user_id: ADMIN, full_name: "Test Admin" }]);
        if (name === "crm_record_payment") {
          const rate = args.p_rate_per_session != null ? args.p_rate_per_session : Math.round((args.p_amount_kes / args.p_sessions_bought) * 100) / 100;
          const pack = { id: "p-new-" + ++seq, enrolment_id: args.p_enrolment_id, amount_kes: args.p_amount_kes, reference: args.p_reference, paid_on: args.p_paid_on || today, sessions_bought: args.p_sessions_bought, rate_per_session: rate, sessions_used: 0, notes: null, created_by: ADMIN, created_at: iso(Date.now()) };
          packs.push(pack);
          family.status = "active";
          return reply(route, 200, pack.id);
        }
        return reply(route, 404, { message: "unknown rpc " + name });
      }
      if (path.startsWith("/rest/v1/")) {
        const table = path.split("/").pop();
        const rows = query(table, url.searchParams);
        if (req.method() === "GET") {
          if (wantsObject) return rows.length ? reply(route, 200, rows[0]) : reply(route, 406, { code: "PGRST116", message: "no rows" });
          return reply(route, 200, rows);
        }
        const body = req.postData() ? JSON.parse(req.postData()) : null;
        if (req.method() === "POST") {
          const input = Array.isArray(body) ? body : [body];
          let out = [];
          if (table === "lesson_reports") {
            for (const row of input) { const r = confirm(row); if (r.status !== 201) return reply(route, r.status, r.body); out.push(r.row); }
          } else if (table === "enrolments") {
            for (const row of input) { const e = { id: "e-new-" + ++seq, student_id: null, student_name: null, tutor_id: null, status: "active", rate_per_session: null, opening_tutor_pay_kes: null, opening_tutor_paid_kes: null, opening_tutor_reference: null, notes: null, created_at: iso(Date.now()), updated_at: iso(Date.now()), ...row }; enrolments.push(e); out.push(e); }
          } else { out = input; }
          return wantsBody ? reply(route, 201, wantsObject ? out[0] : out) : reply(route, 201);
        }
        if (req.method() === "PATCH") { rows.forEach((r) => Object.assign(r, body)); return wantsBody ? reply(route, 200, rows) : reply(route, 204); }
        if (req.method() === "DELETE") {
          if (table === "lesson_reports") {
            for (const l of lessons) if (rows.length === 0 ? false : rows.some((r) => r.id === l.report_id)) { Object.assign(l, { report_id: null, attendance: null, covered: null, homework: null, engagement: null, tutor_pay_kes: null }); }
          }
          if (table === "enrolments") for (const r of rows) enrolments.splice(enrolments.indexOf(r), 1);
          return reply(route, 204);
        }
      }
      return reply(route, 200, []);
    } catch (e) {
      errors.push("mock: " + e.message);
      return reply(route, 500, { message: e.message });
    }
  });
  // Everything else on the internet (fonts, analytics, pixels) is blocked, like an offline admin tool.
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

  // ------------------------------------------------------------ 1. Today
  await page.goto(`${BASE}/admin`);
  await visible(page.getByText("Top-ups due"), "Today: the Top-ups due card is there");
  await visible(page.getByText("1 session left"), "Today: Amani's maths pack is flagged as 1 session left");
  await visible(page.getByText(/2 lessons waiting/), "Today: two lessons are waiting to be confirmed");
  await visible(page.getByRole("link", { name: "Lessons" }).last(), "Today: Lessons is in the navigation");
  await noOverflow("Today");
  await shot("1-today");

  // ------------------------------------------------------------ 2. Lessons: confirm one, then yesterday's
  await page.goto(`${BASE}/admin/lessons`);
  await visible(page.getByText("Needs confirming").first(), "Lessons: the Needs confirming queue is there");
  await visible(page.getByRole("button", { name: /Confirm yesterday's lessons \(1\)/ }), "Lessons: one lesson ended yesterday");
  await noOverflow("Lessons");
  await shot("2-lessons");
  await page.getByRole("button", { name: "Confirm", exact: true }).first().click(); // the oldest: Zuri's English
  await visible(page.getByRole("dialog").getByText("Confirm the lesson"), "Confirm dialog opens");
  await page.locator("#lesson-covered").fill("Reading comprehension");
  await page.getByRole("dialog").getByRole("button", { name: /4\s*Good/ }).click();
  await shot("3-confirm-dialog");
  await page.getByRole("dialog").getByRole("button", { name: "Confirm and use a session" }).click();
  await visible(page.getByText(/One session used, tutor pay KES 1,750/), "Confirming says one session used and tutor pay KES 1,750 (70% of 2,500)");
  await page.waitForTimeout(500);
  // The week list on the right also has Confirm buttons, so count only inside the queue card.
  const queue = page.locator("div.rounded-lg.border.bg-card", { has: page.getByText("Needs confirming", { exact: true }) }).first();
  check("The confirmed lesson left the queue", (await queue.getByRole("button", { name: "Confirm", exact: true }).count()) === 1);
  await page.getByRole("button", { name: /Confirm yesterday's lessons \(1\)/ }).click();
  await visible(page.getByRole("dialog").getByText("Confirm yesterday's lessons?"), "Yesterday's bulk confirm asks first");
  await page.getByRole("dialog").getByRole("button", { name: /^Confirm 1$/ }).click();
  await visible(page.getByText(/Confirmed 1 lesson as delivered/), "Yesterday's lesson was confirmed");
  await visible(page.getByText("Every lesson has a report. Nothing to confirm."), "The queue is empty");
  await shot("4-lessons-after");

  // ------------------------------------------------------------ 3. Family: sessions, record payment, progress
  await page.goto(`${BASE}/admin/families/${F1}`);
  await visible(page.getByText("Amani Test · Maths").first(), "Family: Amani's maths line is in the Sessions card");
  await visible(page.getByText("Zuri Test · English").first(), "Family: Zuri's English line is in the Sessions card");
  await visible(page.getByText("Top-up due").first(), "Family: Amani's pack is used up, so Top-up due shows");
  await visible(page.getByText("Progress", { exact: true }), "Family: the Progress card is there");
  await visible(page.getByText("Attendance").first(), "Family: progress shows attendance");
  await noOverflow("Family");
  await shot("5-family");
  await page.getByRole("button", { name: "Payment", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await visible(dialog.getByText("Record a payment"), "Record payment opens");
  await dialog.locator("#pay-amount").fill("24000");
  await dialog.locator("#pay-sessions").fill("8");
  check("The rate fills in as amount ÷ sessions", (await dialog.locator("#pay-rate").inputValue()) === "3000", await dialog.locator("#pay-rate").inputValue());
  await dialog.locator("#pay-ref").fill("TESTREF3");
  await shot("6-record-payment");
  await dialog.getByRole("button", { name: "Record payment" }).click();
  await visible(page.getByText(/Recorded KES 24,000 for 8 sessions/), "Recording shows the amount and sessions");
  await visible(page.getByText("This family has paid, but its lead is still open."), "Family: it suggests marking the lead won");
  await visible(page.getByRole("button", { name: /2 payments/ }), "Family: Amani's maths now has two payments");
  await page.getByRole("button", { name: /2 payments/ }).first().click();
  await visible(page.getByText(/ref TESTREF3/), "Family: the new payment shows its reference");
  await shot("7-family-after-payment");
  await noOverflow("Family after payment");

  return { width: WIDTH, results, failed: results.filter((r) => !r.ok), errors };
}
