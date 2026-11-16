// Headless walkthrough of the simpler CRM (the list and the family panel inside the admin dashboard) against a mocked
// Supabase. Run it like walkthrough.js (see its header): build, vite preview on 4179, browser_resize (1280x800, then 390x844),
// then browser_run_code_unsafe with this file (or a fetch+eval stub from dist/ for a shorter echo).
//
// Fixtures: the family from walkthrough.js (a call done, two children with payments, one down to its last session) and seven
// more families, each a kind of row the list has to show (a WhatsApp reply waiting, a late next step, a booked call that has
// passed, a call booked for later, a family with no phone number, one owned by the signed-in admin, a family won this month
// and one last month), plus 230 closed leads for "Show 100 more". Two switches simulate a failed read of the leads and a slow
// family. It checks the dashboard and its menu badges, the counts band, each quick filter, search, a row's buttons, the panel
// and its tabs, a second family replacing a slow first one, an id that does not exist, a failed read, the old addresses and
// the phone layout. Nothing real is touched. It returns { width, results, failed, errors }.
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


  // ------------------------------------------------------------ more families for the list (all invented)
  let failLeads = false; // the next reads of leads fail, as a dropped connection would
  let slowFamily = null; // this family's own row arrives 1.5 s late
  const fid = (n) => `f0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const lid = (n) => `b0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const famRow = (n, name, phone, extra = {}) => ({ ...family, id: fid(n), parent_name: name, phone, email: null, status: "prospect", created_at: iso(nowMs - 3 * D), ...extra });
  const leadRow = (n, fam, extra = {}) => ({
    ...lead, id: lid(n), family_id: fam.id, channel: "whatsapp", stage: "new", owner_id: null, next_step: null, next_step_at: null,
    needs_reply: false, student_name: null, grade_level: null, curriculum: null, subjects: [], assessment_at: null, won_at: null,
    lost_at: null, lost_reason: null, created_at: iso(nowMs - D), last_activity_at: iso(nowMs - D),
    families: { id: fam.id, parent_name: fam.parent_name, phone: fam.phone, email: fam.email, status: fam.status }, ...extra,
  });
  const [ty, tm] = today.split("-").map(Number);
  const lastMonthMid = Date.parse(`${tm === 1 ? ty - 1 : ty}-${String(tm === 1 ? 12 : tm - 1).padStart(2, "0")}-15T09:00:00Z`);
  const FR = famRow(2, "Mrs Reply", "254712000002");
  const FO = famRow(3, "Mr Overdue", "254712000003");
  const FB = famRow(4, "Mrs Booked", "254712000004");
  const FL = famRow(5, "Mr Later", "254712000005");
  const FN = famRow(6, "Mrs Nophone", null);
  const FM = famRow(7, "Mine Family", "254712000007");
  const FW = famRow(8, "Won Recently", "254712000008", { status: "active" });
  const FW2 = famRow(9, "Won Before", "254712000009", { status: "active" });
  const FX = famRow(10, "Lost One", "254712000010");
  const openLeads = [
    lead,
    leadRow(2, FR, { needs_reply: true, student_name: "Wanjiru", subjects: ["English"], created_at: iso(nowMs - 2 * H) }),
    leadRow(3, FO, { stage: "contacted", next_step: "Call back", next_step_at: iso(nowMs - 2 * D), created_at: iso(nowMs - 3 * D) }),
    leadRow(4, FB, { stage: "call_booked", assessment_at: iso(nowMs - 2 * H), created_at: iso(nowMs - 2 * D) }),
    leadRow(5, FL, { stage: "call_booked", assessment_at: iso(nowMs + 2 * D), created_at: iso(nowMs - 4 * D) }),
    leadRow(6, FN, { created_at: iso(nowMs - D) }),
    leadRow(7, FM, { stage: "contacted", owner_id: ADMIN, next_step: "Send fees", next_step_at: iso(nowMs + 3 * D), created_at: iso(nowMs - 5 * D) }),
  ];
  const bulkFamilies = Array.from({ length: 230 }, (_, i) => famRow(100 + i, `Closed family ${i + 1}`, `2547130${String(i).padStart(5, "0")}`));
  const closedLeads = [
    leadRow(8, FW, { stage: "won", won_at: iso(nowMs - 60e3), last_activity_at: iso(nowMs - 60e3), created_at: iso(nowMs - 30 * D) }),
    leadRow(9, FW2, { stage: "won", won_at: iso(lastMonthMid), last_activity_at: iso(lastMonthMid), created_at: iso(lastMonthMid - 10 * D) }),
    leadRow(10, FX, { stage: "lost", lost_reason: "price", lost_at: iso(nowMs - 5 * D), last_activity_at: iso(nowMs - 5 * D), created_at: iso(nowMs - 40 * D) }),
    ...bulkFamilies.map((f, i) => leadRow(100 + i, f, { stage: "lost", lost_reason: "no_response", lost_at: iso(nowMs - ((i % 80) + 1) * D), last_activity_at: iso(nowMs - ((i % 80) + 1) * D), created_at: iso(nowMs - ((i % 80) + 60) * D) })),
  ];
  const allLeads = [...openLeads, ...closedLeads];
  const allFamilies = [family, FR, FO, FB, FL, FN, FM, FW, FW2, FX, ...bulkFamilies];

  // ------------------------------------------------------------ a small PostgREST
  const tableRows = (table) => ({
    leads: () => allLeads, families: () => allFamilies, enrolments: () => enrolments, session_packs: () => packs,
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
        // The dashboard checks for an admin with user_roles (one row, asked for as an object).
        if (table === "user_roles") return reply(route, 200, wantsObject ? { role: "admin", user_id: ADMIN } : [{ role: "admin", user_id: ADMIN }]);
        if (failLeads && table === "leads") return reply(route, 500, { code: "XX000", message: "simulated failure" });
        if (slowFamily && table === "families" && url.searchParams.get("id") === "eq." + slowFamily) await new Promise((r) => setTimeout(r, 1500));
        const rows = query(table, url.searchParams);
        // A count (the menu badges): PostgREST answers HEAD with the total in Content-Range.
        if (req.method() === "HEAD") return route.fulfill({ status: 200, headers: { ...CORS, "content-range": rows.length ? `0-${rows.length - 1}/${rows.length}` : "*/0" } });
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
        if (req.method() === "PATCH") {
          // What crm_enrolments_before_update_tutor does: a tutor change may not duplicate another entry
          // for the same child, subject and tutor.
          if (table === "enrolments" && body && "tutor_id" in body) {
            for (const r of rows) {
              const clash = enrolments.find((x) => x !== r && x.family_id === r.family_id
                && x.subject.toLowerCase() === r.subject.toLowerCase()
                && (x.student_name || "").toLowerCase() === (r.student_name || "").toLowerCase()
                && x.tutor_id === body.tutor_id);
              if (clash) return reply(route, 400, { code: "P0001", message: "There is already an entry for this child, subject and tutor. Record payments there instead." });
            }
          }
          rows.forEach((r) => Object.assign(r, body));
          return wantsBody ? reply(route, 200, rows) : reply(route, 204);
        }
        if (req.method() === "DELETE") {
          // What crm_session_packs_before_delete does: a payment lessons have used stays.
          if (table === "session_packs") {
            if (rows.some((r) => Number(r.sessions_used) > 0)) return reply(route, 400, { code: "P0001", message: "Sessions have already been taken from this payment, so it cannot be removed. Undo those lessons first." });
            for (const r of rows) packs.splice(packs.indexOf(r), 1);
            return wantsBody ? reply(route, 200, rows) : reply(route, 204);
          }
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

  const F2 = fid(2), F3 = fid(3);
  const rows = () => page.locator('ul[aria-label="Families"] > li');
  const rowFor = (name) => rows().filter({ hasText: name }).first();
  const chip = (label) => page.getByRole("group", { name: "Quick filters" }).getByRole("button", { name: new RegExp(`^${label}`) });
  const countOf = async (label) => ((await chip(label).textContent()) || "").replace(label, "").trim();
  const dialog = () => page.getByRole("dialog");
  const panelTitle = async () => ((await dialog().locator("h2").first().textContent()) || "").trim();
  const desktop = WIDTH >= 768;

  // A long run can lose its page at random (a Playwright MCP quirk): keep what was checked so far and say where it stopped.
  try {
    // ------------------------------------------------------------ 1. The admin dashboard, its menu and its badges
    await page.goto(`${BASE}/admin`);
    await visible(page.getByRole("heading", { name: "Admin Dashboard" }), "Dashboard: /admin is the admin dashboard");
    if (desktop) {
      const crmItem = page.getByRole("button", { name: /^CRM/ }).first();
      await visible(crmItem, "Menu: CRM is an item");
      check("Menu: the CRM badge counts the family waiting for a reply", /CRM\s*1$/.test(((await crmItem.textContent()) || "").trim()), await crmItem.textContent());
      const lessonsItem = page.getByRole("button", { name: /^Lessons/ }).first();
      check("Menu: the Lessons badge counts the two lessons waiting", /Lessons\s*2$/.test(((await lessonsItem.textContent()) || "").trim()), await lessonsItem.textContent());
      await visible(page.getByRole("button", { name: /^December desk/ }), "Menu: the December desk is an item");
      await crmItem.click();
    } else {
      await page.goto(`${BASE}/admin/crm`);
    }

    // ------------------------------------------------------------ 2. The list: band, filters, rows
    await visible(page.getByText("Families who got in touch, newest first"), "List: the CRM tab shows the list");
    check("List: the address is /admin/crm", new URL(page.url()).pathname === "/admin/crm", page.url());
    const band = ((await page.getByLabel("Counts").textContent()) || "").replace(/\s+/g, " ");
    check("Band: New 2, two in the last 7 days", /New\s*2\s*2 in the last 7 days/.test(band), band);
    check("Band: In progress 5, none due today", /In progress\s*5\s*0 due today/.test(band), band);
    check("Band: Won this month 1, one last month", /Won this month\s*1\s*1 last month/.test(band), band);
    for (const [label, want] of [["All open", "7"], ["Needs a reply", "1"], ["Overdue", "2"], ["Call booked", "2"], ["Top-up due", "1"], ["Mine", "1"], ["Won and lost", "233"]]) {
      check(`Filters: ${label} counts ${want}`, (await countOf(label)) === want, await countOf(label));
    }
    check("List: seven open families", (await rows().count()) === 7, await rows().count());
    check("List: newest first, the waiting reply on top", /Mrs Reply/.test((await rows().first().textContent()) || ""), await rows().first().textContent());
    check("Row: a waiting chat says Reply on WhatsApp", /Reply on WhatsApp/.test((await rowFor("Mrs Reply").textContent()) || ""));
    check("Row: a late step says how late", /Call back · 2 days late/.test((await rowFor("Mr Overdue").textContent()) || ""), await rowFor("Mr Overdue").textContent());
    check("Row: a passed call asks for the call to be logged", /Log the call/.test((await rowFor("Mrs Booked").textContent()) || ""));
    check("Row: a new family needs a first call", /Needs first call/.test((await rowFor("Mrs Nophone").textContent()) || ""));
    check("Row: the owner is named", /Test Admin/.test((await rowFor("Mine Family").textContent()) || ""));
    check("Row: Call dials the family", (await rowFor("Mr Overdue").getByRole("link", { name: "Call Mr Overdue" }).first().getAttribute("href")) === "tel:+254712000003");
    check("Row: WhatsApp opens the family's chat", (await rowFor("Mr Overdue").getByRole("link", { name: "WhatsApp Mr Overdue" }).first().getAttribute("href")) === "https://wa.me/254712000003");
    const noPhoneCall = rowFor("Mrs Nophone").getByRole("link", { name: "Call Mrs Nophone" }).first();
    check("Row: no phone number, the buttons are disabled and say why", (await noPhoneCall.getAttribute("aria-disabled")) === "true" && (await noPhoneCall.getAttribute("title")) === "No phone number" && (await noPhoneCall.getAttribute("href")) === null);
    await noOverflow("List");
    await shot("crm-1-list");

    for (const [label, want, first] of [["Needs a reply", 1, "Mrs Reply"], ["Overdue", 2, null], ["Call booked", 2, null], ["Top-up due", 1, "Test Parent"], ["Mine", 1, "Mine Family"]]) {
      await chip(label).click();
      await page.waitForTimeout(150);
      const n = await rows().count();
      check(`Filter: ${label} shows ${want}`, n === want && (!first || /./.test(first) && ((await rows().first().textContent()) || "").includes(first)), `${n} ${await rows().first().textContent()}`);
    }
    for (const [tile, want] of [["New", 2], ["In progress", 5], ["Won this month", 1]]) {
      await page.getByLabel("Counts").getByRole("button", { name: new RegExp(`^${tile}`) }).click();
      await page.waitForTimeout(150);
      check(`Band: clicking ${tile} shows ${want}`, (await rows().count()) === want, await rows().count());
    }
    await chip("All open").click();
    await page.getByLabel("Search families").fill("overdue");
    await page.waitForTimeout(150);
    check("Search: a name narrows the list", (await rows().count()) === 1 && /Mr Overdue/.test((await rows().first().textContent()) || ""), await rows().count());
    await page.getByLabel("Search families").fill("");

    // ------------------------------------------------------------ 3. Won and lost, 100 at a time
    await chip("Won and lost").click();
    await page.waitForTimeout(200);
    check("Won and lost: the first 100", (await rows().count()) === 100, await rows().count());
    await page.getByRole("button", { name: "Show 100 more" }).click();
    await page.waitForTimeout(200);
    check("Won and lost: 200 after Show 100 more", (await rows().count()) === 200, await rows().count());
    await page.getByRole("button", { name: "Show 33 more" }).click();
    await page.waitForTimeout(200);
    check("Won and lost: all 233, and no more button", (await rows().count()) === 233 && (await page.getByRole("button", { name: /^Show \d+ more$/ }).count()) === 0, await rows().count());
    await chip("All open").click();

    // ------------------------------------------------------------ 4. The panel
    await rowFor("Test Parent").click();
    await visible(dialog().getByRole("tab", { name: "Info" }), "Panel: a row opens the panel");
    check("Panel: its address is /admin/crm/<family>", new URL(page.url()).pathname === `/admin/crm/${F1}`, page.url());
    check("Panel: it names the family and the child", (await panelTitle()) === "Test Parent" && /Amani Test · Maths · Grade 6/.test((await dialog().textContent()) || ""), await panelTitle());
    check("Panel: Info is the open tab", (await dialog().getByRole("tab", { name: "Info" }).getAttribute("aria-selected")) === "true");
    check("Panel: Call dials the family", (await dialog().getByRole("link", { name: "Call" }).getAttribute("href")) === "tel:+254712000111");
    await dialog().getByRole("tab", { name: "Follow-up" }).click();
    await visible(dialog().getByRole("button", { name: /Log call/ }), "Follow-up: Log call");
    await visible(dialog().getByRole("button", { name: /Mark won/ }), "Follow-up: Mark won");
    await dialog().getByRole("tab", { name: "Payments" }).click();
    await visible(dialog().getByRole("button", { name: /Record payment/ }), "Payments: Record payment");
    check("Payments: its tab is the selected one, the others are not", (await dialog().getByRole("tab", { name: "Payments" }).getAttribute("aria-selected")) === "true" && (await dialog().getByRole("tab", { name: "Info" }).getAttribute("aria-selected")) === "false");
    await shot("crm-2-panel-payments");
    await dialog().getByRole("tab", { name: "History" }).click();
    await visible(dialog().getByPlaceholder(/note/i), "History: the note box");
    await visible(dialog().getByRole("button", { name: /December seats/ }), "History: December seats");
    await dialog().getByRole("tab", { name: "Info" }).click();
    check("Info: selected again, Payments not", (await dialog().getByRole("tab", { name: "Info" }).getAttribute("aria-selected")) === "true" && (await dialog().getByRole("tab", { name: "Payments" }).getAttribute("aria-selected")) === "false");
    if (!desktop) {
      const box = await dialog().boundingBox();
      check("Phone: the panel fills the screen", box && box.width >= WIDTH - 2, box && box.width);
    }
    await shot("crm-3-panel-info");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    check("Panel: closing goes back to /admin/crm", new URL(page.url()).pathname === "/admin/crm", page.url());

    // ------------------------------------------------------------ 5. A second family replaces a slow first one
    slowFamily = F3;
    await page.goto(`${BASE}/admin/crm/${F3}`);
    await page.waitForTimeout(400);
    await page.evaluate((to) => { window.history.pushState({}, "", to); window.dispatchEvent(new PopStateEvent("popstate")); }, `/admin/crm/${F2}`);
    await page.waitForTimeout(2300);
    check("Panel: after a slow first family, only the second one shows", (await panelTitle()) === "Mrs Reply" && !/Mr Overdue/.test((await dialog().textContent()) || ""), await panelTitle());
    slowFamily = null;

    // ------------------------------------------------------------ 6. An id that does not exist
    await page.goto(`${BASE}/admin/crm/not-a-real-id`);
    await visible(dialog().getByText("This family was not found."), "Panel: a bad id says the family was not found");
    check("Panel: the list behind it still works", (await rows().count()) === 7, await rows().count());

    // ------------------------------------------------------------ 7. A failed read
    failLeads = true;
    await page.goto(`${BASE}/admin/crm`);
    await visible(page.getByRole("alert").getByText(/Could not load the CRM/), "Error: a failed read says so");
    check("Error: no counts are shown", (await page.getByLabel("Counts").count()) === 0);
    await shot("crm-4-error");
    failLeads = false;
    await page.getByRole("button", { name: "Try again" }).click();
    await visible(page.getByLabel("Counts"), "Error: Try again brings the list back");

    // ------------------------------------------------------------ 8. Old addresses
    await page.goto(`${BASE}/admin/families/${F1}`);
    await visible(dialog().getByRole("tab", { name: "Info" }), "Old address: a family page opens the panel");
    check("Old address: it lands on /admin/crm/<family>", new URL(page.url()).pathname === `/admin/crm/${F1}`, page.url());
    await page.goto(`${BASE}/admin/leads`);
    await visible(page.getByText("Families who got in touch, newest first"), "Old address: /admin/leads opens the CRM");
    await page.goto(`${BASE}/admin/more`);
    await visible(page.getByRole("heading", { name: "Admin Dashboard" }), "Old address: /admin/more opens the dashboard");
    check("Old address: /admin/more lands on /admin", new URL(page.url()).pathname === "/admin", page.url());
    if (!desktop) {
      await page.goto(`${BASE}/admin/crm`);
      await visible(rows().first(), "Phone: the list shows");
      check("Phone: rows are cards, the table heading is hidden", !(await page.getByText("Reach out", { exact: true }).isVisible()));
      await noOverflow("Phone list");
    }
  } catch (e) {
    errors.push("stopped early: " + e.message.split("\n")[0]);
  }

  return { width: WIDTH, results, failed: results.filter((r) => !r.ok), errors };
}
