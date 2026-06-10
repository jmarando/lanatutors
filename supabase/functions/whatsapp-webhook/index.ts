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

WHAT WE OFFER
- 1-on-1 tutoring: CBC (Kenya), British (IGCSE/A-Levels), American, IB
- Specialized IGCSE early-years subjects available (KS1)
- Booking paths: Single Session, Lesson Packages (5 or 10), Custom Learning Plan, Free Academic Assessment Call
- Modes: Online (Google Meet) and in-person (Nairobi)
- Payments: Pesapal (cards + M-Pesa). Multi-currency: KES, USD, GBP, EUR, TZS, UGX
- All vetted tutors. All emails come from info@lanatutors.africa

LINKS (use these, don't invent others)
- Home / browse tutors: https://lanatutors.africa
- Book an Academic Assessment Call (free, 30 min): https://lanatutors.africa/book-consultation
- Request a Learning Plan: https://lanatutors.africa/request-learning-plan
- How it works: https://lanatutors.africa/how-it-works

STYLE
- Warm, concise, professional. 2–4 short sentences max — WhatsApp users skim.
- Use the parent's first name when known.
- Do NOT use emojis, smileys or emoticons anywhere in your replies. Plain text only.
- Do NOT sign off with "— Lana", "Lana", or any signature. Just end the message naturally.
- Be ACTIONABLE: whenever you mention booking, browsing tutors, learning plans, or "how it works", paste the actual full https://lanatutors.africa/... link on its own line so the parent can tap it in WhatsApp. Never say "I'll send you a link" without the link.
- Never invent prices, tutor names, or availability. If unsure say "let me have the team confirm".
- If asked about pricing: explain it depends on curriculum, level and subject; offer the free Academic Assessment Call and paste https://lanatutors.africa/book-consultation.
- For complex/payment/complaint issues: empathize and tell them a team member from info@lanatutors.africa will follow up shortly.

TOOLS
You have tools available. Use them when relevant:
- lookup_tutors: when a parent asks about tutors for a specific subject/curriculum
- get_booking_link: when they want to book something specific
- escalate_to_team: when they're upset, ask for a human, or have a complex billing/account issue
Call escalate_to_team ONCE and then reply with a brief holding message. Don't keep auto-replying after escalation.`;

const TOOLS = [
  {
    name: "lookup_tutors",
    description: "Search verified tutors by subject and/or curriculum. Returns up to 3 matches with name and short bio. Use when a parent asks who teaches X.",
    parameters: {
      type: "object",
      properties: {
        subject: { type: "string", description: "Subject e.g. Mathematics, Physics, English" },
        curriculum: { type: "string", description: "One of: CBC, IGCSE, A-Levels, American, IB" },
      },
    },
  },
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
    "Hi, thanks for messaging Lana Tutors. I'm not 100% sure how best to help just yet — pick whichever of these works for you and we'll take it from there:",
    "",
    "1. Have a tutor call you back",
    "   Reply with the best time to ring and the number to use.",
    "",
    "2. Get a custom learning plan",
    "   Share your child's year/grade, curriculum (CBC, IGCSE, A-Levels, American, IB) and the subjects/goals you have in mind. We'll send back a tailored plan with recommended tutors and pricing.",
    "",
    "3. Book a free 30-min Academic Assessment Call",
    "   https://lanatutors.africa/book-consultation",
    "",
    "Or just type your question and I'll do my best to help.",
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
        "Thanks for your message! I can only read text right now — please type your question and I'll help 💛",
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

    const history: Msg[] = Array.isArray(convo.messages) ? convo.messages : [];
    history.push({ role: "user", content: text, ts: new Date().toISOString() });

    // If a human has taken over, just save the inbound message and stay silent.
    // The admin replies from the WhatsApp Inbox; no canned auto-reply.
    if (convo.escalated) {
      console.log(`Convo escalated — saving inbound from ${from}, AI silent.`);
      await saveConversation(from, history);
      return;
    }

    const { text: reply, escalated } = await callGemini(history, profileName, convo.parent_id, from);

    await sendWhatsAppMessage(from, reply);
    await logComm({ phone: from, parentId: convo.parent_id, direction: "outbound", content: reply });

    history.push({ role: "model", content: reply, ts: new Date().toISOString() });
    await saveConversation(from, history, escalated);
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
