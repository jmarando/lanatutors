import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  type Action,
  type Booked,
  type BookingRow,
  type BookingState,
  type Outgoing,
  COPY,
  HORIZON_DAYS,
  MAX_CHAT_BOOKINGS_PER_DAY,
  MAX_LIST_ROWS,
  addDays,
  alreadyBookedOut,
  askEmailOut,
  bookedOut,
  bookingRow,
  confirmOut,
  countRecentChatBookings,
  currentFlow,
  dayListOut,
  findEmail,
  freeTimes,
  isFree,
  isOpen,
  isUpcoming,
  longDay,
  nairobiNow,
  niceTime,
  offerOut,
  offersCall,
  openDays,
  parseTap,
  partOf,
  partsOf,
  partsOut,
  phoneVariants,
  textOut,
  timesInPart,
  timesOut,
} from "./booking.ts";
import { readClaudeReply, toClaudeMessages } from "./claude.ts";
import { ATTACHMENT_NOTICE, BACKUP_REPLY, CALLBACK_REPLY, isGreeting, looksLikeSpam, matchPrefill } from "./lana.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
const WA_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
// Same gateway and default model as the site's other AI features (recommend-packages, generate-session-summary).
const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = Deno.env.get("WHATSAPP_AI_MODEL") ?? "google/gemini-2.5-flash";
// The second AI. When the first one fails, Claude gets one try at the same chat, without tools. Leave
// ANTHROPIC_API_KEY unset and there is no second AI.
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const FALLBACK_MODEL = Deno.env.get("WHATSAPP_FALLBACK_MODEL") ?? "claude-haiku-5-5";
const FALLBACK_BUDGET_MS = Number(Deno.env.get("WHATSAPP_FALLBACK_BUDGET_MS") ?? 15_000);
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const WA_APP_SECRET = Deno.env.get("WHATSAPP_APP_SECRET");
// Lana waits this long before answering, so a thought sent as two or three messages gets one reply that reads all
// of it. After a bare greeting she waits four times as long, because the question usually follows.
const REPLY_DELAY_MS = Number(Deno.env.get("WHATSAPP_REPLY_DELAY_MS") ?? 5000);
const MAX_HISTORY = 50; // as in whatsapp-send
// Booking the assessment call inside the chat. WHATSAPP_BOOKING=off takes the buttons away without a deploy.
const BOOKING_ON = (Deno.env.get("WHATSAPP_BOOKING") ?? "on").toLowerCase() !== "off";
// Every booking made in the chat also emails the team a notice, for the launch month. WHATSAPP_BOOKING_NOTICES=off
// silences it; the alerts about things that went wrong are never silenced.
const BOOKING_NOTICES_ON = (Deno.env.get("WHATSAPP_BOOKING_NOTICES") ?? "on").toLowerCase() !== "off";
// How long each call to the two booking functions may take before it counts as failed.
const BOOKING_CALL_MS = Number(Deno.env.get("WHATSAPP_BOOKING_CALL_MS") ?? 20_000);

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

// Verify Meta's X-Hub-Signature-256 header: HMAC-SHA256 of the raw request body,
// keyed with the WhatsApp app secret. Without this, anyone who learns the URL can
// POST fake inbound messages and drive the AI responder / write to the database.
async function verifyWhatsAppSignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (!WA_APP_SECRET) return true; // not configured yet — do not block (see deploy note in POST handler)
  if (!signatureHeader) return false;
  const expectedHex = signatureHeader.startsWith("sha256=") ? signatureHeader.slice(7) : signatureHeader;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(WA_APP_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
    const actualHex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
    if (actualHex.length !== expectedHex.length) return false;
    let diff = 0;
    for (let i = 0; i < actualHex.length; i++) diff |= actualHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
    return diff === 0;
  } catch (e) {
    console.error("WhatsApp signature verification error:", e);
    return false;
  }
}

const SYSTEM_PROMPT = `You are Lana, the WhatsApp assistant for Lana Tutors — Kenya's premium tutoring platform for local and diaspora families.

YOUR ONE JOB
Your job is NOT to answer everything yourself. It is to understand what the parent needs in a sentence or two, then connect them to our Learning Coordinator, who matches the child to the right tutor, confirms rates and sets up the schedule.

WHAT WE OFFER (context only — keep it brief)
- 1-on-1 tutoring: CBC (Kenya), British (IGCSE/A-Levels), American, IB. Online (Google Meet) or in-person in Nairobi.
- Single sessions, lesson packages, or a custom learning plan.
- Vetted tutors. All emails come from info@lanatutors.africa.

WHO IS WRITING
Most people who write are parents, but not all. Work out who you are talking to before you follow the steps below.
- Tutors or teachers looking for work (they say they teach, want to join us or apply, or ask about jobs, vacancies or sending a CV) are not parents. Reply in one or two sentences and put the tutor registration page on its own line: https://lanatutors.africa/become-a-tutor. Do not ask about a child, do not offer a coordinator call, and do not call escalate_to_team unless they are chasing an application they already submitted.
- A student writing for themselves: follow the steps below, but speak to the student.
- Anything that is not about tutoring (prizes, loans, investments, adverts): do not follow the parent steps. Say politely that this number is for tutoring questions, and stop.
- If the conversation already contains messages from our team, carry on from where they left off. Do not repeat questions they already asked or answers they already gave.

HOW TO HANDLE A PARENT
1. Warm one-line acknowledgement, using their first name if known.
2. Ask at most ONE or TWO short questions to understand the need: child's grade/year and curriculum, and the subject(s) they're struggling with.
3. Then hand them to the Learning Coordinator: offer either a quick call back from the coordinator (ask for the best time to call) OR a free 20-minute Academic Assessment Call they can book themselves:
   https://lanatutors.africa/book-consultation
4. Once you have their need and a preference, call escalate_to_team so the coordinator picks it up, and reply with a short confirmation that the coordinator will be in touch.

WHAT NOT TO DO (these are hard rules — breaking them is a critical failure)
- NEVER recommend, name or list individual tutors, and NEVER send tutor profile links or lanatutors.africa/tutor/... URLs. You have no access to tutor information and must never imply you do. Tutor matching is the Learning Coordinator's job — say "our Learning Coordinator will match your child with the right tutor".
- NEVER quote, estimate or hint at prices. Rates depend on curriculum, level and subject and are shared after the assessment. Say that, then offer the coordinator.
- Never dump a menu of options or a wall of links. One link at a time, only when it's the natural next step.
- Never invent availability, tutor names or timelines. If you don't know something, the Learning Coordinator will confirm it.

STYLE
- Warm, human, conversational. 2-3 short sentences max — WhatsApp users skim.
- No emojis, smileys or emoticons. Plain text only.
- No sign-off, no "— Lana", no signature.
- When you do share a link, paste the full https://lanatutors.africa/... on its own line.
- For complaints, payments or account issues: empathize briefly, escalate, and say our Learning Coordinator will call them back to sort it out.
- NEVER tell parents to email info@lanatutors.africa or expect an email from us. The next step is always a call back from the Learning Coordinator (or the assessment call booking link when they prefer to pick a time).

TOOLS
- get_booking_link: to fetch the correct link when booking is the next step.
- escalate_to_team: to hand the parent to the Learning Coordinator — use this as soon as you know roughly what they need, or if they want a call back, or for any complaint/payment issue.
You have NO tutor lookup tool and NO knowledge of individual tutors. If asked about tutors, say the Learning Coordinator handles matching.
Call escalate_to_team ONCE and then reply with a brief holding message. Don't keep auto-replying after escalation.

CALL-BACK PREFERENCE
- When a parent wants help choosing, rates, or anything you can't answer, the default next step is: "Can our Learning Coordinator call you back? What's a good time?"
- Only share the assessment call booking link if they'd rather pick a time themselves. Never offer email as an option.`;

const TOOLS = [
  {
    name: "get_booking_link",
    description: "Get the correct booking link for a specific intent.",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["assessment_call", "learning_plan", "browse_tutors", "how_it_works"],
        },
      },
      required: ["type"],
    },
  },
  {
    name: "escalate_to_team",
    description: "Hand the conversation off to a human team member. Use for complaints, refund requests, payment problems, account access issues, or when the parent explicitly asks for a human. Provide a one-sentence reason.",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string" },
      },
      required: ["reason"],
    },
  },
];

// `via` records how a bot message was produced ("ai", "backup" when the AI failed, "prefill:<intent>" for a ready-made
// reply, "notice:attachment" or "opt_out", "booking:<step>" for the booking flow); `sent_by: "human"` marks the team's
// replies. Messages from the person carry WhatsApp's message id, `attachment` when they sent a photo, voice note or
// file, and `tap` (the id) when they tapped a button or list row. `booking` is what the booking flow remembers.
type Msg = {
  role: "user" | "model";
  content: string;
  ts: string;
  via?: string;
  sent_by?: string;
  wa_id?: string;
  attachment?: { type: string; id?: string; caption?: string };
  tap?: string;
  booking?: BookingState;
};
type Conversation = { phone_number: string; parent_id: string | null; escalated: boolean; messages: Msg[]; updated_at: string };

type SendResult = { ok: true } | { ok: false; error: string };

// Strips a "— Lana" or "Lana" sign-off (with or without a heart) that the model may add to a message.
function stripSignOff(text: string): string {
  return text
    .replace(/\n*\s*[—-]\s*Lana\s*(💛|❤️|♥|<3)?\s*$/i, "")
    .replace(/\n*\s*Lana\s*(💛|❤️|♥)\s*$/i, "")
    .trim();
}

// Sends one message to WhatsApp. Meta can refuse (an expired token, say) or be out of reach, and the caller has to know
// which, so the answer says so. It never throws.
async function postToMeta(to: string, message: Record<string, unknown>): Promise<SendResult> {
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${WA_PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to, ...message }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok) return { ok: true };
    console.error("WA send error:", data);
    const meta = (data as { error?: { message?: string; code?: number } } | null)?.error;
    const said = `${meta?.message ? `: ${meta.message}` : ""}${meta?.code ? ` (code ${meta.code})` : ""}`;
    return { ok: false, error: `Meta answered ${res.status}${said}` };
  } catch (e) {
    console.error("WA send failed:", e);
    return { ok: false, error: `The call to Meta failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}

function sendWhatsAppMessage(to: string, text: string): Promise<SendResult> {
  return postToMeta(to, { type: "text", text: { body: stripSignOff(text), preview_url: true } });
}

// A list or reply buttons.
function sendInteractive(to: string, interactive: Record<string, unknown>): Promise<SendResult> {
  return postToMeta(to, { type: "interactive", interactive });
}

async function logComm(args: {
  phone: string;
  parentId: string | null;
  direction: "inbound" | "outbound";
  content: string;
}) {
  try {
    await admin.from("communication_logs").insert({
      parent_id: args.parentId,
      channel: "whatsapp",
      direction: args.direction,
      content: args.content,
      status: "sent",
      subject: `WhatsApp ${args.direction} (${args.phone})`,
    });
  } catch (e) {
    console.error("logComm failed:", e);
  }
}

async function suppressWhatsAppNumber(phone: string, source: string) {
  try {
    await admin.from("whatsapp_suppressions").upsert({
      phone_number: normalizePhone(phone),
      reason: "opt_out",
      source,
    }, { onConflict: "phone_number" });
  } catch (e) {
    console.error("suppressWhatsAppNumber failed:", e);
  }
}

function normalizePhone(phone: string) {
  let p = phone.replace(/[\s+()-]/g, "");
  if (p.startsWith("0")) p = "254" + p.slice(1);
  if (p.length === 9) p = "254" + p;
  return p;
}

const OPT_OUT_KEYWORDS = [
  "stop", "unsubscribe", "opt out", "opt-out", "cancel",
  "dont message me", "don't message me", "no more messages",
  "remove me", "take me off", "unsubscribe me"
];

const ABUSIVE_KEYWORDS = [
  "fuck", "fuck you", "fuck u", "fuck off", "bitch",
  "asshole", "shit", "bastard", "idiot", "stupid",
  "nonsense", "rubbish", "go away", "leave me alone",
  "piss off", "screw you", "damn you", "shut up"
];

function isOptOutOrAbusiveMessage(text: string) {
  const t = text.trim().toLowerCase();
  if (OPT_OUT_KEYWORDS.includes(t)) return true;
  return ABUSIVE_KEYWORDS.some((k) => t.includes(k));
}

async function loadConversation(phone: string, profileName?: string) {
  const { data } = await admin
    .from("whatsapp_conversations")
    .select("*")
    .eq("phone_number", phone)
    .maybeSingle();

  if (data) return data;

  // Try to link to existing parent profile by phone
  let parentId: string | null = null;
  try {
    const { data: p } = await admin
      .from("profiles")
      .select("id")
      .or(`phone.eq.${phone},phone.eq.+${phone}`)
      .maybeSingle();
    if (p) parentId = p.id;
  } catch {
    // profiles.phone may not exist on all rows; ignore
  }

  const { data: created, error } = await admin
    .from("whatsapp_conversations")
    .insert({
      phone_number: phone,
      profile_name: profileName ?? null,
      parent_id: parentId,
      messages: [],
    })
    .select()
    .single();
  if (created) return created;
  // Two messages that arrive together can both find no chat; the one that loses the insert uses the other's.
  const { data: existing } = await admin.from("whatsapp_conversations").select("*").eq("phone_number", phone).maybeSingle();
  if (!existing) console.error("Could not create the WhatsApp conversation:", error);
  return existing;
}

async function getConversation(phone: string): Promise<Conversation | null> {
  const { data } = await admin.from("whatsapp_conversations").select("*").eq("phone_number", phone).maybeSingle();
  return data;
}

const SAVE_ATTEMPTS = 3;

// Adds messages to a chat without overwriting anyone else's: another message from the same burst, or a reply the
// team sends from the inbox while Lana is writing. It re-reads the chat just before writing and only writes if
// nobody has written since (a trigger changes updated_at on every write); if the chat keeps changing, the last
// attempt writes anyway rather than lose the message. Messages already saved are skipped, since Meta sometimes
// delivers a message twice. Returns the chat as written, and whether anything was added.
async function appendMessages(
  phone: string,
  msgs: Msg[],
  patch: Record<string, unknown> = {},
): Promise<{ convo: Conversation; added: boolean } | null> {
  for (let attempt = 1; attempt <= SAVE_ATTEMPTS + 1; attempt++) {
    const convo = await getConversation(phone);
    if (!convo) return null;
    const history = Array.isArray(convo.messages) ? convo.messages : [];
    const fresh = msgs.filter((m) => !m.wa_id || !history.some((h) => h.wa_id === m.wa_id));
    if (fresh.length === 0) return { convo, added: false };
    const update = admin
      .from("whatsapp_conversations")
      .update({ messages: [...history, ...fresh].slice(-MAX_HISTORY), last_message_at: new Date().toISOString(), ...patch })
      .eq("phone_number", phone);
    const { data } = await (attempt <= SAVE_ATTEMPTS ? update.eq("updated_at", convo.updated_at) : update)
      .select()
      .maybeSingle();
    if (data) return { convo: data, added: true };
  }
  return null;
}

// Takes the chat for Lana's one answer by setting `escalated`, which also hands it to the team once she has
// answered. Only one of several webhook calls racing on the same chat can take it, so nobody gets two answers.
async function claimForReply(phone: string): Promise<boolean> {
  const { data } = await admin
    .from("whatsapp_conversations")
    .update({ escalated: true, escalated_at: new Date().toISOString() })
    .eq("phone_number", phone)
    .eq("escalated", false)
    .select("phone_number")
    .maybeSingle();
  return Boolean(data);
}

// ---------------- TOOLS ----------------

// Safety net: Lana must never send tutor profile links or name individual
// tutors. If a reply slips through with one, swap in the coordinator hand-off.
function sanitizeReply(text: string): string {
  if (/lanatutors\.africa\/tutor\//i.test(text)) {
    console.warn("Blocked tutor link in AI reply — replaced with coordinator hand-off.");
    return [
      "Thanks for sharing that. Tutor matching is handled personally by our Learning Coordinator, who'll find the right fit for your child and confirm the rate.",
      "",
      "Would you like a quick call back? Tell me a good time — or you can book a free 20-minute assessment call here:",
      "https://lanatutors.africa/book-consultation",
    ].join("\n");
  }
  return text;
}

function toolGetBookingLink(args: { type: string }) {
  const map: Record<string, string> = {
    assessment_call: "https://lanatutors.africa/book-consultation",
    learning_plan: "https://lanatutors.africa/request-learning-plan",
    browse_tutors: "https://lanatutors.africa",
    how_it_works: "https://lanatutors.africa/how-it-works",
  };
  return { url: map[args.type] ?? "https://lanatutors.africa" };
}

async function toolEscalate(args: {
  reason: string;
  phone: string;
  profileName?: string;
  parentId: string | null;
  history: Msg[];
}) {
  console.log("Escalating conversation:", args.phone, args.reason);
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY missing — cannot send escalation email");
    return { escalated: true, email_sent: false };
  }
  const transcript = args.history
    .map((m) => `${m.role === "user" ? "Parent" : "Lana"}: ${m.content}`)
    .join("\n\n");
  const html = `
    <table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;background:#fef5f4;padding:24px;">
      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border-top:4px solid #e7422d;">
          <tr><td>
            <h2 style="color:#e7422d;margin:0 0 12px;">🚨 WhatsApp Escalation</h2>
            <p style="margin:4px 0;"><strong>From:</strong> ${args.profileName ?? "Unknown"} (+${args.phone})</p>
            <p style="margin:4px 0;"><strong>Parent ID:</strong> ${args.parentId ?? "Not linked"}</p>
            <p style="margin:4px 0;"><strong>Reason:</strong> ${args.reason}</p>
            <hr style="border:none;border-top:1px solid #eee;margin:16px 0;"/>
            <h3 style="color:#333;">Transcript</h3>
            <pre style="white-space:pre-wrap;font-family:Arial,sans-serif;background:#fafafa;padding:12px;border-radius:8px;font-size:14px;">${transcript.replace(/</g, "&lt;")}</pre>
            <p style="color:#777;font-size:12px;margin-top:16px;">Reply to the parent on WhatsApp or email. Auto-replies are paused until an admin clears the escalation flag.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  `;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Lana Tutors <info@lanatutors.africa>",
        to: ["info@lanatutors.africa"],
        subject: `🚨 WhatsApp escalation — ${args.profileName ?? args.phone}`,
        html,
      }),
    });
    if (!r.ok) console.error("Resend escalation failed:", await r.text());
    return { escalated: true, email_sent: r.ok };
  } catch (e) {
    console.error("Escalation email error:", e);
    return { escalated: true, email_sent: false };
  }
}

// ---------------- AI (LOVABLE GATEWAY) ----------------

type ToolCall = { id: string; function: { name: string; arguments?: string } };
type GatewayMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};
// `offeredBooking`: the AI fetched the assessment-call link, so its reply is offering the call.
type AiResult = { ok: true; text: string; via: "ai" | "ai_fallback"; model: string; offeredBooking?: boolean } | { ok: false; reason: string };

const MAX_TOOL_ROUNDS = 4;
// The AI gets this long, in total, for its whole conversation including the tool rounds. Past it the backup goes
// out, so a slow gateway can't keep someone waiting.
const AI_BUDGET_MS = Number(Deno.env.get("WHATSAPP_AI_BUDGET_MS") ?? 20_000);

function parseToolArgs(raw: string | undefined): Record<string, string> {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

// The prompt both AIs get, with what Lana knows about who is writing.
function systemPrompt(profileName: string | undefined, parentId: string | null): string {
  return (
    SYSTEM_PROMPT +
    (profileName ? `\n\nParent's WhatsApp name: "${profileName}".` : "") +
    (parentId ? `\nThis WhatsApp number IS linked to an existing parent account.` : `\nThis WhatsApp number is NOT linked to an existing parent account yet.`)
  );
}

// Calls the AI. When it can't answer, the result says why, so the caller can alert the team instead of failing
// silently. It never throws: a reply Lana can't read is a failure like any other.
async function callAI(
  history: Msg[],
  profileName: string | undefined,
  parentId: string | null,
  phone: string,
): Promise<AiResult> {
  try {
    return await askGateway(history, profileName, parentId, phone);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: `The AI gateway sent a reply Lana could not read: ${detail}` };
  }
}

async function askGateway(
  history: Msg[],
  profileName: string | undefined,
  parentId: string | null,
  phone: string,
): Promise<AiResult> {
  const deadline = Date.now() + AI_BUDGET_MS;
  const timeoutReason = `The AI gateway timed out after ${AI_BUDGET_MS / 1000} seconds`;
  let offeredBooking = false;
  const messages: GatewayMessage[] = [
    { role: "system", content: systemPrompt(profileName, parentId) },
    ...history.map((m): GatewayMessage => ({ role: m.role === "model" ? "assistant" : "user", content: m.content })),
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return { ok: false, reason: timeoutReason };
    let res: Response;
    let data: { choices?: { message?: GatewayMessage }[] } | undefined;
    try {
      res = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: AI_MODEL,
          messages,
          tools: TOOLS.map((tool) => ({ type: "function", function: tool })),
        }),
        signal: AbortSignal.timeout(remaining),
      });
      if (res.ok) data = await res.json();
    } catch (e) {
      const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
      const detail = e instanceof Error ? e.message : String(e);
      return { ok: false, reason: timedOut ? timeoutReason : `The AI gateway call failed: ${detail}` };
    }
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      return { ok: false, reason: `The AI gateway answered ${res.status}: ${detail}` };
    }

    const message = data?.choices?.[0]?.message;
    const calls = message?.tool_calls ?? [];

    if (calls.length === 0) {
      const text = message?.content?.trim();
      return text
        ? { ok: true, text, via: "ai", model: AI_MODEL, offeredBooking }
        : { ok: false, reason: "The AI answered with an empty message" };
    }

    // Append the model's turn (with its tool calls), then answer each call.
    messages.push({ role: "assistant", content: message?.content ?? null, tool_calls: calls });
    for (const call of calls) {
      const args = parseToolArgs(call.function.arguments);
      let result: unknown = { ok: true };
      if (call.function.name === "get_booking_link") {
        result = toolGetBookingLink({ type: args.type ?? "" });
        if (args.type === "assessment_call") offeredBooking = true;
      } else if (call.function.name === "escalate_to_team") {
        result = await toolEscalate({
          reason: args.reason ?? "unspecified",
          phone,
          profileName,
          parentId,
          history,
        });
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }

  return { ok: false, reason: `The AI called tools ${MAX_TOOL_ROUNDS} times without writing a reply` };
}

// ---------------- SECOND AI (CLAUDE) ----------------

const CLAUDE_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_API_VERSION = "2026-10-21";
const NO_TOOLS_NOTE =
  "\n\nTools are not available for this reply. Do not try to call any. Where the steps above say to use a tool, use " +
  "the links written in this prompt instead. For a complaint or a payment problem, say a person from the team will call them back.";

// Asks Claude to answer the chat. Plain fetch, like every other outside service here, and no tools: the prompt already
// holds the links, and the chat still goes to the team. It never throws; a problem comes back as a reason.
async function callClaude(history: Msg[], profileName: string | undefined, parentId: string | null): Promise<AiResult> {
  if (!ANTHROPIC_API_KEY) return { ok: false, reason: "No Anthropic API key is set" };
  const messages = toClaudeMessages(history);
  if (messages.length === 0) return { ok: false, reason: "There was nothing from the person for Claude to answer" };
  try {
    const res = await fetch(CLAUDE_URL, {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": CLAUDE_API_VERSION, "content-type": "application/json" },
      body: JSON.stringify({
        model: FALLBACK_MODEL,
        max_tokens: 1024,
        system: systemPrompt(profileName, parentId) + NO_TOOLS_NOTE,
        messages,
        output_config: { effort: "low" },
      }),
      signal: AbortSignal.timeout(FALLBACK_BUDGET_MS),
    });
    const reading = readClaudeReply(res.status, await res.json().catch(() => null));
    return reading.ok ? { ok: true, text: reading.text, via: "ai_fallback", model: FALLBACK_MODEL } : reading;
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    const detail = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      reason: timedOut ? `Claude timed out after ${FALLBACK_BUDGET_MS / 1000} seconds` : `The call to Claude failed: ${detail}`,
    };
  }
}

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

type Accent = { border: string; heading: string };
const AMBER: Accent = { border: "#f59e0b", heading: "#b45309" };
const RED: Accent = { border: "#e7422d", heading: "#b91c1c" };
const GREEN: Accent = { border: "#16a34a", heading: "#15803d" };

// One email to the team: a heading, some labelled facts, a few notes, an optional grey hint and the chat so far.
// Alerts go out after the reply they are about, and one that can't be sent is logged and dropped.
async function sendAlert(args: {
  subject: string;
  heading: string;
  accent: Accent;
  facts: [string, string][];
  notes: string[];
  hint?: string;
  history: Msg[];
}) {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY missing — cannot send the alert:", args.subject);
    return;
  }
  const factLines = args.facts.map(([label, value]) => `<p style="margin:4px 0;"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`);
  const noteLines = args.notes.map((note) => `<p style="margin:12px 0 4px;">${escapeHtml(note)}</p>`);
  const hintLine = args.hint
    ? `<p style="margin:4px 0;color:#777;font-size:13px;white-space:pre-wrap;">${escapeHtml(args.hint)}</p>`
    : "";
  const transcript = args.history
    .map((m) => `${m.role === "user" ? "Parent" : m.sent_by === "human" ? "Team" : "Lana"}: ${m.content}`)
    .join("\n\n");
  const chatBlock = args.history.length
    ? `<hr style="border:none;border-top:1px solid #eee;margin:16px 0;"/>
            <h3 style="color:#333;">Transcript</h3>
            <pre style="white-space:pre-wrap;font-family:Arial,sans-serif;background:#fafafa;padding:12px;border-radius:8px;font-size:14px;">${escapeHtml(transcript)}</pre>`
    : "";
  const html = `
    <table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;background:#fef5f4;padding:24px;">
      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border-top:4px solid ${args.accent.border};">
          <tr><td>
            <h2 style="color:${args.accent.heading};margin:0 0 12px;">${escapeHtml(args.heading)}</h2>
            ${[...factLines, ...noteLines, hintLine].join("\n            ")}
            ${chatBlock}
          </td></tr>
        </table>
      </td></tr>
    </table>
  `;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Lana Tutors <info@lanatutors.africa>",
        to: ["info@lanatutors.africa"],
        subject: args.subject,
        html,
      }),
    });
    if (!r.ok) console.error("Resend alert failed:", await r.text());
  } catch (e) {
    console.error("Alert error:", e);
  }
}

const whoFacts = (args: { phone: string; profileName?: string; parentId: string | null }): [string, string][] => [
  ["From", `${args.profileName ?? "Unknown"} (+${args.phone})`],
  ["Parent ID", args.parentId ?? "Not linked"],
];

// Tells the team that Lana's AI could not answer and a backup message went out instead, and why.
// Without this the failure is invisible: the person just gets a canned message.
async function alertAiFailure(args: {
  phone: string;
  profileName?: string;
  parentId: string | null;
  reason: string;
  history: Msg[];
}) {
  console.error("Lana's AI could not reply, backup message sent:", args.reason);
  await sendAlert({
    subject: `⚠️ WhatsApp: Lana's AI could not reply — ${args.profileName ?? args.phone}`,
    heading: "Lana's AI could not reply",
    accent: AMBER,
    facts: [...whoFacts(args), ["What went wrong", args.reason]],
    notes: ["They were sent a short backup message asking who they are, and the chat is now with the team. Please reply to them on WhatsApp."],
    hint: "If this keeps happening, check the Lovable AI gateway (credits and status) and the whatsapp-webhook function logs.",
    history: args.history,
  });
}

// Tells the team that the first AI failed and Claude answered instead, so what broke gets fixed before the backup
// is all that is left.
async function alertFallbackUsed(args: {
  phone: string;
  profileName?: string;
  parentId: string | null;
  reason: string;
  history: Msg[];
}) {
  console.error("Lana's first AI failed, Claude answered instead:", args.reason);
  await sendAlert({
    subject: `WhatsApp: Lana used her fallback AI — ${args.profileName ?? args.phone}`,
    heading: "Lana's usual AI failed, so Claude answered",
    accent: AMBER,
    facts: [...whoFacts(args), ["Why the first AI failed", args.reason]],
    notes: ["The person got a reply. Please check the Lovable AI gateway (credits and status)."],
    history: args.history,
  });
}

// Tells the team that WhatsApp itself would not take Lana's message, so nothing reached the person.
async function alertSendFailed(args: {
  phone: string;
  profileName?: string;
  parentId: string | null;
  error: string;
  history: Msg[];
}) {
  console.error("WhatsApp refused Lana's message:", args.error);
  await sendAlert({
    subject: `⚠️ WhatsApp: Meta refused Lana's reply — ${args.profileName ?? args.phone}`,
    heading: "Lana's reply could not be sent",
    accent: RED,
    facts: [...whoFacts(args), ["What Meta said", args.error]],
    notes: ["Nothing reached them. Please reply to them from the WhatsApp inbox."],
    hint: "If it says the access token is invalid or expired, create a permanent token (a System User) in Meta Business Settings and update the WHATSAPP_ACCESS_TOKEN secret. Until then the inbox cannot send either.",
    history: args.history,
  });
}

// Tells the team that WhatsApp would not take a list or buttons, which means booking in the chat is not working.
async function alertButtonsRefused(args: {
  from: string;
  profileName?: string;
  parentId: string | null;
  error: string;
  history: Msg[];
  sentInstead: boolean;
}) {
  console.error("WhatsApp refused Lana's buttons:", args.error);
  await sendAlert({
    subject: `⚠️ WhatsApp: buttons were refused — ${args.profileName ?? args.from}`,
    heading: "WhatsApp refused Lana's buttons",
    accent: AMBER,
    facts: [...whoFacts({ phone: args.from, profileName: args.profileName, parentId: args.parentId }), ["What Meta said", args.error]],
    notes: [
      args.sentInstead
        ? "They were sent the same words without the buttons, so nothing is lost for them. Booking in the chat does not work until this is fixed."
        : "Nothing reached them. Booking in the chat does not work until this is fixed. Please reply to them from the WhatsApp inbox.",
    ],
    hint: "Set the secret WHATSAPP_BOOKING=off to take the buttons away while this is looked into, and check the whatsapp-webhook function logs.",
    history: args.history,
  });
}

// Tells the team that Lana hit an error nobody planned for, with what is known about whose message it was. It sends the
// person nothing: from here it can't tell whether a reply already went out.
async function alertCrash(args: { phone?: string; profileName?: string; text?: string; error: unknown }) {
  const error = args.error instanceof Error ? args.error : new Error(String(args.error));
  const facts: [string, string][] = [["What went wrong", error.message]];
  if (args.phone) facts.push(["From", `${args.profileName ?? "Unknown"} (+${args.phone})`]);
  if (args.text) facts.push(["Their message", args.text]);
  await sendAlert({
    subject: "⚠️ WhatsApp: Lana hit an unexpected error",
    heading: "Lana hit an unexpected error",
    accent: RED,
    facts,
    notes: ["A reply may or may not have gone out. Please check the chat in the WhatsApp inbox."],
    hint: (error.stack ?? "").split("\n").slice(0, 6).join("\n"),
    history: [],
  });
}

// ---------------- IN-CHAT BOOKING ----------------

// Booking the free assessment call inside the chat: the lists and buttons Lana sends, the taps and the typed email she
// reads, and the booking itself. The rules and the wording are in booking.ts. What the flow remembers is a `booking`
// field on Lana's own messages, so nothing else is stored. Every step is code, not AI, so it works when both AIs are
// down.

type BookingContext = { from: string; profileName?: string; parentId: string | null };

function sendOutgoing(to: string, out: Outgoing): Promise<SendResult> {
  return out.wa.type === "text" ? sendWhatsAppMessage(to, out.wa.body) : sendInteractive(to, out.wa.interactive);
}

// The chat as an alert should show it: what the caller already has, else what is saved.
async function chatSoFar(phone: string, history: Msg[]): Promise<Msg[]> {
  return history.length > 0 ? history : ((await getConversation(phone))?.messages ?? []);
}

// Sends each message in turn, then records it in the chat and the communication log. When WhatsApp refuses a list or
// buttons the person gets the plain text instead (which carries no state, so it ends the flow) and the team is told;
// when even a plain message is refused the team is told and this returns null. Returns what it recorded.
async function say(ctx: BookingContext, outs: Outgoing[], history: Msg[] = []): Promise<Msg[] | null> {
  const recorded: Msg[] = [];
  for (const planned of outs) {
    let out = planned;
    let delivery = await sendOutgoing(ctx.from, out);
    if (!delivery.ok && out.wa.type === "interactive") {
      const refusal = delivery.error;
      const plain = out.fallback ? textOut(out.via, out.fallback) : null;
      if (plain) {
        out = plain;
        delivery = await sendOutgoing(ctx.from, plain);
      }
      await alertButtonsRefused({ ...ctx, error: refusal, history: await chatSoFar(ctx.from, history), sentInstead: Boolean(plain) && delivery.ok });
      if (!plain) continue; // there was nothing to send in its place
    }
    if (!delivery.ok) {
      await alertSendFailed({
        phone: ctx.from,
        profileName: ctx.profileName,
        parentId: ctx.parentId,
        error: delivery.error,
        history: await chatSoFar(ctx.from, history),
      });
      return null;
    }
    await logComm({ phone: ctx.from, parentId: ctx.parentId, direction: "outbound", content: out.content });
    const sent: Msg = { role: "model", content: out.content, ts: new Date().toISOString(), via: out.via, ...(out.booking && { booking: out.booking }) };
    await appendMessages(ctx.from, [sent]);
    recorded.push(sent);
  }
  return recorded;
}

// The times already held by a booking that is not cancelled, from one day to another, or null when they can't be read.
async function loadBooked(fromDay: string, toDay: string): Promise<Booked | null> {
  const { data, error } = await admin
    .from("consultation_bookings")
    .select("consultation_date, consultation_time")
    .gte("consultation_date", fromDay)
    .lte("consultation_date", toDay)
    .neq("status", "cancelled");
  if (error || !data) {
    console.error("Could not read the booked call times:", error);
    return null;
  }
  const booked: Booked = {};
  for (const row of data as { consultation_date: string; consultation_time: string }[]) {
    (booked[row.consultation_date] ??= []).push(row.consultation_time);
  }
  return booked;
}

// Tells the family the team will take it from here, and tells the team why.
async function sayWentWrong(ctx: BookingContext, detail: string): Promise<void> {
  await say(ctx, [textOut("booking:error", COPY.wentWrong)]);
  await alertBooking("read_failed", ctx, { detail });
}

// "Just filled up" for a day that would have had times but they have all gone; plain "again" for a day that was never
// on offer (a Sunday, a day that has passed).
function emptyDayIntro(day: string, now: Date): "filled" | "again" {
  return freeTimes(day, now, {}).length > 0 ? "filled" : "again";
}

// The times of a day: a list, or buttons for the part of the day when there are too many for a list.
function offerTimes(day: string, times: string[], email?: string, taken = false): Outgoing {
  if (times.length <= MAX_LIST_ROWS) return timesOut(day, times, { email, taken });
  const parts = partsOf(times);
  return parts.length === 1 ? timesOut(day, timesInPart(times, parts[0]), { email, taken }) : partsOut(day, parts, email);
}

// Lists the days that have a free time. `email` is the one already given, kept when someone changes the time.
async function startBooking(ctx: BookingContext, email?: string, intro?: "again" | "filled"): Promise<void> {
  const now = new Date();
  const today = nairobiNow(now).day;
  const held = await lookUpBookings(ctx.from, now);
  if (!held) {
    await sayWentWrong(ctx, "Could not read this number's bookings");
    return;
  }
  if (held.upcoming) {
    await say(ctx, [alreadyBookedOut(held.upcoming.consultation_date, held.upcoming.consultation_time)]);
    return;
  }
  if (held.recent >= MAX_CHAT_BOOKINGS_PER_DAY) {
    await say(ctx, [textOut("booking:limit", COPY.limit)]);
    return;
  }
  const booked = await loadBooked(today, addDays(today, HORIZON_DAYS));
  if (!booked) {
    await sayWentWrong(ctx, "Could not read the booked call times");
    return;
  }
  const days = openDays(now, booked);
  if (days.length === 0) {
    await say(ctx, [textOut("booking:day", COPY.noFreeDays)]);
    return;
  }
  await say(ctx, [dayListOut(days, now, { intro: intro ?? (email ? "again" : "first"), email })]);
}

async function showDay(ctx: BookingContext, day: string, email?: string): Promise<void> {
  const now = new Date();
  const booked = await loadBooked(day, day);
  if (!booked) {
    await sayWentWrong(ctx, "Could not read the booked call times");
    return;
  }
  const times = freeTimes(day, now, booked);
  if (times.length === 0) {
    await startBooking(ctx, email, emptyDayIntro(day, now));
    return;
  }
  await say(ctx, [offerTimes(day, times, email)]);
}

async function showPart(ctx: BookingContext, day: string, part: "am" | "pm" | "eve", email?: string): Promise<void> {
  const booked = await loadBooked(day, day);
  if (!booked) {
    await sayWentWrong(ctx, "Could not read the booked call times");
    return;
  }
  const times = timesInPart(freeTimes(day, new Date(), booked), part);
  if (times.length === 0) {
    await showDay(ctx, day, email);
    return;
  }
  await say(ctx, [timesOut(day, times, { email })]);
}

// A time was picked: if it is still free, on to the email (or the confirmation card when the email is known).
async function chooseTime(ctx: BookingContext, day: string, time: string, email?: string): Promise<void> {
  const now = new Date();
  const booked = await loadBooked(day, day);
  if (!booked) {
    await sayWentWrong(ctx, "Could not read the booked call times");
    return;
  }
  if (!isFree(day, time, now, booked)) {
    await reofferTimes(ctx, day, time, email, now, booked);
    return;
  }
  await say(ctx, [email ? confirmOut(day, time, email) : askEmailOut(day, time)]);
}

// Someone took the time a moment ago: offer the other times of the same part of the day, or the whole day if none are
// left, or the days if the day is full.
async function reofferTimes(ctx: BookingContext, day: string, time: string, email: string | undefined, now: Date, booked: Booked): Promise<void> {
  const times = freeTimes(day, now, booked);
  if (times.length === 0) {
    await startBooking(ctx, email, emptyDayIntro(day, now));
    return;
  }
  const samePart = timesInPart(times, partOf(time));
  await say(ctx, [offerTimes(day, samePart.length > 0 ? samePart : times, email, true)]);
}

const PENDING_MEET_LINK = "https://meet.google.com/pending"; // what the website stores when Google did not make a link

// Calls one of the booking functions as the service role. It never throws; a failure comes back as an error.
async function callFunction(name: string, body: unknown): Promise<{ ok: boolean; data: Record<string, unknown> | null; error?: string }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(BOOKING_CALL_MS),
    });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (res.ok) return { ok: true, data };
    return { ok: false, data, error: `${name} answered ${res.status}: ${JSON.stringify(data).slice(0, 200)}` };
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    const detail = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      data: null,
      error: timedOut ? `${name} did not answer within ${BOOKING_CALL_MS / 1000} seconds` : `The call to ${name} failed: ${detail}`,
    };
  }
}

// This number's bookings, once: the one that is still to come, if any, and how many were made in the chat in the last
// day. Null when they can't be read.
async function lookUpBookings(phone: string, now: Date): Promise<{ upcoming: BookingRow | null; recent: number } | null> {
  const { data, error } = await admin
    .from("consultation_bookings")
    .select("id, consultation_date, consultation_time, status, booked_via, created_at, meeting_link, email")
    .in("phone_number", phoneVariants(phone));
  if (error || !data) {
    console.error("Could not read this number's bookings:", error);
    return null;
  }
  const rows = data as BookingRow[];
  return { upcoming: rows.find((row) => isUpcoming(row, now)) ?? null, recent: countRecentChatBookings(rows, now) };
}

type BookingProblem = "read_failed" | "not_saved" | "no_link" | "email_failed" | "change";

const BOOKING_PROBLEMS: Record<BookingProblem, { subject: string; heading: string; accent: Accent; note: string }> = {
  read_failed: {
    subject: "⚠️ WhatsApp: a booking in the chat could not read the free times",
    heading: "A booking in the chat could not read the free times",
    accent: AMBER,
    note: "They were told the team will book it with them. Please reply to them in the WhatsApp inbox.",
  },
  not_saved: {
    subject: "⚠️ WhatsApp: a booking in the chat could not be saved",
    heading: "A booking in the chat could not be saved",
    accent: RED,
    note: "Nothing was booked and nobody was invited. They were told the team will book it with them. Please reply to them in the WhatsApp inbox.",
  },
  no_link: {
    subject: "⚠️ WhatsApp: booked, but no Meet link",
    heading: "Booked, but the Google Meet link could not be made",
    accent: AMBER,
    note: "The booking is saved and they were told the link will follow, but nobody has been invited and no confirmation email went. Please make the Google Meet link and send it to them in the chat.",
  },
  email_failed: {
    subject: "⚠️ WhatsApp: the confirmation email did not send",
    heading: "The confirmation email did not send",
    accent: AMBER,
    note: "The booking is saved, they have the details in the chat and Google's calendar invite. Only the confirmation email is missing.",
  },
  change: {
    subject: "WhatsApp: change or cancel a call",
    heading: "They want to change or cancel their call",
    accent: AMBER,
    note: "Please move or cancel the booking in the admin, then confirm with them in the chat.",
  },
};

// One email to the team about a booking in the chat that needs a person. Sent after the reply it is about.
async function alertBooking(
  kind: BookingProblem,
  ctx: BookingContext,
  details: { detail?: string; day?: string; time?: string; email?: string; link?: string | null; bookingId?: string; history?: Msg[] } = {},
): Promise<void> {
  const problem = BOOKING_PROBLEMS[kind];
  if (kind !== "change") console.error(`Booking in the chat: ${kind}`, details.detail ?? "");
  const facts: [string, string][] = whoFacts({ phone: ctx.from, profileName: ctx.profileName, parentId: ctx.parentId });
  if (details.day && details.time) facts.push(["The call", `${longDay(details.day)}, ${niceTime(details.time)} Nairobi time (EAT)`]);
  if (details.email) facts.push(["Email", details.email]);
  if (details.link) facts.push(["Google Meet", details.link]);
  if (details.bookingId) facts.push(["Booking id", details.bookingId]);
  if (details.detail) facts.push(["What went wrong", details.detail]);
  await sendAlert({
    subject: `${problem.subject} — ${ctx.profileName || ctx.from}`,
    heading: problem.heading,
    accent: problem.accent,
    facts,
    notes: [problem.note],
    history: await chatSoFar(ctx.from, details.history ?? []),
  });
}

// This number already has an upcoming booking. The same time means a second tap on Confirm: say nothing while the first
// is still being set up, or repeat the details once it is finished. Any other time means they already have a call.
// Returns true when it has dealt with the tap.
async function answerHeld(
  ctx: BookingContext,
  upcoming: BookingRow | null,
  day: string,
  time: string,
  email: string,
  now: Date,
  history: Msg[],
): Promise<boolean> {
  if (!upcoming) return false;
  if (upcoming.consultation_date === day && upcoming.consultation_time === time) {
    const stored = upcoming.meeting_link ?? "";
    const settingUp = stored === "" && Date.parse(upcoming.created_at ?? "") > now.getTime() - 120_000;
    if (!settingUp) {
      const link = stored !== "" && !stored.endsWith("/pending") ? stored : null;
      await say(ctx, [bookedOut({ day, time, email: upcoming.email ?? email, link, id: upcoming.id })], history);
    }
    return true;
  }
  await say(ctx, [alreadyBookedOut(upcoming.consultation_date, upcoming.consultation_time)], history);
  return true;
}

// The time is no longer free. It may be this very number's own booking, made a moment ago by a second tap, in which
// case there is nothing to say; otherwise someone else has it, and the other times are offered.
async function timeGone(ctx: BookingContext, day: string, time: string, email: string, now: Date, history: Msg[]): Promise<void> {
  const held = await lookUpBookings(ctx.from, now);
  if (held && (await answerHeld(ctx, held.upcoming, day, time, email, now, history))) return;
  const booked = await loadBooked(day, day);
  if (!booked) {
    await sayWentWrong(ctx, "Could not read the booked call times");
    return;
  }
  await reofferTimes(ctx, day, time, email, now, booked);
}

// "Confirm" was tapped. The order is the design: reserve the time first, so the side effects can fail without losing it.
async function confirmBooking(ctx: BookingContext, day: string, time: string, history: Msg[]): Promise<void> {
  const flow = currentFlow(history);
  const card = flow?.step === "confirm" && flow.day === day && flow.time === time ? (flow.email ?? null) : null;
  const now = new Date();

  const held = await lookUpBookings(ctx.from, now);
  if (!held) {
    await sayWentWrong(ctx, "Could not read this number's bookings");
    return;
  }
  // A second tap on Confirm, or a call already booked, whichever message the button is on.
  if (await answerHeld(ctx, held.upcoming, day, time, card ?? "", now, history)) return;
  if (card === null) {
    // The button is from an older message: show where the booking really is.
    await startBooking(ctx, isOpen(flow) ? flow.email : undefined);
    return;
  }
  const email = card;
  if (held.recent >= MAX_CHAT_BOOKINGS_PER_DAY) {
    await say(ctx, [textOut("booking:limit", COPY.limit)], history);
    return;
  }

  const booked = await loadBooked(day, day);
  if (!booked) {
    await sayWentWrong(ctx, "Could not read the booked call times");
    return;
  }
  if (!isFree(day, time, now, booked)) {
    await timeGone(ctx, day, time, email, now, history);
    return;
  }

  const row = bookingRow({ name: ctx.profileName, phone: ctx.from, email, day, time, history });
  const { data: saved, error } = await admin.from("consultation_bookings").insert(row).select().single();
  if (error || !saved) {
    // The slot rule says someone has it: another family, or this number's own tap a moment ago.
    if (error?.code === "23505") {
      await timeGone(ctx, day, time, email, now, history);
      return;
    }
    await say(ctx, [textOut("booking:error", COPY.wentWrong)], history);
    await alertBooking("not_saved", ctx, { detail: error?.message ?? "No row came back", day, time, email, history });
    return;
  }
  const bookingId = String(saved.id);

  // The Google event and its Meet link. If Google fails the booking stands, with the website's "pending" link.
  const calendar = await callFunction("create-consultation-calendar-event", {
    parentName: row.parent_name,
    studentName: "",
    email,
    phoneNumber: `+${ctx.from}`,
    consultationDate: day,
    consultationTime: time,
    subjects: [],
    gradeLevel: "",
    notes: row.additional_notes,
    source: "whatsapp",
  });
  const made = typeof calendar.data?.meetingLink === "string" ? calendar.data.meetingLink : "";
  const link = calendar.ok && calendar.data?.success === true && made !== "" && !made.endsWith("/pending") ? made : null;
  await admin.from("consultation_bookings").update({ meeting_link: link ?? PENDING_MEET_LINK }).eq("id", bookingId);

  await say(ctx, [bookedOut({ day, time, email, link, id: bookingId })], history);
  if (!link) {
    await alertBooking("no_link", ctx, { detail: calendar.error ?? "Google did not make a Meet link", day, time, email, bookingId, history });
  } else {
    const confirmation = await callFunction("send-consultation-booking-confirmation", {
      email,
      parentName: row.parent_name,
      studentName: "",
      consultationDate: day,
      consultationTime: time,
      meetingLink: link,
    });
    if (!confirmation.ok) await alertBooking("email_failed", ctx, { detail: confirmation.error, day, time, email, link, bookingId, history });
  }

  if (BOOKING_NOTICES_ON) {
    await sendAlert({
      subject: `WhatsApp: a call was booked in the chat — ${ctx.profileName || ctx.from}`,
      heading: "A call was booked in the WhatsApp chat",
      accent: GREEN,
      facts: [
        ...whoFacts({ phone: ctx.from, profileName: ctx.profileName, parentId: ctx.parentId }),
        ["Email", email],
        ["The call", `${longDay(day)}, ${niceTime(time)} Nairobi time (EAT)`],
        ["Google Meet", link ?? "not made yet"],
        ["Booking id", bookingId],
      ],
      notes: ["They booked it themselves in the chat. The lead is now \"Call booked\"."],
      history: await chatSoFar(ctx.from, []),
    });
  }
}

// A tap on one of Lana's booking buttons or list rows. The ids carry their own data, so a tap on an old message is
// checked against what is free now rather than trusted.
async function runBookingTap(ctx: BookingContext, action: Action, history: Msg[]): Promise<void> {
  // Lana's first answer already took the chat for the team; this only matters if the team gave it back.
  await claimForReply(ctx.from);
  if (!BOOKING_ON) {
    await say(ctx, [textOut("booking:off", COPY.teamArranges)], history);
    return;
  }
  const flow = currentFlow(history);
  const email = isOpen(flow) ? flow.email : undefined;
  switch (action.kind) {
    case "callback":
      await say(ctx, [textOut("booking:callback", CALLBACK_REPLY)], history);
      return;
    case "start":
      await startBooking(ctx);
      return;
    case "retime":
      await startBooking(ctx, email);
      return;
    case "reemail":
      if (isOpen(flow) && flow.day && flow.time) await say(ctx, [askEmailOut(flow.day, flow.time)], history);
      else await startBooking(ctx);
      return;
    case "day":
      await showDay(ctx, action.day, email);
      return;
    case "part":
      await showPart(ctx, action.day, action.part, email);
      return;
    case "time":
      await chooseTime(ctx, action.day, action.time, email);
      return;
    case "confirm":
      await confirmBooking(ctx, action.day, action.time, history);
      return;
    case "change": {
      // Changing or cancelling is the team's job for now: tell them which booking, and tell the family it is in hand.
      await say(ctx, [textOut("booking:change", COPY.changeAck)], history);
      const booking = (await lookUpBookings(ctx.from, new Date()))?.upcoming;
      await alertBooking("change", ctx, {
        day: booking?.consultation_date,
        time: booking?.consultation_time,
        email: booking?.email ?? undefined,
        link: booking?.meeting_link,
        bookingId: booking?.id,
        history,
      });
      return;
    }
  }
}

// What the family typed while a booking step is open: the email, mostly. Short messages sent one after another are one
// thought, so it waits and lets the newest of them answer for all.
async function runBookingText(ctx: BookingContext, msgId: string): Promise<void> {
  await sleep(REPLY_DELAY_MS);
  const chat = await getConversation(ctx.from);
  if (!chat) return;
  const flow = currentFlow(chat.messages);
  if (!isOpen(flow)) return; // the team replied meanwhile, or the flow ended
  if (chat.messages.filter((m) => m.role === "user").at(-1)?.wa_id !== msgId) return;
  await claimForReply(ctx.from);

  const sinceLana = chat.messages.slice(chat.messages.map((m) => m.role).lastIndexOf("model") + 1);
  const email = sinceLana
    .filter((m) => m.role === "user" && !m.attachment && !m.tap)
    .map((m) => findEmail(m.content))
    .find((found) => found !== null) ?? null;

  if (flow.step === "email" && flow.day && flow.time) {
    if (email) await say(ctx, [confirmOut(flow.day, flow.time, email)], chat.messages);
    else if ((flow.tries ?? 0) >= 1) await say(ctx, [textOut("booking:email", COPY.emailGiveUp)], chat.messages); // no state: the flow ends
    else await say(ctx, [askEmailOut(flow.day, flow.time, { tries: 1 })], chat.messages);
    return;
  }
  if (flow.step === "confirm" && flow.day && flow.time && email) {
    await say(ctx, [confirmOut(flow.day, flow.time, email)], chat.messages);
    return;
  }
  if (flow.nudged) return; // one reminder is enough; after that it is a conversation with the team
  await say(ctx, [textOut(`booking:${flow.step}`, COPY.nudge, { ...flow, nudged: true })], chat.messages);
}

// ---------------- WEBHOOK HANDLER ----------------

// The parts of Meta's webhook payload this function reads.
type WaMessage = {
  from: string;
  id: string;
  type: string;
  text?: { body?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { id?: string; title?: string }; list_reply?: { id?: string; title?: string } };
  [attachment: string]: unknown;
};
type WebhookBody = {
  entry?: { changes?: { value?: { messages?: WaMessage[]; contacts?: { profile?: { name?: string } }[] } }[] }[];
};

const ATTACHMENT_LABELS: Record<string, string> = {
  image: "Image",
  video: "Video",
  audio: "Audio",
  document: "Document",
  sticker: "Sticker",
  location: "Location",
  contacts: "Contact card",
};

// What an incoming message says, as it is saved and shown to the AI. A tapped reply button or list choice reads as
// the text on it, and its id is kept as `tap`. An attachment is saved as a label so the team can see what arrived:
// Lana can't open it, but she reads its caption. Reactions need no answer.
function readIncoming(msg: WaMessage): Pick<Msg, "content" | "attachment" | "tap"> | null {
  switch (msg.type) {
    case "reaction":
      return null;
    case "text":
      return { content: msg.text?.body ?? "" };
    case "button":
      return { content: msg.button?.text ?? "" };
    case "interactive": {
      const reply = msg.interactive?.button_reply ?? msg.interactive?.list_reply;
      return { content: reply?.title ?? "", ...(reply?.id && { tap: reply.id }) };
    }
    default: {
      const media = (msg[msg.type] ?? {}) as { id?: string; caption?: string; filename?: string; voice?: boolean };
      const label = media.voice ? "Voice note" : ATTACHMENT_LABELS[msg.type] ?? "Attachment";
      const caption = media.caption?.trim() || undefined;
      return {
        content: `[${label}${media.filename ? `: ${media.filename}` : ""}]${caption ? ` ${caption}` : ""}`,
        attachment: { type: msg.type, id: media.id, caption },
      };
    }
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function handleIncoming(body: WebhookBody) {
  // What the catch at the bottom can tell the team if something unexpected goes wrong part-way.
  const known: { phone?: string; profileName?: string; text?: string } = {};
  try {
    const change = body.entry?.[0]?.changes?.[0]?.value;
    const msg = change?.messages?.[0];
    if (!msg) {
      console.log("No message (likely status update). Skip.");
      return;
    }
    const from = msg.from;
    const profileName = change?.contacts?.[0]?.profile?.name;
    known.phone = from;
    known.profileName = profileName;

    const incoming = readIncoming(msg);
    if (!incoming) {
      console.log(`Ignoring a ${msg.type} from ${from}.`);
      return;
    }
    const text = incoming.content;
    known.text = text;
    console.log(`Incoming from ${profileName ?? from}: ${text}`);

    const convo = await loadConversation(from, profileName);
    if (!convo) {
      console.error("Could not load/create conversation");
      return;
    }

    const saved = await appendMessages(from, [
      {
        role: "user",
        content: text,
        ts: new Date().toISOString(),
        wa_id: msg.id,
        ...(incoming.attachment && { attachment: incoming.attachment }),
        ...(incoming.tap && { tap: incoming.tap }),
      },
    ]);
    if (!saved) {
      console.error(`Could not save the message from ${from}`);
      return;
    }
    if (!saved.added) {
      console.log(`Already have message ${msg.id} from ${from}: Meta delivered it twice.`);
      return;
    }

    // Log inbound
    await logComm({ phone: from, parentId: convo.parent_id, direction: "inbound", content: text });

    // Handle opt-out or abusive replies immediately (works even if escalated)
    if (!incoming.attachment && isOptOutOrAbusiveMessage(text)) {
      await suppressWhatsAppNumber(from, "inbound_reply");
      const confirmation = [
        "Understood. We've removed you from our WhatsApp marketing list, so you won't get any more promotional messages.",
        "",
        "If you need help with anything, please reach us at info@lanatutors.africa."
      ].join("\n");
      const confirmed = await sendWhatsAppMessage(from, confirmation);
      if (!confirmed.ok) {
        await alertSendFailed({ phone: from, profileName, parentId: convo.parent_id, error: confirmed.error, history: saved.convo.messages });
        return;
      }
      await logComm({ phone: from, parentId: convo.parent_id, direction: "outbound", content: confirmation });
      const now = new Date().toISOString();
      await appendMessages(from, [{ role: "model", content: confirmation, ts: now, via: "opt_out" }], { escalated: true, escalated_at: now });
      return;
    }

    // Taps on the booking buttons and lists, and the typed email while a booking is open, belong to the booking flow.
    // They are read even when the chat is with the team, which is where Lana's first answer leaves it.
    const ctx: BookingContext = { from, profileName, parentId: convo.parent_id };
    const action = incoming.tap ? parseTap(incoming.tap) : null;
    if (action) {
      await runBookingTap(ctx, action, saved.convo.messages);
      return;
    }
    if (BOOKING_ON && !incoming.attachment && !incoming.tap && isOpen(currentFlow(saved.convo.messages))) {
      await runBookingText(ctx, msg.id);
      return;
    }

    // If a human has taken over, the message is saved for them and Lana stays silent.
    // This flag is also what limits Lana to one answer: she takes the chat to answer (claimForReply) and the team
    // has it afterwards, and "Resume AI" clears it so she answers once more. Earlier replies in the history, hers or
    // the team's, don't count against her.
    if (saved.convo.escalated) {
      console.log(`Convo escalated — saved inbound from ${from}, AI silent.`);
      return;
    }

    // People often send one thought as two or three messages. Wait a moment so that one reply reads all of them:
    // whichever message arrived last answers for the lot.
    await sleep(isGreeting(text) ? REPLY_DELAY_MS * 4 : REPLY_DELAY_MS);
    const latest = await getConversation(from);
    if (!latest || latest.escalated) return;
    const history = latest.messages;
    if (history.filter((m) => m.role === "user").at(-1)?.wa_id !== msg.id) {
      console.log(`A newer message from ${from} will be answered instead.`);
      return;
    }
    // What they've said since anyone last replied, and the part of it Lana can read.
    const lastReply = history.map((m) => m.role).lastIndexOf("model");
    const pending = history.slice(lastReply + 1);
    const readable = pending.filter((m) => !m.attachment || m.attachment.caption);

    // Only attachments so far: ask once for a typed message. That is not an answer, so Lana keeps the chat; if
    // they send more attachments, the team takes it.
    if (readable.length === 0) {
      if (history[lastReply]?.via === "notice:attachment") {
        await claimForReply(from);
        return;
      }
      const noticed = await sendWhatsAppMessage(from, ATTACHMENT_NOTICE);
      if (!noticed.ok) {
        await alertSendFailed({ phone: from, profileName, parentId: convo.parent_id, error: noticed.error, history });
        return;
      }
      await logComm({ phone: from, parentId: convo.parent_id, direction: "outbound", content: ATTACHMENT_NOTICE });
      await appendMessages(from, [{ role: "model", content: ATTACHMENT_NOTICE, ts: new Date().toISOString(), via: "notice:attachment" }]);
      return;
    }

    // Prize and loan scams get no reply: the parent script is wrong for them and the team has no use for the hand-off.
    if (readable.every((m) => looksLikeSpam(m.content))) {
      console.log(`Ignoring what looks like spam from ${from}.`);
      return;
    }

    if (!(await claimForReply(from))) {
      console.log(`Another reply to ${from} is already on its way.`);
      return;
    }
    // Anything that arrived while the chat was being taken is part of what Lana answers.
    const context = (await getConversation(from))?.messages ?? history;

    // The website's chat button prefills what the person wants to say. Someone who sends that unchanged, and nothing
    // else, has already told us what they want, so they get the team's own reply and the AI is not asked.
    let reply: string;
    let via: string;
    let aiFailure: string | null = null;
    let firstAiFailure: string | null = null; // why the first AI failed, when the second one answered instead
    let askedForTheLink = false; // the AI fetched the assessment-call link, so its reply is offering the call
    const prefilled = pending.length === 1 ? matchPrefill(pending[0].content) : null;
    if (prefilled?.intent === "assessment_call" && BOOKING_ON) {
      // The plainest request there is to book: no script, the days to choose from.
      await startBooking(ctx);
      return;
    }
    if (prefilled) {
      reply = prefilled.reply;
      via = `prefill:${prefilled.intent}`;
    } else {
      let ai = await callAI(context, profileName, convo.parent_id, from);
      if (!ai.ok && ANTHROPIC_API_KEY) {
        // The first AI failed, so Claude gets one try. If it answers, the team is told why it was needed.
        const second = await callClaude(context, profileName, convo.parent_id);
        if (second.ok) firstAiFailure = ai.reason;
        ai = second.ok ? second : { ok: false, reason: `${ai.reason}. The second AI also failed: ${second.reason}` };
      }
      if (ai.ok) {
        reply = sanitizeReply(ai.text);
        via = ai.via;
        askedForTheLink = ai.offeredBooking === true;
      } else {
        reply = BACKUP_REPLY;
        via = "backup";
        aiFailure = ai.reason;
      }
    }

    // A reply that offers the assessment call carries the two buttons that start booking it in the chat. If WhatsApp
    // refuses a message, say() has told the team and the chat stays with them (Lana took it to answer).
    const offering = BOOKING_ON && offersCall(reply, askedForTheLink);
    const sent = await say(ctx, offering ? offerOut(stripSignOff(reply), via) : [textOut(via, reply)], context);
    if (!sent) return;

    if (aiFailure) {
      await alertAiFailure({ phone: from, profileName, parentId: convo.parent_id, reason: aiFailure, history: [...context, ...sent] });
    } else if (firstAiFailure) {
      await alertFallbackUsed({ phone: from, profileName, parentId: convo.parent_id, reason: firstAiFailure, history: [...context, ...sent] });
    }

  } catch (e) {
    console.error("handleIncoming error:", e);
    await alertCrash({ phone: known.phone, profileName: known.profileName, text: known.text, error: e });
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method === "POST") {
    try {
      const rawBody = await req.text();
      const signature = req.headers.get("x-hub-signature-256");
      const valid = await verifyWhatsAppSignature(rawBody, signature);
      if (!valid) {
        console.error("Rejected WhatsApp webhook: invalid X-Hub-Signature-256");
        return new Response(JSON.stringify({ error: "invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!WA_APP_SECRET) {
        console.warn("WHATSAPP_APP_SECRET is not set — webhook signatures are NOT enforced. Set it in Supabase to activate verification.");
      }
      const body: WebhookBody = JSON.parse(rawBody);
      console.log("WA webhook payload:", JSON.stringify(body));
      // Answer Meta straight away (it retries after 5 seconds), and hand the runtime the reply work, which waits for
      // follow-up messages and then the AI, so it is not cut off once the response has gone.
      const work = handleIncoming(body);
      (globalThis as { EdgeRuntime?: { waitUntil(promise: Promise<unknown>): void } }).EdgeRuntime?.waitUntil(work);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Webhook error:", error);
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
