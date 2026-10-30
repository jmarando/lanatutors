import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { BACKUP_REPLY, looksLikeSpam, matchPrefill } from "./lana.ts";

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
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const WA_APP_SECRET = Deno.env.get("WHATSAPP_APP_SECRET");

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

// `via` records how a bot message was produced ("ai", "backup" when the AI failed, or "prefill:<intent>" for a ready-made
// reply); `sent_by: "human"` marks the team's replies.
type Msg = { role: "user" | "model"; content: string; ts: string; via?: string; sent_by?: string };

async function sendWhatsAppMessage(to: string, text: string) {
  // Safety: strip any "— Lana 💛" / "- Lana" sign-offs the model may add
  const cleaned = text
    .replace(/\n*\s*[—-]\s*Lana\s*(💛|❤️|♥|<3)?\s*$/i, "")
    .replace(/\n*\s*Lana\s*(💛|❤️|♥)\s*$/i, "")
    .trim();
  const res = await fetch(`https://graph.facebook.com/v21.0/${WA_PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: cleaned, preview_url: true },
    }),
  });
  const data = await res.json();
  if (!res.ok) console.error("WA send error:", data);
  return data;
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

  const { data: created } = await admin
    .from("whatsapp_conversations")
    .insert({
      phone_number: phone,
      profile_name: profileName ?? null,
      parent_id: parentId,
      messages: [],
    })
    .select()
    .single();
  return created;
}

async function saveConversation(phone: string, messages: Msg[], escalated?: boolean) {
  const trimmed = messages.slice(-20);
  const patch: Record<string, unknown> = {
    messages: trimmed,
    last_message_at: new Date().toISOString(),
  };
  if (escalated) {
    patch.escalated = true;
    patch.escalated_at = new Date().toISOString();
  }
  await admin.from("whatsapp_conversations").update(patch).eq("phone_number", phone);
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
type AiResult = { ok: true; text: string } | { ok: false; reason: string };

const MAX_TOOL_ROUNDS = 4;
const AI_TIMEOUT_MS = 25_000;

function parseToolArgs(raw: string | undefined): Record<string, string> {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

// Calls the AI. When it can't answer, the result says why, so the caller can alert the team instead
// of failing silently.
async function callAI(
  history: Msg[],
  profileName: string | undefined,
  parentId: string | null,
  phone: string,
): Promise<AiResult> {
  const sys =
    SYSTEM_PROMPT +
    (profileName ? `\n\nParent's WhatsApp name: "${profileName}".` : "") +
    (parentId ? `\nThis WhatsApp number IS linked to an existing parent account.` : `\nThis WhatsApp number is NOT linked to an existing parent account yet.`);

  const messages: GatewayMessage[] = [
    { role: "system", content: sys },
    ...history.map((m): GatewayMessage => ({ role: m.role === "model" ? "assistant" : "user", content: m.content })),
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
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
        signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      });
      if (res.ok) data = await res.json();
    } catch (e) {
      const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
      const detail = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        reason: timedOut
          ? `The AI gateway timed out after ${AI_TIMEOUT_MS / 1000} seconds`
          : `The AI gateway call failed: ${detail}`,
      };
    }
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      return { ok: false, reason: `The AI gateway answered ${res.status}: ${detail}` };
    }

    const message = data?.choices?.[0]?.message;
    const calls = message?.tool_calls ?? [];

    if (calls.length === 0) {
      const text = message?.content?.trim();
      return text ? { ok: true, text } : { ok: false, reason: "The AI answered with an empty message" };
    }

    // Append the model's turn (with its tool calls), then answer each call.
    messages.push({ role: "assistant", content: message?.content ?? null, tool_calls: calls });
    for (const call of calls) {
      const args = parseToolArgs(call.function.arguments);
      let result: unknown = { ok: true };
      if (call.function.name === "get_booking_link") {
        result = toolGetBookingLink({ type: args.type ?? "" });
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

  return { ok: true, text: "Thanks — our team will follow up shortly." };
}

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

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
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY missing — cannot send the AI failure alert");
    return;
  }
  const transcript = args.history
    .map((m) => `${m.role === "user" ? "Parent" : m.sent_by === "human" ? "Team" : "Lana"}: ${m.content}`)
    .join("\n\n");
  const html = `
    <table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;background:#fef5f4;padding:24px;">
      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border-top:4px solid #f59e0b;">
          <tr><td>
            <h2 style="color:#b45309;margin:0 0 12px;">Lana's AI could not reply</h2>
            <p style="margin:4px 0;"><strong>From:</strong> ${escapeHtml(args.profileName ?? "Unknown")} (+${escapeHtml(args.phone)})</p>
            <p style="margin:4px 0;"><strong>Parent ID:</strong> ${args.parentId ?? "Not linked"}</p>
            <p style="margin:4px 0;"><strong>What went wrong:</strong> ${escapeHtml(args.reason)}</p>
            <p style="margin:12px 0 4px;">They were sent a short backup message asking who they are, and the chat is now with the team. Please reply to them on WhatsApp.</p>
            <p style="margin:4px 0;color:#777;font-size:13px;">If this keeps happening, check the Lovable AI gateway (credits and status) and the whatsapp-webhook function logs.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:16px 0;"/>
            <h3 style="color:#333;">Transcript</h3>
            <pre style="white-space:pre-wrap;font-family:Arial,sans-serif;background:#fafafa;padding:12px;border-radius:8px;font-size:14px;">${escapeHtml(transcript)}</pre>
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
        subject: `⚠️ WhatsApp: Lana's AI could not reply — ${args.profileName ?? args.phone}`,
        html,
      }),
    });
    if (!r.ok) console.error("Resend AI-failure alert failed:", await r.text());
  } catch (e) {
    console.error("AI-failure alert error:", e);
  }
}

// ---------------- WEBHOOK HANDLER ----------------

async function handleIncoming(body: any) {
  try {
    const change = body.entry?.[0]?.changes?.[0]?.value;
    const msg = change?.messages?.[0];
    if (!msg) {
      console.log("No message (likely status update). Skip.");
      return;
    }
    const from = msg.from;
    const profileName = change?.contacts?.[0]?.profile?.name;

    if (msg.type !== "text") {
      console.log("Non-text message:", msg.type);
      await sendWhatsAppMessage(
        from,
        "Thanks for your message. I can only read text right now — please type your question and I'll help.",
      );
      return;
    }

    const text = msg.text?.body ?? "";
    console.log(`Incoming from ${profileName ?? from}: ${text}`);

    const convo = await loadConversation(from, profileName);
    if (!convo) {
      console.error("Could not load/create conversation");
      return;
    }

    // Log inbound
    await logComm({ phone: from, parentId: convo.parent_id, direction: "inbound", content: text });

    // Handle opt-out or abusive replies immediately (works even if escalated)
    if (isOptOutOrAbusiveMessage(text)) {
      await suppressWhatsAppNumber(from, "inbound_reply");
      const confirmation = [
        "Understood. We've removed you from our WhatsApp marketing list, so you won't get any more promotional messages.",
        "",
        "If you need help with anything, please reach us at info@lanatutors.africa."
      ].join("\n");
      await sendWhatsAppMessage(from, confirmation);
      await logComm({ phone: from, parentId: convo.parent_id, direction: "outbound", content: confirmation });
      const history: Msg[] = Array.isArray(convo.messages) ? convo.messages : [];
      history.push({ role: "user", content: text, ts: new Date().toISOString() });
      history.push({ role: "model", content: confirmation, ts: new Date().toISOString() });
      await saveConversation(from, history, true);
      return;
    }

    const history: Msg[] = Array.isArray(convo.messages) ? convo.messages : [];
    history.push({ role: "user", content: text, ts: new Date().toISOString() });

    // If a human has taken over, just save the inbound message and stay silent.
    // The admin replies from the WhatsApp Inbox; no canned auto-reply.
    // This flag is also what limits Lana to one auto-reply: she hands the chat to the team after replying (below),
    // and "Resume AI" clears it so she answers once more. Earlier replies in the history, hers or the team's,
    // don't count against her.
    if (convo.escalated) {
      console.log(`Convo escalated — saving inbound from ${from}, AI silent.`);
      await saveConversation(from, history);
      return;
    }

    // Prize and loan scams get no reply: the parent script is wrong for them and the team has no use for the hand-off.
    if (looksLikeSpam(text)) {
      console.log(`Ignoring what looks like spam from ${from}.`);
      await saveConversation(from, history);
      return;
    }

    // The website's chat button prefills what the person wants to say. Someone who sends that unchanged has
    // already told us what they want, so they get the team's own reply and the AI is not asked.
    let reply: string;
    let via: string;
    let aiFailure: string | null = null;
    const prefilled = matchPrefill(text);
    if (prefilled) {
      reply = prefilled.reply;
      via = `prefill:${prefilled.intent}`;
    } else {
      const ai = await callAI(history, profileName, convo.parent_id, from);
      if (ai.ok) {
        reply = sanitizeReply(ai.text);
        via = "ai";
      } else {
        reply = BACKUP_REPLY;
        via = "backup";
        aiFailure = ai.reason;
      }
    }

    await sendWhatsAppMessage(from, reply);
    await logComm({ phone: from, parentId: convo.parent_id, direction: "outbound", content: reply });

    history.push({ role: "model", content: reply, ts: new Date().toISOString(), via });
    // Always hand off after an auto-reply.
    await saveConversation(from, history, true);

    if (aiFailure) {
      await alertAiFailure({ phone: from, profileName, parentId: convo.parent_id, reason: aiFailure, history });
    }

  } catch (e) {
    console.error("handleIncoming error:", e);
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
      const body = JSON.parse(rawBody);
      console.log("WA webhook payload:", JSON.stringify(body));
      // fire-and-forget so we ACK within Meta's 5s window
      handleIncoming(body);
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
