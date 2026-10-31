// Test harness for the Supabase edge functions, which run on Deno.
//
// Deno isn't needed to test them: the function is bundled with esbuild, its two URL imports (the Deno
// `serve` and supabase-js) are swapped for fakes, and the only things faked are the boundaries, the
// network (Meta, the AI gateway, Claude, Resend) and the database. Everything else is the real handler code.
//
// The leading underscore keeps this folder out of the function deploy, like _shared.
import { build } from "esbuild";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const functionsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SERVE_MOCK = "export const serve = (handler) => { globalThis.__edgeHandler = handler; };";
const SUPABASE_MOCK = "export const createClient = () => globalThis.__fakeSupabase;";

const denoUrlImports = {
  name: "deno-url-imports",
  setup(b) {
    b.onResolve({ filter: /^https:\/\/deno\.land\/std@[^/]+\/http\/server\.ts$/ }, (a) => ({ path: a.path, namespace: "mock" }));
    b.onResolve({ filter: /^https:\/\/esm\.sh\/@supabase\/supabase-js@/ }, (a) => ({ path: a.path, namespace: "mock" }));
    b.onResolve({ filter: /^https?:\/\// }, (a) => ({ errors: [{ text: `URL import the test harness does not fake: ${a.path}` }] }));
    b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({
      contents: a.path.includes("deno.land") ? SERVE_MOCK : SUPABASE_MOCK,
      loader: "js",
    }));
  },
};

const clone = (value) => (value === undefined ? value : structuredClone(value));
const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
// Waits like a slow server, but gives up the moment the request is aborted, as a real fetch does.
const delay = (ms, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
  });

// The slice of the supabase-js query builder the functions use, over in-memory tables.
class Query {
  constructor(world, table) {
    this.world = world;
    this.table = table;
    this.filters = [];
    this.op = "select";
    this.sort = null;
    this.cap = null;
  }
  select() { return this; }
  insert(row) { this.op = "insert"; this.payload = row; return this; }
  update(patch) { this.op = "update"; this.payload = patch; return this; }
  upsert(row) { this.op = "upsert"; this.payload = row; return this; }
  eq(column, value) { this.filters.push((row) => row[column] === value); return this; }
  neq(column, value) { this.filters.push((row) => row[column] !== value); return this; }
  gte(column, value) { this.filters.push((row) => row[column] >= value); return this; }
  lte(column, value) { this.filters.push((row) => row[column] <= value); return this; }
  in(column, values) { this.filters.push((row) => values.includes(row[column])); return this; }
  order(column, { ascending = true } = {}) { this.sort = [column, ascending]; return this; }
  limit(count) { this.cap = count; return this; }
  or() { return this; }
  maybeSingle() { this.mode = "maybe"; return this; }
  single() { this.mode = "one"; return this; }
  then(resolve, reject) {
    try { resolve(this.run()); } catch (error) { reject(error); }
  }
  run() {
    this.world.touch();
    const rows = (this.world.tables[this.table] ??= []);
    const matches = (row) => this.filters.every((test) => test(row));
    const conversations = this.table === "whatsapp_conversations";
    // Lets a test land someone else's write just before the function's next one, e.g. the team clicking
    // "Take over" between Lana reading the chat and writing to it.
    if (conversations && this.op === "update" && this.world.beforeNextUpdate) {
      const hook = this.world.beforeNextUpdate;
      this.world.beforeNextUpdate = null;
      hook(this.world);
    }
    let out;
    if (this.op === "insert") {
      // phone_number is the primary key, as in production.
      if (conversations && rows.some((row) => row.phone_number === this.payload.phone_number)) {
        return { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };
      }
      if (this.table === "consultation_bookings") {
        const { date, time } = { date: this.payload.consultation_date, time: this.payload.consultation_time };
        if (this.world.failInsert) {
          this.world.failInsert = false;
          return { data: null, error: { code: "XX000", message: "boom" } };
        }
        // Someone else takes the time just before this insert, after the function's own check has passed.
        if (this.world.rejectNextInsert) {
          this.world.rejectNextInsert = false;
          rows.push({ id: crypto.randomUUID(), phone_number: "254799999999", consultation_date: date, consultation_time: time, status: "confirmed", created_at: new Date().toISOString() });
        }
        // The slot rule of migration 0008: one booking that is not cancelled per time, from 2026-11-01.
        if (date >= "2026-11-01" && rows.some((row) => row.consultation_date === date && row.consultation_time === time && row.status !== "cancelled")) {
          return { data: null, error: { code: "23505", message: 'duplicate key value violates unique constraint "consultation_bookings_one_per_slot"' } };
        }
        this.world.events.push("insert booking");
      }
      const at = this.world.timestamp();
      // A booking gets its id and creation time as the database would, the time from the (possibly mocked) clock.
      const row = this.table === "consultation_bookings"
        ? { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...clone(this.payload) }
        : { escalated: false, messages: [], ...clone(this.payload), created_at: at, updated_at: at };
      rows.push(row);
      out = [row];
    } else if (this.op === "upsert") {
      rows.push(clone(this.payload));
      out = [this.payload];
    } else if (this.op === "update") {
      if (this.table === "consultation_bookings") this.world.events.push("update booking");
      out = rows.filter(matches);
      for (const row of out) {
        Object.assign(row, clone(this.payload));
        // Production's update_whatsapp_conversations_updated_at trigger.
        if (conversations) row.updated_at = this.world.timestamp();
      }
    } else {
      out = rows.filter(matches);
      if (this.sort) {
        const [column, ascending] = this.sort;
        out = [...out].sort((a, b) => (a[column] < b[column] ? -1 : a[column] > b[column] ? 1 : 0) * (ascending ? 1 : -1));
      }
      if (this.cap !== null) out = out.slice(0, this.cap);
    }
    out = out.map(clone);
    if (this.mode === "maybe") return { data: out[0] ?? null, error: null };
    if (this.mode === "one") return out[0] ? { data: out[0], error: null } : { data: null, error: { message: "no rows" } };
    return { data: out, error: null };
  }
}

const DEFAULT_ENV = {
  WHATSAPP_VERIFY_TOKEN: "verify-me",
  WHATSAPP_ACCESS_TOKEN: "wa-token",
  WHATSAPP_PHONE_NUMBER_ID: "123456",
  LOVABLE_API_KEY: "test-lovable-key",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role",
  RESEND_API_KEY: "re_test",
  // Lana's pause before answering, shortened so tests run fast. Greetings wait four times as long.
  WHATSAPP_REPLY_DELAY_MS: "20",
};

const FUNCTIONS_URL = `${DEFAULT_ENV.SUPABASE_URL}/functions/v1/`;
// What the two booking functions answer unless a test scripts something else.
const FUNCTION_DEFAULTS = {
  "create-consultation-calendar-event": { status: 200, body: { success: true, eventId: "evt_1", meetingLink: "https://meet.google.com/abc-defg-hij" } },
  "send-consultation-booking-confirmation": { status: 200, body: { id: "email_fake" } },
};

function makeWorld({ conversations, gateway, anthropic, meta, bookings, functions, failInsert, rejectNextInsert }) {
  const world = {
    tables: {
      whatsapp_conversations: clone(conversations),
      communication_logs: [],
      whatsapp_suppressions: [],
      profiles: [],
      // Bookings already in the database. A seed row that does not say when it was made was made long ago.
      consultation_bookings: bookings.map((row) => ({ id: crypto.randomUUID(), status: "confirmed", created_at: "2026-10-01T08:00:00.000Z", ...clone(row) })),
    },
    sent: [], // WhatsApp messages the function sent: { to, text }, and for lists and buttons also { interactive }
    emails: [], // Resend emails: { to, subject, html }
    events: [], // what happened, in order: "insert booking", "update booking", "call <function>", "send text|interactive", "email <subject>"
    functionCalls: [], // calls to the booking functions: { name, headers, body }
    functionQueue: Object.fromEntries(Object.entries(functions).map(([name, outcomes]) => [name, [...outcomes]])),
    failInsert: Boolean(failInsert), // the next insert into consultation_bookings fails
    rejectNextInsert: Boolean(rejectNextInsert), // the next one finds the time taken by someone else
    gatewayCalls: [], // AI gateway requests: { headers, body }
    anthropicCalls: [], // Claude requests: { headers, body }
    geminiCalls: [], // direct Gemini calls, which the function must no longer make
    logs: [],
    gatewayQueue: [...gateway],
    anthropicQueue: [...anthropic],
    metaQueue: [...meta], // scripted outcomes for WhatsApp sends: { status, body } or { throws }; none left means it works
    background: [], // work the function handed to EdgeRuntime.waitUntil
    inflight: 0,
    activity: 0,
    clock: Date.parse("2026-10-30T08:00:00Z"),
    touch() { world.activity++; },
    // A unique, increasing timestamptz in PostgREST's format.
    timestamp() { world.clock += 1; return `${new Date(world.clock).toISOString().slice(0, -1)}123+00:00`; },
    conversation: (phone) => clone(world.tables.whatsapp_conversations.find((c) => c.phone_number === phone)),
  };
  world.supabase = { from: (table) => new Query(world, table) };

  world.fetch = async (url, init = {}) => {
    world.inflight++;
    world.activity++;
    try {
      const target = String(url);
      const body = init.body ? JSON.parse(init.body) : undefined;
      if (target.startsWith("https://graph.facebook.com/")) {
        const outcome = world.metaQueue.shift();
        if (outcome?.throws) throw outcome.throws;
        if (outcome && outcome.status >= 400) return jsonResponse(outcome.status, outcome.body);
        world.events.push(body.type === "interactive" ? "send interactive" : "send text");
        world.sent.push(body.type === "interactive"
          ? { to: body.to, text: body.interactive.body.text, interactive: body.interactive }
          : { to: body.to, text: body.text.body });
        return jsonResponse(200, { messages: [{ id: "wamid.fake" }] });
      }
      if (target === "https://ai.gateway.lovable.dev/v1/chat/completions") {
        world.gatewayCalls.push({ headers: init.headers, body });
        const next = world.gatewayQueue.shift();
        if (!next) return jsonResponse(500, { error: "no scripted gateway response left" });
        // Something else happening while the model is thinking, e.g. the team replying from the inbox.
        if (next.meanwhile) next.meanwhile(world);
        if (next.delayMs) await delay(next.delayMs, init.signal);
        if (next.throws) throw next.throws;
        return jsonResponse(next.status, next.body);
      }
      if (target === "https://api.anthropic.com/v1/messages") {
        world.anthropicCalls.push({ headers: init.headers, body });
        const next = world.anthropicQueue.shift();
        if (!next) return jsonResponse(500, { type: "error", error: { type: "api_error", message: "no scripted Claude response left" } });
        if (next.delayMs) await delay(next.delayMs, init.signal);
        if (next.throws) throw next.throws;
        return jsonResponse(next.status, next.body);
      }
      if (target.startsWith("https://generativelanguage.googleapis.com/")) {
        world.geminiCalls.push(target);
        return jsonResponse(500, { error: "the function must not call Gemini directly" });
      }
      if (target.startsWith(FUNCTIONS_URL)) {
        const name = target.slice(FUNCTIONS_URL.length);
        world.events.push(`call ${name}`);
        world.functionCalls.push({ name, headers: init.headers, body });
        const next = world.functionQueue[name]?.shift() ?? FUNCTION_DEFAULTS[name];
        if (!next) return jsonResponse(404, { error: `no such function: ${name}` });
        if (next.delayMs) await delay(next.delayMs, init.signal);
        if (next.throws) throw next.throws;
        return jsonResponse(next.status, next.body);
      }
      if (target === "https://api.resend.com/emails") {
        world.events.push(`email ${body.subject}`);
        world.emails.push(body);
        return jsonResponse(200, { id: "email_fake" });
      }
      throw new Error(`Network call the test harness does not fake: ${target}`);
    } finally {
      world.inflight--;
    }
  };
  return world;
}

// The webhook answers Meta straight away and does its work in the background: wait for the work it
// handed to EdgeRuntime.waitUntil, then until nothing is in flight and nothing new has happened for a
// few ticks.
async function settle(world) {
  for (let seen = -1; seen !== world.background.length; ) {
    seen = world.background.length;
    await Promise.allSettled(world.background);
  }
  let quiet = 0;
  let last = -1;
  for (let i = 0; i < 600 && quiet < 4; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5));
    quiet = world.inflight === 0 && world.activity === last ? quiet + 1 : 0;
    last = world.activity;
  }
}

let loads = 0;

export async function loadFunction(
  name,
  { env = {}, conversations = [], gateway = [], anthropic = [], meta = [], bookings = [], functions = {}, failInsert = false, rejectNextInsert = false } = {},
) {
  const bundle = await build({
    entryPoints: [path.join(functionsDir, name, "index.ts")],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    target: "node20",
    logLevel: "silent",
    plugins: [denoUrlImports],
  });

  const world = makeWorld({ conversations, gateway, anthropic, meta, bookings, functions, failInsert, rejectNextInsert });
  const fullEnv = { ...DEFAULT_ENV, ...env };
  const saved = { fetch: globalThis.fetch, Deno: globalThis.Deno, EdgeRuntime: globalThis.EdgeRuntime, console: { ...console } };
  globalThis.fetch = world.fetch;
  globalThis.Deno = { env: { get: (key) => fullEnv[key] } };
  globalThis.EdgeRuntime = { waitUntil: (promise) => world.background.push(promise) };
  globalThis.__fakeSupabase = world.supabase;
  for (const level of ["log", "warn", "error"]) {
    console[level] = (...args) => world.logs.push({ level, text: args.map(String).join(" ") });
  }

  const dir = await mkdtemp(path.join(tmpdir(), "edge-test-"));
  const file = path.join(dir, `${name}.mjs`);
  await writeFile(file, bundle.outputFiles[0].text);
  await import(`${pathToFileURL(file).href}?load=${++loads}`);
  const handler = globalThis.__edgeHandler;

  // Deliver a webhook payload the way Meta would. Resolves once the function has answered Meta.
  const deliver = (payload) =>
    handler(
      new Request("https://function.test/whatsapp-webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );

  return {
    world,
    deliver,
    settle: () => settle(world),
    // Deliver a payload and wait for the background work to finish.
    async post(payload) {
      const response = await deliver(payload);
      await settle(world);
      return response;
    },
    async dispose() {
      globalThis.fetch = saved.fetch;
      globalThis.Deno = saved.Deno;
      globalThis.EdgeRuntime = saved.EdgeRuntime;
      Object.assign(console, saved.console);
      delete globalThis.__edgeHandler;
      delete globalThis.__fakeSupabase;
      await rm(dir, { recursive: true, force: true });
    },
  };
}

// Loads a pure TypeScript module (one with no Deno imports and no network, such as booking.ts) so its functions
// can be tested directly, without a handler around them.
export async function loadModule(relPathFromFunctionsDir) {
  const bundle = await build({
    entryPoints: [path.join(functionsDir, relPathFromFunctionsDir)],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    target: "node20",
    logLevel: "silent",
  });
  const dir = await mkdtemp(path.join(tmpdir(), "edge-module-"));
  try {
    const file = path.join(dir, "module.mjs");
    await writeFile(file, bundle.outputFiles[0].text);
    return await import(`${pathToFileURL(file).href}?load=${++loads}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

let messageIds = 0;

// An inbound WhatsApp message in the shape Meta's webhook delivers. A text message by default; pass `type`
// and that type's own field (e.g. `{ type: "image", image: { id, caption } }`) for anything else.
export function inbound({ from = "254700000001", name = "Test Parent", text, id, type = "text", ...fields }) {
  const message = {
    from,
    id: id ?? `wamid.test.${++messageIds}`,
    timestamp: "1793350800",
    type,
    ...(type === "text" ? { text: { body: text } } : fields),
  };
  return {
    entry: [{ changes: [{ field: "messages", value: { messages: [message], contacts: [{ profile: { name }, wa_id: from }] } }] }],
  };
}

// A tapped reply button, or with `list: true` a chosen list row, as Meta delivers it: the id and the title.
export function tap(id, title, { from = "254700000001", name = "Test Parent", list = false } = {}) {
  const interactive = list
    ? { type: "list_reply", list_reply: { id, title } }
    : { type: "button_reply", button_reply: { id, title } };
  return inbound({ from, name, type: "interactive", interactive });
}

// Scripted answers from the Lovable AI gateway (OpenAI-style chat completions).
export const aiText = (content) => ({ status: 200, body: { choices: [{ message: { role: "assistant", content } }] } });
export const aiToolCall = (name, args, id = "call_1") => ({
  status: 200,
  body: {
    choices: [{
      message: {
        role: "assistant",
        content: null,
        tool_calls: [{ id, type: "function", function: { name, arguments: JSON.stringify(args) } }],
      },
    }],
  },
});
export const aiFailure = (status, message = "gateway error") => ({ status, body: { error: { message } } });

// Scripted answers from Claude's Messages API.
export const claudeText = (text) => ({
  status: 200,
  body: { id: "msg_fake", type: "message", role: "assistant", content: [{ type: "text", text }], stop_reason: "end_turn" },
});
const CLAUDE_ERROR_TYPES = {
  400: "invalid_request_error", 401: "authentication_error", 402: "billing_error", 403: "permission_error",
  404: "not_found_error", 429: "rate_limit_error", 529: "overloaded_error",
};
export const claudeFailure = (status, message = "claude error") => ({
  status,
  body: { type: "error", error: { type: CLAUDE_ERROR_TYPES[status] ?? "api_error", message }, request_id: "req_fake" },
});
export const claudeRefusal = () => ({
  status: 200,
  body: {
    id: "msg_fake", type: "message", role: "assistant", content: [], stop_reason: "refusal",
    stop_details: { type: "refusal", category: null, explanation: "declined" },
  },
});
