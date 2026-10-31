# Keep Lana Answering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lana gives the person a useful reply within about 40 seconds of her pause even when her AI is down, and the team hears about every failure straight away instead of two weeks later.

**Architecture:** `callAI` gets one time limit for its whole conversation and can no longer throw. If it fails, a second AI (Claude, a plain `fetch`, no tools) gets one try. If that fails too, the backup message goes out as it does today. A WhatsApp refusal, a used fallback and an unexpected crash each email the team.

**Tech Stack:** As PR #11: one Deno edge function (`whatsapp-webhook`), tested under Node with `supabase/functions/_tests/harness.mjs`.

**Context:** There is no separate spec; this is a small change. On 2026-10-31 the owner worried about the Gemini key and its free tier, asked how Lana can always answer, and chose Claude as the second AI. The decisions below are the plan's own calls for the owner to check.

**Boundaries:** Local branch `claude/lana-keep-answering`, cut from `claude/whatsapp-bot-fix` (PR #11, `cc8573d`). No push, no PR, no deploy, no secret set, and no call to the real Anthropic API from any task. Baseline at `cc8573d`: 40 tests pass in about 3 seconds (checked 2026-10-31 in this worktree; its `node_modules` is a symlink to the `whatsapp-bot-fix` worktree's).

## Calls this plan makes

1. **Claude is called with a plain `fetch` to `/v1/messages`, not the SDK.** Every other outside call in this function is a plain `fetch`. The webhook cannot be run under Deno on this machine, and a bad SDK import would take the whole webhook down, the opposite of this change. One POST needs no SDK.
2. **Model `claude-haiku-5-5`.** It is fast and cheap: about $0.10 per million input tokens, so a reply costs a fraction of a cent. The secret `WHATSAPP_FALLBACK_MODEL` changes it. `claude-opus-5-5` would write the best replies but is slower and about 40 times the price, still only cents a month at this volume. Haiku needs no extra beta settings.
3. **Request shape from the current API docs:** header `anthropic-version: 2026-10-21`; no `temperature`, `top_p` or `top_k` (that version rejects them); no `thinking` setting; `output_config.effort: "low"`; `max_tokens: 1024` to leave room for the little thinking Haiku does by default.
4. **The second AI gets the same system prompt and chat, but no tools.** So no `escalate_to_team` email and no `get_booking_link`. The prompt already holds the links, and the chat still goes to the team and the lead is flagged.
5. **Time limits:** the first AI gets 20 seconds for its whole conversation (today it is 25 seconds per request, up to four requests). The second AI gets 15. Worst case is about 40 seconds after Lana's pause, then the backup. All three are settings.
6. **A crash emails the team and sends nothing.** I first proposed a last-resort backup message. A blind backup from a catch block risks answering twice or answering a chat the team has taken, and a lead Lana had already taken is flagged "needs reply" anyway.
7. **When Meta refuses a send,** the chat stays with the team (Lana took it before sending), the reply is not recorded as sent, and the team is emailed Meta's error.
8. **The second AI's replies are marked `via: "ai_fallback"`,** so they can be counted apart from `ai`. The inbox shows them as "Lana (AI)".
9. **Privacy:** parents' words go to Anthropic only when the first AI fails. They already go to Google through the Lovable gateway. Worth a line in the privacy notice if it names AI providers.

## Global Constraints

- Edge function changes go live only on a Lovable deploy. There is no Deno here; tests run under Node with `npm run test:edge`. The 40 existing tests stay green and unedited.
- With `ANTHROPIC_API_KEY` unset, behaviour is PR #11's, apart from the time limit and the new alerts.
- An alert never delays a reply: it is sent after the reply, and an alert that fails is logged and ignored (the existing pattern).
- The Claude key is read from `ANTHROPIC_API_KEY`. It is never logged and never in an email.
- The reply text still goes through `sanitizeReply`, whichever AI wrote it.

## Review Focus

1. Both AIs fail or time out: the backup still goes out, and one alert names both reasons. (Task 2)
2. The gateway answers 200 with something unreadable, such as a number where the text should be: a reported failure, not a silent crash. (Task 1)
3. The first AI is slow: Lana does not wait past the limit, and its late answer is never sent after the second AI has answered. (Tasks 1 and 2)
4. The chat is awkward for Claude (starts with a team message, two messages in a row from one side): the request is still well formed. (Task 2)
5. WhatsApp refuses the send: the reply is not recorded as sent, the chat stays with the team, the team is emailed. (Task 3)

## File Structure

- Create: `supabase/functions/whatsapp-webhook/claude.ts`: pure (no Deno, no network). Message reshaping and response reading for Claude.
- Modify: `supabase/functions/whatsapp-webhook/index.ts`, `supabase/functions/_tests/harness.mjs`, `supabase/functions/_tests/whatsapp-webhook.test.mjs`.

New tests go at the end of `whatsapp-webhook.test.mjs` and reuse its `PARENT`, `PARENT_MESSAGE`, `start(t, options)` and `inbound`. Add `claudeFailure, claudeRefusal, claudeText` to its harness import, and this once:

```js
const claudeKey = { ANTHROPIC_API_KEY: "sk-ant-test" };
```

Node 25 prints `ℹ pass 40` rather than TAP. Run a subset with `node --test --test-name-pattern "<words>" supabase/functions/_tests/whatsapp-webhook.test.mjs`.

---

### Task 1: One time limit for the AI step, and an AI step that cannot throw

**Files:**
- Modify: `supabase/functions/whatsapp-webhook/index.ts`, `supabase/functions/_tests/harness.mjs`, `supabase/functions/_tests/whatsapp-webhook.test.mjs`

**Interfaces:**
- Setting `WHATSAPP_AI_BUDGET_MS` (default `20000`) replaces the constant `AI_TIMEOUT_MS`. `callAI(history, profileName, parentId, phone): Promise<AiResult>` keeps its signature. It takes `deadline = Date.now() + AI_BUDGET_MS` once; every gateway request uses `AbortSignal.timeout(deadline - Date.now())`; an expired deadline ends the loop as a failure. The reason keeps the wording "timed out after N seconds", N being the budget.
- The whole body of `callAI` is wrapped: any exception becomes `{ ok: false, reason: "The AI gateway sent a reply Lana could not read: <detail>" }`.
- Harness: a gateway response with `delayMs` rejects with `init.signal.reason` as soon as the request's signal aborts.
- `AiResult` becomes `{ ok: true; text: string; via: "ai" | "ai_fallback"; model: string } | { ok: false; reason: string }`. `callAI` returns `via: "ai"` and `model: AI_MODEL`. The caller uses `ai.via` instead of the literal `"ai"`.

- [ ] **Step 1: Write the failing tests.**

```js
// ---------------- Keeping Lana answering ----------------

test("a gateway that answers too slowly is cut off at the time limit, and the backup goes out", async (t) => {
  const fn = await start(t, { env: { WHATSAPP_AI_BUDGET_MS: "60" }, gateway: [{ ...aiText("TOO LATE"), delayMs: 400 }] });
  await fn.post(inbound({ from: PARENT, text: PARENT_MESSAGE }));
  assert.equal(fn.world.sent.length, 1);
  assert.match(fn.world.sent[0].text, /are you a parent or student/i);
  assert.match(fn.world.emails[0].html, /timed out/i);
  assert.equal(fn.world.conversation(PARENT).messages.at(-1).via, "backup");
});

for (const [name, body] of [
  ["a number where the text should be", { choices: [{ message: { role: "assistant", content: 42 } }] }],
  ["no choices at all", {}],
]) {
  test(`a gateway reply with ${name} is a reported failure, not a silent crash`, async (t) => {
    const fn = await start(t, { gateway: [{ status: 200, body }] });
    await fn.post(inbound({ from: PARENT, text: PARENT_MESSAGE }));
    assert.match(fn.world.sent[0].text, /are you a parent or student/i);
    assert.equal(fn.world.emails.length, 1);
  });
}
```

- [ ] **Step 2: Run them and see them fail.** `npm run test:edge -- --test-name-pattern "cut off|reported failure"`. Expected: the slow-gateway test and the number test FAIL (nothing sent); the no-choices test already passes.
- [ ] **Step 3: Implement** to the interfaces above. Rename the setting, thread the deadline through the tool rounds, wrap the body, extend `AiResult`.
- [ ] **Step 4: Run the whole suite.** `npm run test:edge`. Expected: 43 pass, 0 fail. The older "a timeout calling the AI is reported as a timeout" test passes unedited.
- [ ] **Step 5: Commit.** `git add supabase/functions && git commit -m "Keep Lana answering: one time limit for the AI step, and no crash on an unreadable reply"`

---

### Task 2: A second AI (Claude) when the first fails

**Files:**
- Create: `supabase/functions/whatsapp-webhook/claude.ts`
- Modify: `supabase/functions/whatsapp-webhook/index.ts`, `supabase/functions/_tests/harness.mjs`, `supabase/functions/_tests/whatsapp-webhook.test.mjs`

**Interfaces:**
- Settings: `ANTHROPIC_API_KEY` (unset means no second AI), `WHATSAPP_FALLBACK_MODEL` (default `claude-haiku-5-5`), `WHATSAPP_FALLBACK_BUDGET_MS` (default `15000`).
- `claude.ts`, pure:
  - `type ClaudeMessage = { role: "user" | "assistant"; content: string }`
  - `toClaudeMessages(history: { role: "user" | "model"; content: string }[]): ClaudeMessage[]`: `model` becomes `assistant`; blank messages are dropped; consecutive messages from one side are joined with a blank line; leading `assistant` messages are dropped (the first message must be `user`); trailing `assistant` messages are dropped (a prefill is rejected).
  - `readClaudeReply(status: number, body: unknown): { ok: true; text: string } | { ok: false; reason: string }`: for a non-2xx status the reason carries the status, the error type and message, and `request_id` when present. For a 2xx, `stop_reason: "refusal"` is a failure; otherwise the `text` blocks are joined and trimmed (read blocks by `type`, since a `thinking` block can come first); no text is a failure that names the `stop_reason`.
- `index.ts`:
  - `systemPrompt(profileName, parentId): string`, extracted from `callAI` (the prompt plus the WhatsApp-name and linked-account lines), used by both AIs.
  - `callClaude(history, profileName, parentId): Promise<AiResult>`: POST `https://api.anthropic.com/v1/messages` with headers `x-api-key`, `anthropic-version: 2026-10-21`, `content-type: application/json` and body `{ model, max_tokens: 1024, system, messages, output_config: { effort: "low" } }`, where `system` is `systemPrompt(...)` plus a note beginning "Tools are not available for this reply." that says to use the links written in the prompt and, for a complaint or payment problem, to say a person from the team will call them back. Signal `AbortSignal.timeout(FALLBACK_BUDGET_MS)`. It never throws. Success is `{ ok: true, text, via: "ai_fallback", model }`.
  - In `handleIncoming`: when `callAI` fails and `ANTHROPIC_API_KEY` is set, call `callClaude`. If that fails too, the failure reason is "<first reason>. The second AI also failed: <second reason>", so the existing backup path and `alertAiFailure` carry both. When the second AI answered, send its text through `sanitizeReply`, then call `alertFallbackUsed`.
  - Alerts: factor the HTML in `alertAiFailure` into `sendAlert(args: { subject: string; heading: string; accent: string; facts: [string, string][]; notes: string[]; history: Msg[] }): Promise<void>` (escape every value with `escapeHtml`; keep the missing-`RESEND_API_KEY` and failed-send handling). `alertAiFailure` becomes a thin caller with its present subject and wording. `alertFallbackUsed(args: { phone: string; profileName?: string; parentId: string | null; reason: string; history: Msg[] })` has subject `WhatsApp: Lana used her fallback AI — <name or phone>`, the first AI's reason, the line "The person got a reply. Please check the Lovable AI gateway (credits and status).", and the transcript.
- Harness: `loadFunction(..., { anthropic: [...] })` is a queue like `gateway`; `world.anthropicCalls` records `{ headers, body }`; a fake for `https://api.anthropic.com/v1/messages` answers 500 `{ type: "error", error: { type: "api_error", message: "no scripted Claude response left" } }` when the queue is empty, honours `delayMs`, `throws` and the request signal like the gateway fake. Exports `claudeText(text)` (status 200, one `text` block, `stop_reason: "end_turn"`), `claudeFailure(status, message)` (an `{ type: "error", error: { type, message }, request_id }` body) and `claudeRefusal()` (status 200, no content, `stop_reason: "refusal"`).

- [ ] **Step 1: Write the failing tests.**

```js
test("when the first AI fails, Claude answers, the reply is marked as the fallback's, and the team is told why", async (t) => {
  const reply = "Happy to help with Grade 6 maths. Would you like a call from our Learning Coordinator?";
  const fn = await start(t, { env: claudeKey, gateway: [aiFailure(402, "Not enough credits")], anthropic: [claudeText(reply)] });
  await fn.post(inbound({ from: PARENT, name: "Amina", text: PARENT_MESSAGE }));
  assert.deepEqual(fn.world.sent.map((m) => m.text), [reply]);
  const saved = fn.world.conversation(PARENT);
  assert.deepEqual([saved.escalated, saved.messages.at(-1).via], [true, "ai_fallback"]);
  assert.equal(fn.world.emails.length, 1);
  assert.match(fn.world.emails[0].subject, /fallback AI/i);
  assert.match(fn.world.emails[0].html, /402/);
  assert.match(fn.world.emails[0].html, /Not enough credits/);
});

test("the request to Claude is well formed", async (t) => {
  const fn = await start(t, { env: claudeKey, gateway: [aiFailure(500)], anthropic: [claudeText("Happy to help.")] });
  await fn.post(inbound({ from: PARENT, text: PARENT_MESSAGE }));
  const { headers, body } = fn.world.anthropicCalls[0];
  assert.equal(headers["x-api-key"], "sk-ant-test");
  assert.equal(headers["anthropic-version"], "2026-10-21");
  assert.equal(body.model, "claude-haiku-5-5");
  assert.deepEqual(body.output_config, { effort: "low" });
  for (const field of ["tools", "temperature", "top_p", "top_k", "thinking"]) assert.equal(field in body, false, field);
  assert.match(body.system, /Learning Coordinator/);
  assert.match(body.system, /Tools are not available/);
  assert.equal(body.messages.at(-1).role, "user");
});

test("the chat is reshaped for Claude: user first, never two in a row from one side", async (t) => {
  const fn = await start(t, {
    env: claudeKey, gateway: [aiFailure(500)], anthropic: [claudeText("Happy to help.")],
    conversations: [{ phone_number: PARENT, escalated: false, messages: [
      { role: "model", content: "Hello, this is Wanjiru from the team.", ts: "2026-10-30T08:00:00.000Z", sent_by: "human" },
      { role: "user", content: "Hi, I saw your ad", ts: "2026-10-30T08:01:00.000Z" },
      { role: "model", content: "Great, what grade is he in?", ts: "2026-10-30T08:02:00.000Z", sent_by: "human" },
      { role: "user", content: "Grade 6", ts: "2026-10-30T08:03:00.000Z" },
    ] }],
  });
  await fn.post(inbound({ from: PARENT, text: "Please call me" }));
  const { messages } = fn.world.anthropicCalls[0].body;
  assert.deepEqual(messages.map((m) => m.role), ["user", "assistant", "user"]);
  assert.match(messages[0].content, /Hi, I saw your ad/);
  assert.match(messages[2].content, /Grade 6\n\nPlease call me/);
});

test("a slow first AI hands over to Claude, and its late answer is never sent", async (t) => {
  const fn = await start(t, {
    env: { ...claudeKey, WHATSAPP_AI_BUDGET_MS: "60" },
    gateway: [{ ...aiText("TOO LATE"), delayMs: 400 }], anthropic: [claudeText("Happy to help.")],
  });
  await fn.post(inbound({ from: PARENT, text: PARENT_MESSAGE }));
  assert.deepEqual(fn.world.sent.map((m) => m.text), ["Happy to help."]);
  assert.equal(fn.world.conversation(PARENT).messages.at(-1).via, "ai_fallback");
});

test("when Claude fails too, the backup goes out and one alert names both failures", async (t) => {
  const fn = await start(t, { env: claudeKey, gateway: [aiFailure(402, "Not enough credits")], anthropic: [claudeFailure(529, "Overloaded")] });
  await fn.post(inbound({ from: PARENT, text: PARENT_MESSAGE }));
  assert.match(fn.world.sent[0].text, /are you a parent or student/i);
  assert.equal(fn.world.conversation(PARENT).messages.at(-1).via, "backup");
  assert.equal(fn.world.emails.length, 1);
  for (const word of [/402/, /Not enough credits/, /529/, /Overloaded/]) assert.match(fn.world.emails[0].html, word);
});

for (const [name, response] of [["declining", claudeRefusal()], ["answering with no text", claudeText("")]]) {
  test(`Claude ${name} counts as a failure: the backup goes out`, async (t) => {
    const fn = await start(t, { env: claudeKey, gateway: [aiFailure(500)], anthropic: [response] });
    await fn.post(inbound({ from: PARENT, text: PARENT_MESSAGE }));
    assert.equal(fn.world.conversation(PARENT).messages.at(-1).via, "backup");
  });
}

test("Claude taking too long is cut off at its own limit", async (t) => {
  const fn = await start(t, { env: { ...claudeKey, WHATSAPP_FALLBACK_BUDGET_MS: "60" }, gateway: [aiFailure(500)], anthropic: [{ ...claudeText("TOO LATE"), delayMs: 400 }] });
  await fn.post(inbound({ from: PARENT, text: PARENT_MESSAGE }));
  assert.equal(fn.world.conversation(PARENT).messages.at(-1).via, "backup");
});

test("Claude is not asked when the first AI worked", async (t) => {
  const fn = await start(t, { env: claudeKey, gateway: [aiText("Happy to help.")] });
  await fn.post(inbound({ from: PARENT, text: PARENT_MESSAGE }));
  assert.equal(fn.world.anthropicCalls.length, 0);
  assert.equal(fn.world.emails.length, 0);
});

test("with no key, a failing first AI goes straight to the backup and Claude is never called", async (t) => {
  const fn = await start(t, { gateway: [aiFailure(500)] });
  await fn.post(inbound({ from: PARENT, text: PARENT_MESSAGE }));
  assert.equal(fn.world.anthropicCalls.length, 0);
  assert.equal(fn.world.conversation(PARENT).messages.at(-1).via, "backup");
});

test("Claude's reply gets the same tutor-link check, and the key is never in an email or a log", async (t) => {
  const fn = await start(t, { env: claudeKey, gateway: [aiFailure(500)], anthropic: [claudeText("Try https://lanatutors.africa/tutor/abc123, she is great.")] });
  await fn.post(inbound({ from: PARENT, text: PARENT_MESSAGE }));
  assert.doesNotMatch(fn.world.sent[0].text, /lanatutors\.africa\/tutor\//);
  assert.match(fn.world.sent[0].text, /Learning Coordinator/);
  const everything = JSON.stringify(fn.world.emails) + fn.world.logs.map((l) => l.text).join("\n");
  assert.doesNotMatch(everything, /sk-ant-test/);
});
```

- [ ] **Step 2: Run them and see them fail.** `npm run test:edge`. Expected: the new Claude tests FAIL (`claudeText` is not exported; no second AI); older tests pass.
- [ ] **Step 3: Implement** the harness additions, then `claude.ts`, then the `index.ts` changes, to the interfaces above.
- [ ] **Step 4: Run the whole suite.** `npm run test:edge`. Expected: all pass, the 40 older tests unedited.
- [ ] **Step 5: Commit.** `git add supabase/functions && git commit -m "Keep Lana answering: Claude answers when the first AI fails"`

---

### Task 3: Tell the team when WhatsApp refuses a send, or when Lana crashes

**Files:**
- Modify: `supabase/functions/whatsapp-webhook/index.ts`, `supabase/functions/_tests/harness.mjs`, `supabase/functions/_tests/whatsapp-webhook.test.mjs`

**Interfaces:**
- `sendWhatsAppMessage(to: string, text: string): Promise<{ ok: true } | { ok: false; error: string }>`: `ok` when the HTTP status is 2xx. `error` is Meta's `error.message` with its `code` (or the exception's message). It never throws, and it keeps stripping sign-offs as it does now.
- The three send sites (opt-out confirmation, attachment notice, main answer) check the result. On `ok: false` they call `alertSendFailed` and return before logging or saving the reply as sent. The main answer's chat is already taken, so it stays flagged for the team.
- `alertSendFailed(args: { phone: string; profileName?: string; parentId: string | null; error: string; history: Msg[] })`, through `sendAlert`: subject `⚠️ WhatsApp: Meta refused Lana's reply — <name or phone>`; the error; and the hint "If it says the access token is invalid or expired, create a permanent token (a System User) in Meta Business Settings and update the WHATSAPP_ACCESS_TOKEN secret."
- `alertCrash(args: { phone?: string; profileName?: string; text?: string; error: unknown })`, through `sendAlert`: subject `⚠️ WhatsApp: Lana hit an unexpected error`; the error message and the first lines of its stack; the phone, name and message if known; the line "A reply may or may not have gone out. Please check the chat in the WhatsApp inbox." `handleIncoming` hoists `phone`, `profileName` and `text` above its `try` so the `catch` can pass them. The `catch` calls `alertCrash` and sends nothing.
- Harness: `loadFunction(..., { meta: [...] })` is a queue of outcomes consumed one per WhatsApp send: `{ status, body }` or `{ throws }`; empty means success. `world.sent` records only sends that succeeded.

- [ ] **Step 1: Write the failing tests.**

```js
const META_REFUSAL = { status: 401, body: { error: { message: "Invalid OAuth access token.", code: 190 } } };

test("when Meta refuses the reply, the team is emailed Meta's error, nothing is recorded as sent, and the chat stays with the team", async (t) => {
  const fn = await start(t, { gateway: [aiText("Happy to help.")], meta: [META_REFUSAL] });
  await fn.post(inbound({ from: PARENT, text: "Do you teach on Saturdays?" }));
  assert.deepEqual(fn.world.sent, []);
  const saved = fn.world.conversation(PARENT);
  assert.equal(saved.escalated, true);
  assert.equal(saved.messages.filter((m) => m.role === "model").length, 0);
  assert.equal(fn.world.emails.length, 1);
  assert.match(fn.world.emails[0].subject, /Meta refused/i);
  assert.match(fn.world.emails[0].html, /Invalid OAuth access token/);
  assert.match(fn.world.emails[0].html, /WHATSAPP_ACCESS_TOKEN/);
});

test("a network failure sending the reply is reported the same way", async (t) => {
  const fn = await start(t, { gateway: [aiText("Happy to help.")], meta: [{ throws: new Error("fetch failed") }] });
  await fn.post(inbound({ from: PARENT, text: "Do you teach on Saturdays?" }));
  assert.equal(fn.world.emails.length, 1);
  assert.match(fn.world.emails[0].html, /fetch failed/);
});

for (const [name, message] of [
  ["request to type", () => inbound({ from: PARENT, type: "audio", audio: { id: "m1", voice: true } })],
  ["stop confirmation", () => inbound({ from: PARENT, text: "Stop" })],
]) {
  test(`a refused ${name} is reported to the team too`, async (t) => {
    const fn = await start(t, { meta: [META_REFUSAL] });
    await fn.post(message());
    assert.deepEqual(fn.world.sent, []);
    assert.equal(fn.world.emails.length, 1);
    assert.match(fn.world.emails[0].subject, /Meta refused/i);
  });
}

test("an unexpected crash emails the team what it knows, and sends nothing", async (t) => {
  const fn = await start(t, { gateway: [aiText("NEVER SENT")] });
  await fn.deliver(inbound({ from: PARENT, name: "Amina", text: "Do you teach on Saturdays?" }));
  // Lana is waiting for follow-ups; her next write is taking the chat. Make that write blow up.
  fn.world.beforeNextUpdate = () => { throw new Error("database exploded"); };
  await fn.settle();
  assert.deepEqual(fn.world.sent, []);
  assert.equal(fn.world.emails.length, 1);
  assert.match(fn.world.emails[0].subject, /unexpected error/i);
  for (const word of [/database exploded/, /Do you teach on Saturdays/, /Amina/, new RegExp(PARENT)]) {
    assert.match(fn.world.emails[0].html, word);
  }
});
```

- [ ] **Step 2: Run them and see them fail.** `npm run test:edge`. Expected: the new tests FAIL (a refused send is recorded as sent and nobody is told; a crash is only logged); the older 40 pass.
- [ ] **Step 3: Implement** the harness queue, then `sendWhatsAppMessage`, the three send sites, `alertSendFailed`, `alertCrash` and the hoisting, to the interfaces above.
- [ ] **Step 4: Run the whole suite.** `npm run test:edge`. Expected: all pass, the 40 older tests unedited.
- [ ] **Step 5: Commit.** `git add supabase/functions && git commit -m "Keep Lana answering: tell the team when WhatsApp refuses a send or Lana crashes"`

---

### Task 4: Final checks

- [ ] **Step 1: Full run.** `npm run test:edge` passes; `npm run lint` shows no new errors against its output at `cc8573d` (record that output first, from the `whatsapp-bot-fix` worktree if needed).
- [ ] **Step 2: Strict type-check without Deno.** In the scratchpad (not the repo) make a tsconfig with `strict`, `noEmit`, `allowImportingTsExtensions`, `moduleResolution: "Bundler"`, `lib: ["ES2023", "DOM"]`, `types: []`, and `paths` mapping `https://esm.sh/@supabase/supabase-js@2.45.0` to the repo's `node_modules/@supabase/supabase-js` and `https://deno.land/std@0.190.0/http/server.ts` to a one-line `serve` declaration. Add a file declaring `Deno` (`env.get(key: string): string | undefined`). Include `whatsapp-webhook/index.ts`. Run `npx tsc -p <that tsconfig>`: no errors. Prove it checks something with a deliberate type error, and confirm with `--listFiles` that `index.ts` and `claude.ts` are covered. This is not `deno check`.
- [ ] **Step 3: The CRM trigger check does not need a re-run.** The only new write path is "chat taken, reply not saved" after a refused send, which the existing scenario F already replays. Say so in the report.
- [ ] **Step 4: Report** what was and was not verified: the live gateway, Meta and the real Anthropic API are faked; nothing was deployed.

---

## Rollout (needs the owner, in this order)

None of this is done by the tasks above.

1. Merge and deploy PR #11 (this branch builds on it). This is the biggest protection and does not need to wait for this work.
2. Create an Anthropic API key in the Anthropic Console, add a small amount of credit (a few dollars lasts a long time at this volume) and set a monthly spend limit. Add the key to the edge function secrets in Lovable as `ANTHROPIC_API_KEY`. Enter it only in that form, never in chat. Optional: `WHATSAPP_FALLBACK_MODEL`.
3. Merge this branch and deploy `whatsapp-webhook` through Lovable.
4. Test the fallback safely, with no outage needed: set the secret `WHATSAPP_AI_MODEL` to a name that does not exist (for example `not-a-model`), wait a minute for it to apply, and send a free-text message from a phone. Expected: a reply written by Claude, and an email "Lana used her fallback AI" that names the gateway's error. Then delete the `WHATSAPP_AI_MODEL` secret so Lana goes back to the default.
5. Afterwards, `via` values in `whatsapp_conversations.messages` show `ai_fallback` whenever the first AI failed and Claude answered, and `backup` only when both failed.

## Effects on the learning-loop plan

That plan (`docs/superpowers/plans/2026-10-31-lana-learning-loop-slice-1.md`, branch `claude/musing-cannon-8baee4`) edits `callAI` and the send path too. Build this one first, then merge this branch (or `main` after it merges) into the learning-loop branch before its Task 1. Three small consequences, already noted there: `lana_replies.model` is the `model` of the `AiResult` that answered; the second AI is offered no `record_need` tool, so its replies are recorded with kind `unknown`; and the inbox label treats `ai_fallback` like `ai`.
