import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
const WA_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const SYSTEM_PROMPT = `You are Lana, the WhatsApp assistant for Lana Tutors — Kenya's premium tutoring platform for local and diaspora families.

YOUR ONE JOB
Your job is NOT to answer everything yourself. It is to understand what the parent needs in a sentence or two, then connect them to our Learning Coordinator, who matches the child to the right tutor, confirms rates and sets up the schedule.

WHAT WE OFFER (context only — keep it brief)
- 1-on-1 tutoring: CBC (Kenya), British (IGCSE/A-Levels), American, IB. Online (Google Meet) or in-person in Nairobi.
- Single sessions, lesson packages, or a custom learning plan.
- Vetted tutors. All emails come from info@lanatutors.africa.

HOW TO HANDLE A PARENT
1. Warm one-line acknowledgement, using their first name if known.
2. Ask at most ONE or TWO short questions to understand the need: child's grade/year and curriculum, and the subject(s) they're struggling with.
3. Then hand them to the Learning Coordinator: offer either a quick call back from the coordinator (ask for the best time to call) OR a free 20-minute Academic Assessment Call they can book themselves:
   https://lanatutors.africa/book-consultation
4. Once you have their need and a preference, call escalate_to_team so the coordinator picks it up, and reply with a short confirmation that the coordinator will be in touch.

WHAT NOT TO DO
- Never recommend or list individual tutors, and never send tutor profile links. Tutor matching is the Learning Coordinator's job — say "our Learning Coordinator will match [child] with the right tutor".
- Never quote or estimate prices. Rates depend on curriculum, level and subject and are shared after the assessment. Say that, then offer the coordinator.
- Never dump a menu of options or a wall of links. One link at a time, only when it's the natural next step.
- Never invent availability, tutor names or timelines.

STYLE
- Warm, human, conversational. 2-3 short sentences max — WhatsApp users skim.
- No emojis, smileys or emoticons. Plain text only.
- No sign-off, no "— Lana", no signature.
- When you do share a link, paste the full https://lanatutors.africa/... on its own line.
- For complaints, payments or account issues: empathize briefly, escalate, and say a team member from info@lanatutors.africa will follow up.

TOOLS
- get_booking_link: to fetch the correct link when booking is the next step.
- escalate_to_team: to hand the parent to the Learning Coordinator — use this as soon as you know roughly what they need, or if they want a call back, or for any complaint/payment issue.
Do not use tutor lookup to recommend tutors; the coordinator handles matching.
Call escalate_to_team ONCE and then reply with a brief holding message. Don't keep auto-replying after escalation.`;

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

type Msg = { role: "user" | "model"; content: string; ts: string };

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

async function toolLookupTutors(args: { subject?: string; curriculum?: string }) {
  try {
    const { data } = await admin.rpc("get_public_tutor_profiles");
    if (!data) return { results: [] };
    let list = data as any[];
    if (args.subject) {
      const s = args.subject.toLowerCase();
      list = list.filter((t) =>
        (t.subjects ?? []).some((x: string) => x.toLowerCase().includes(s))
      );
    }
    if (args.curriculum) {
      const c = args.curriculum.toLowerCase();
      list = list.filter((t) =>
        (t.curriculum ?? []).some((x: string) => x.toLowerCase().includes(c))
      );
    }
    const top = list.slice(0, 3).map((t) => ({
      name: t.full_name,
      subjects: (t.subjects ?? []).slice(0, 4),
      curriculum: (t.curriculum ?? []).slice(0, 3),
      experience_years: t.experience_years,
      bio: (t.bio ?? "").slice(0, 180),
      profile_url: t.profile_slug
        ? `https://lanatutors.africa/tutor/${t.profile_slug}`
        : "https://lanatutors.africa",
    }));
    return { count: top.length, results: top };
  } catch (e) {
    console.error("lookup_tutors error:", e);
    return { results: [], error: "lookup failed" };
  }
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

// ---------------- GEMINI WITH TOOLS ----------------

async function callGemini(
  history: Msg[],
  profileName: string | undefined,
  parentId: string | null,
  phone: string,
): Promise<{ text: string; escalated: boolean }> {
  if (!GEMINI_API_KEY) return { text: fallbackReply(), escalated: false };

  const contents = history.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  const sys =
    SYSTEM_PROMPT +
    (profileName ? `\n\nParent's WhatsApp name: "${profileName}".` : "") +
    (parentId ? `\nThis WhatsApp number IS linked to an existing parent account.` : `\nThis WhatsApp number is NOT linked to an existing parent account yet.`);

  let escalated = false;
  const maxRounds = 4;

  for (let round = 0; round < maxRounds; round++) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sys }] },
        contents,
        tools: [{ functionDeclarations: TOOLS }],
      }),
    });
    if (!res.ok) {
      console.error("Gemini error:", res.status, await res.text());
      return { text: fallbackReply(), escalated };
    }
    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const calls = parts.filter((p: any) => p.functionCall);
    const textParts = parts.filter((p: any) => p.text).map((p: any) => p.text);

    if (calls.length === 0) {
      const text = textParts.join("").trim() || fallbackReply();
      return { text, escalated };
    }

    // Append model turn (with function calls) and execute each
    contents.push({ role: "model", parts });

    for (const c of calls) {
      const name = c.functionCall.name;
      const args = c.functionCall.args ?? {};
      let result: unknown = { ok: true };
      if (name === "lookup_tutors") {
        result = await toolLookupTutors(args);
      } else if (name === "get_booking_link") {
        result = toolGetBookingLink(args);
      } else if (name === "escalate_to_team") {
        escalated = true;
        result = await toolEscalate({
          reason: args.reason ?? "unspecified",
          phone,
          profileName,
          parentId,
          history,
        });
      }
      contents.push({
        role: "user",
        parts: [{ functionResponse: { name, response: result } }],
      } as any);
    }
  }

  return { text: "Thanks — our team will follow up shortly.", escalated };
}

function fallbackReply() {
  return [
    "Hi, thanks for reaching out to Lana Tutors. So I point you the right way — what grade or year is your child in, which curriculum, and which subjects are giving trouble?",
    "",
    "Our Learning Coordinator will then match your child with the right tutor and share the rate. If it's easier, tell me a good time to call you, or book a free 20-minute assessment call here:",
    "https://lanatutors.africa/book-consultation",
  ].join("\n");
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
    if (convo.escalated) {
      console.log(`Convo escalated — saving inbound from ${from}, AI silent.`);
      await saveConversation(from, history);
      return;
    }

    // Lana only sends ONE auto-reply per conversation. If she has already
    // replied at any point, hand the thread to a human and stay silent
    // until an admin clicks "Resume AI".
    const alreadyReplied = history.some((m) => m.role === "model");
    if (alreadyReplied) {
      console.log(`First reply already sent for ${from} — handing to human.`);
      await saveConversation(from, history, true);
      return;
    }

    const { text: reply } = await callGemini(history, profileName, convo.parent_id, from);

    await sendWhatsAppMessage(from, reply);
    await logComm({ phone: from, parentId: convo.parent_id, direction: "outbound", content: reply });

    history.push({ role: "model", content: reply, ts: new Date().toISOString() });
    // Always hand off after the first auto-reply.
    await saveConversation(from, history, true);

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
      const body = await req.json();
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
