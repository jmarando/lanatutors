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
  const ownNotes = [{ id: "own1", family_id: F1, lead_id: lead.id, kind: "note", body: "DEC26 G8-SCI - Amani Test", meta: {}, source_table: null, source_id: null, created_by: ADMIN, occurred_at: iso(nowMs - D), created_at: iso(nowMs - D) }];

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
  await visible(dialog.getByText(/Integrated Science \(already reserved\)/), "Seats: Amani Test already holds Grade 8 Integrated Science");
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
