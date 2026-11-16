// Headless walkthrough of the December desk's actions (Phase 2) against a mocked Supabase. Run it like december-walkthrough.js
// (see its header): build, vite preview on 4179, browser_resize, then browser_run_code_unsafe with this file.
//
// Fixtures: Form 3 English is running with three families (one enrolled and unpaid, one paid, one only reserved); Form 3
// Mathematics has 6 seats and is ready to open; Grade 8 Science has one seat and will be archived. It enrols the reserved
// child (checking the request the screen sends and the payment message), opens Mathematics, archives Science and reads its
// not-running message, opens the paybill dialog, releases a seat, and checks Archive is refused for a class with enrolments.
// Nothing real is touched. It returns { width, results, failed, errors }.
async (page) => {
  const BASE = "http://127.0.0.1:4179";
  const OUT = "/tmp/december-walkthrough";
  const SUPA = "https://iccemuiqcdumgxiwxzdq.supabase.co";
  const WIDTH = (page.viewportSize() || { width: 1280 }).width;
  const results = [];
  const errors = [];
  const requests = [];
  const check = (name, ok, detail) => results.push({ name, ok: Boolean(ok), detail: detail === undefined ? "" : String(detail) });

  // ------------------------------------------------------------ fixtures (all invented)
  const ADMIN = "a0000000-0000-4000-8000-000000000001";
  const iso = (t) => new Date(t).toISOString();
  const nowMs = Date.now();
  const D = 24 * 3600e3;
  const fam = (id, name, phone, login = null) => ({ id, parent_name: name, phone, email: null, parent_profile_id: login });
  const FA = "a0000000-0000-4000-8000-00000000000a";
  const FB = "b0000000-0000-4000-8000-00000000000b";
  const FC = "c0000000-0000-4000-8000-00000000000c";
  const FD = "d0000000-0000-4000-8000-00000000000d";
  const FE = "e0000000-0000-4000-8000-00000000000e";
  const FAMILIES = {
    [FA]: fam(FA, "Mrs Alpha", "254712000001", "login-a"),
    [FB]: fam(FB, "Mrs Beta", "254712000002"),
    [FC]: fam(FC, "Mrs Gamma", "254712000003", "login-c"),
    [FD]: fam(FD, "Mrs Delta", "254712000004"),
    [FE]: fam(FE, "Mrs Epsilon", "254712000005"),
  };
  const program = { id: "90000000-0000-4000-8000-000000000001", name: "December 2099 Holiday Classes", description: null, start_date: "2099-12-07", end_date: "2099-12-18", is_active: true };
  const cls = (n, subject, curriculum, grade, slot, extra = {}) => ({ id: `c${n}000000-0000-4000-8000-000000000000`, program_id: program.id, subject, curriculum, grade_levels: [grade], time_slot: slot, max_students: 12, current_enrollment: 0, status: "active", tutor_id: null, meeting_link: null, ...extra });
  const classes = [
    cls(1, "Mathematics", "8-4-4", "Form 3", "8:00 AM - 9:15 AM"),
    cls(2, "Chemistry", "8-4-4", "Form 3", "9:30 AM - 10:45 AM"),
    cls(3, "English", "8-4-4", "Form 3", "11:00 AM - 12:15 PM", { status: "confirmed", tutor_id: "tp1", meeting_link: "https://meet.example.test/english", current_enrollment: 2 }),
    cls(4, "Mathematics", "CBC", "Grade 8", "8:00 AM - 9:15 AM"),
    cls(5, "Integrated Science", "CBC", "Grade 8", "9:30 AM - 10:45 AM"),
    cls(6, "English", "CBC", "Grade 8", "11:00 AM - 12:15 PM"),
  ];
  const [MATHS, , ENG] = classes;
  let t = 0;
  const note = (family, body) => ({ id: `n${++t}`, family_id: family, kind: "note", body, occurred_at: iso(nowMs - D + t * 60e3), created_at: iso(nowMs - D + t * 60e3), families: FAMILIES[family] });
  const notes = [
    note(FA, "DEC26 F3-ENG - Amani"),
    note(FC, "DEC26 F3-ENG - Baraka"),
    note(FB, "DEC26 F3-ENG - Wanjiru"),
    note(FC, "DEC26 F3-MATHS - K1"), note(FC, "DEC26 F3-MATHS - K2"), note(FC, "DEC26 F3-MATHS - K3"),
    note(FC, "DEC26 F3-MATHS - K4"), note(FC, "DEC26 F3-MATHS - K5"), note(FC, "DEC26 F3-MATHS - K6"),
    note(FD, "DEC26 G8-SCI - Zuri"),
  ];
  const enrolments = [
    { id: "e-amani", program_id: program.id, student_id: "login-a", student_profile_id: "kid-amani", enrolled_class_ids: [ENG.id], payment_status: "pending", total_amount: 4000 },
    { id: "e-baraka", program_id: program.id, student_id: "login-c", student_profile_id: "kid-baraka", enrolled_class_ids: [ENG.id], payment_status: "completed", total_amount: 4000 },
  ];
  const kids = [{ id: "kid-amani", full_name: "Amani" }, { id: "kid-baraka", full_name: "Baraka" }];

  const tableRows = (table) => ({
    intensive_programs: () => [program],
    intensive_classes: () => classes,
    lead_activities: () => notes,
    intensive_enrollments: () => enrolments,
    students: () => kids,
    tutor_profiles: () => [{ id: "tp1", user_id: "u1" }],
    profiles: () => [{ id: "u1", full_name: "Jane Tutor" }],
    payments: () => [],
  }[table] || (() => []))();

  const matches = (row, key, value) => {
    const m = /^(eq|neq|in|cs)\.(.*)$/.exec(value);
    if (!m) return true;
    const [, op, arg] = m;
    // `cs` is "contains", what .contains("enrolled_class_ids", [id]) sends: enrolled_class_ids=cs.{id}
    if (op === "cs") return Array.isArray(row[key]) && row[key].includes(arg.replace(/^\{|\}$/g, "").replace(/"/g, ""));
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
    return rows;
  };

  const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS", "access-control-expose-headers": "*" };
  const reply = (route, status, body) => route.fulfill({ status, contentType: "application/json", headers: CORS, body: body === undefined ? "" : JSON.stringify(body) });
  const session = { access_token: "aaa.bbb.ccc", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 30 * 86400, refresh_token: "r", user: { id: ADMIN, aud: "authenticated", role: "authenticated", email: "admin@example.test", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" } };

  await page.route(`${SUPA}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const wantsBody = (req.headers()["prefer"] || "").includes("return=representation");
    try {
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      if (path.startsWith("/auth/v1/")) return reply(route, 200, path.endsWith("/user") ? session.user : session);
      if (path === "/functions/v1/enrol-december-family") {
        const body = JSON.parse(req.postData());
        requests.push({ what: "enrol", body });
        const wanjiru = { id: "e-wanjiru", program_id: program.id, student_id: "login-new", student_profile_id: "kid-wanjiru", enrolled_class_ids: body.classIds, payment_status: "pending", total_amount: body.feePerSubject * body.classIds.length };
        enrolments.push(wanjiru);
        kids.push({ id: "kid-wanjiru", full_name: body.childName });
        FAMILIES[FB].parent_profile_id = "login-new";
        return reply(route, 200, { success: true, enrollmentId: "e-wanjiru", loginId: "login-new", childId: "kid-wanjiru", loginCreated: true, emailIsPlaceholder: true, alreadyEnrolled: false, replaced: false, totalAmount: wanjiru.total_amount });
      }
      if (path.startsWith("/functions/v1/")) return reply(route, 200, {});
      if (path.startsWith("/rest/v1/rpc/")) {
        const name = path.split("/").pop();
        if (name === "has_role") return reply(route, 200, true);
        if (name === "crm_team_members") return reply(route, 200, [{ user_id: ADMIN, full_name: "Test Admin" }]);
        return reply(route, 404, { message: "unknown rpc " + name });
      }
      if (path.startsWith("/rest/v1/")) {
        const table = path.split("/").pop();
        const rows = query(table, url.searchParams);
        if (req.method() === "GET") return reply(route, 200, rows);
        const body = req.postData() ? JSON.parse(req.postData()) : null;
        if (req.method() === "PATCH") {
          requests.push({ what: `patch ${table}`, query: url.search, body });
          rows.forEach((r) => Object.assign(r, body));
          return wantsBody ? reply(route, 200, rows) : reply(route, 204);
        }
        if (req.method() === "DELETE") {
          requests.push({ what: `delete ${table}`, query: url.search });
          if (table === "intensive_enrollments") for (const r of rows) enrolments.splice(enrolments.indexOf(r), 1);
          return wantsBody ? reply(route, 200, rows) : reply(route, 204);
        }
        return reply(route, 201);
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

  const shot = (name) => page.screenshot({ path: `${OUT}/actions-${name}-${WIDTH}.png`, fullPage: true });
  const visible = async (locator, name, timeout = 8000) => {
    try { await locator.first().waitFor({ state: "visible", timeout }); check(name, true); return true; } catch (e) { check(name, false, e.message.split("\n")[0]); return false; }
  };
  const card = (code) => page.locator(`[data-class-code="${code}"]`);
  const text = async (locator) => ((await locator.first().textContent()) || "").replace(/\s+/g, " ");
  const noOverflow = async (label) => {
    const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`${label}: no sideways scrolling at ${WIDTH}px`, wide <= 1, `${wide}px wider than the window`);
  };

  // A long run can lose its page at random (a Playwright MCP quirk): keep what was checked so far and say where it stopped.
  try {
    // ------------------------------------------------------------ 1. The desk with a running class
    await page.goto(`${BASE}/admin/december`);
    await visible(card("F3-ENG"), "Desk: the Form 3 English card is there");
    const eng = await text(card("F3-ENG"));
    check("Desk: English is Running with 3 reserved, 2 enrolled, 1 paid", /Running/.test(eng) && /Reserved 3 · Enrolled 2 · Paid 1/.test(eng), eng);
    check("Desk: the tutor is named", /Tutor: Jane Tutor/.test(eng), eng);
    await visible(card("F3-ENG").getByRole("button", { name: "Enrol Wanjiru" }), "Desk: the reserved child has Enrol");
    await visible(card("F3-ENG").getByRole("button", { name: "Record paybill for Amani" }), "Desk: the unpaid child has Record paybill");
    await visible(card("F3-ENG").getByRole("button", { name: "Class links for Baraka" }), "Desk: the paid child has Class links");
    const mathsText = await text(card("F3-MATHS"));
    check("Desk: Mathematics is ready to open", /Ready to open/.test(mathsText), mathsText);
    check("Desk: Back to reserving is disabled while English has enrolments", await card("F3-ENG").getByRole("button", { name: /Back to reserving/ }).isDisabled());
    check("Desk: Archive is disabled while English has enrolments", await card("F3-ENG").getByRole("button", { name: /Archive class/ }).isDisabled());
    await noOverflow("Desk");
    await shot("1-desk");

    // ------------------------------------------------------------ 2. Enrol the reserved child
    await card("F3-ENG").getByRole("button", { name: "Enrol Wanjiru" }).click();
    const enrolDialog = page.getByRole("dialog");
    await visible(enrolDialog.getByText("Enrol Wanjiru"), "Enrol: the dialog opens");
    check("Enrol: the parent is filled in", (await enrolDialog.locator("#enrol-parent").inputValue()) === "Mrs Beta");
    check("Enrol: English is ticked", await enrolDialog.getByRole("checkbox", { name: "Form 3 English" }).isChecked());
    await visible(enrolDialog.getByText(/With no email the confirmation/), "Enrol: it warns about no email");
    check("Enrol: the fee starts at 4000", (await enrolDialog.locator("#enrol-fee").inputValue()) === "4000");
    await shot("2-enrol-dialog");
    await enrolDialog.getByRole("button", { name: "Enrol", exact: true }).click();
    const enrolRequest = await (async () => { for (let i = 0; i < 40; i++) { const r = requests.find((x) => x.what === "enrol"); if (r) return r; await page.waitForTimeout(100); } return null; })();
    check("Enrol: the request names the family, child, class and fee", enrolRequest && enrolRequest.body.familyId === FB && enrolRequest.body.childName === "Wanjiru" && enrolRequest.body.classIds.length === 1 && enrolRequest.body.classIds[0] === ENG.id && enrolRequest.body.feePerSubject === 4000, JSON.stringify(enrolRequest));
    const payDialog = page.getByRole("dialog");
    await visible(payDialog.getByText("Payment message for Wanjiru"), "Enrol: the payment message opens");
    const payText = await payDialog.getByLabel("Message").inputValue();
    check("Enrol: the message has the amount, the pay-by day and the paybill", /KES 4,000 by Friday 4 December/.test(payText) && /Monday 7 December/.test(payText) && /Paybill/.test(payText), payText);
    check("Enrol: it can be opened in WhatsApp at the family's number", ((await payDialog.getByRole("link", { name: "Open in WhatsApp" }).getAttribute("href")) || "").startsWith("https://wa.me/254712000002?text="));
    await visible(page.getByText(/no usable email/), "Enrol: it warns that the family has no usable email");
    await shot("3-payment-message");
    await payDialog.getByRole("button", { name: "Done" }).click();
    await page.waitForTimeout(400);
    check("Enrol: the row now says Enrolled, unpaid", /Enrolled, unpaid/.test(await text(card("F3-ENG").locator("li", { hasText: "Wanjiru" }))));

    // ------------------------------------------------------------ 3. Open a class
    await card("F3-MATHS").getByRole("button", { name: /Open class/ }).click();
    const openDialog = page.getByRole("alertdialog");
    await visible(openDialog.getByText(/Open Form 3 Mathematics\?/), "Open: it asks first");
    await visible(openDialog.getByText(/It has no tutor yet/), "Open: it warns there is no tutor");
    await openDialog.getByRole("button", { name: "Open class" }).click();
    await visible(page.getByText("Class opened"), "Open: saying so");
    await page.waitForTimeout(400);
    const opened = requests.find((r) => r.what === "patch intensive_classes" && r.body.status === "confirmed");
    check("Open: the class was set to confirmed", opened && opened.query.includes(`id=eq.${MATHS.id}`), JSON.stringify(opened));
    check("Open: the card now says Running", /Running/.test(await text(card("F3-MATHS"))));

    // ------------------------------------------------------------ 4. Archive a class, read its not-running message
    await card("G8-SCI").getByRole("button", { name: /Archive class/ }).click();
    await visible(page.getByRole("alertdialog").getByText(/Archive Grade 8 Integrated Science\?/), "Archive: it asks first");
    await page.getByRole("alertdialog").getByRole("button", { name: "Archive class" }).click();
    await visible(page.getByText("Class archived"), "Archive: saying so");
    await page.waitForTimeout(400);
    check("Archive: the card now says Archived", /Archived/.test(await text(card("G8-SCI"))));
    await card("G8-SCI").getByRole("button", { name: "Message Zuri" }).click();
    const notRunning = page.getByRole("dialog");
    await visible(notRunning.getByText("Not-running message for Zuri"), "Archive: the not-running message opens");
    check("Archive: it says nothing has been charged and offers the call", /nothing has been charged/.test(await notRunning.getByLabel("Message").inputValue()) && /book-consultation/.test(await notRunning.getByLabel("Message").inputValue()));
    await shot("4-not-running");
    await notRunning.getByRole("button", { name: "Done" }).click();

    // ------------------------------------------------------------ 5. Record paybill, then release a seat
    await card("F3-ENG").getByRole("button", { name: "Record paybill for Amani" }).click();
    await visible(page.getByRole("dialog").getByText("Record a paybill payment"), "Paybill: the existing dialog opens for the enrolment");
    await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
    await card("F3-ENG").getByRole("button", { name: "Release seat of Amani" }).click();
    await visible(page.getByRole("alertdialog").getByText(/Release Amani's seats\?/), "Release: it asks first");
    await page.getByRole("alertdialog").getByRole("button", { name: "Release seats" }).click();
    await visible(page.getByText("Seats released"), "Release: saying so");
    await page.waitForTimeout(400);
    const released = requests.find((r) => r.what === "delete intensive_enrollments");
    check("Release: the delete is for that enrolment and only while it is pending", released && released.query.includes("id=eq.e-amani") && released.query.includes("payment_status=eq.pending"), JSON.stringify(released));
    check("Release: Amani is back to reserved", await card("F3-ENG").getByRole("button", { name: "Enrol Amani" }).isVisible());
    await noOverflow("Desk after the actions");
  } catch (e) {
    errors.push("stopped early: " + e.message.split("\n")[0]);
  }

  return { width: WIDTH, results, failed: results.filter((r) => !r.ok), errors };
}
