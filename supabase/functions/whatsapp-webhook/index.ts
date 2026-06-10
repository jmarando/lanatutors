import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

const SYSTEM_PROMPT = `You are Lana, the friendly WhatsApp assistant for Lana Tutors — Kenya's trusted premium tutoring platform serving local and diaspora families.

About Lana Tutors:
- We offer expert 1-on-1 tutoring across CBC (Kenya), British (IGCSE/A-Levels), American, and IB curricula
- Services: single sessions, lesson packages (5 or 10 lessons), and custom learning plans
- Online (Google Meet) and in-person (Nairobi) tutoring available
- Payments via Pesapal (cards, M-Pesa) — multi-currency: KES, USD, GBP, EUR, TZS, UGX
- Tutors are vetted graduates and education professionals
- Free Academic Assessment Call available to match students with the right tutor

How to respond:
- Warm, concise, professional. Use the parent's name if known.
- Keep replies SHORT (2–4 sentences max). WhatsApp users skim.
- Use emojis sparingly (📚 ✨ 🎓) — not in every message.
- For booking/pricing: direct them to https://lanatutors.africa or offer to book a free Academic Assessment Call.
- For curriculum/subject questions: give a brief helpful answer, then suggest a tutor match.
- If they're upset or it's a complex issue: empathize and say a team member from info@lanatutors.africa will follow up shortly.
- Never invent prices or tutor names. If unsure, say you'll have the team confirm.
- Always sign off as "Lana 💛" on first reply only.`;

async function sendWhatsAppMessage(to: string, text: string) {
  const res = await fetch(`https://graph.facebook.com/v21.0/${WA_PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WA_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
  const data = await res.json();
  if (!res.ok) console.error("WhatsApp send error:", data);
  else console.log("WhatsApp send ok:", data);
}

async function callGeminiModel(model: string, userText: string, profileName?: string): Promise<string | null> {
  const sys = SYSTEM_PROMPT + (profileName ? `\n\nThe user's WhatsApp profile name is "${profileName}".` : "");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: sys }] },
      contents: [{ role: "user", parts: [{ text: userText }] }],
    }),
  });
  if (!res.ok) {
    console.error(`Gemini ${model} error:`, res.status, await res.text());
    return null;
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("").trim();
  return text || null;
}

async function getAiReplyFromGemini(userText: string, profileName?: string): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;
  // Try primary model, then fallbacks. Retry once on 503/overload.
  const models = [GEMINI_MODEL, "gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash"];
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model)) continue;
    seen.add(model);
    for (let attempt = 0; attempt < 2; attempt++) {
      const reply = await callGeminiModel(model, userText, profileName);
      if (reply) return reply;
      // small backoff before retry
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  return null;
}

async function getAiReplyFromLovable(userText: string, profileName?: string): Promise<string | null> {
  if (!LOVABLE_API_KEY) return null;
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...(profileName ? [{ role: "system", content: `The user's WhatsApp profile name is "${profileName}".` }] : []),
        { role: "user", content: userText },
      ],
    }),
  });
  if (!res.ok) {
    console.error("Lovable AI gateway error:", res.status, await res.text());
    return null;
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

async function getAiReply(userText: string, profileName?: string): Promise<string> {
  // Prefer direct Gemini if key present, fallback to Lovable AI Gateway
  const reply =
    (await getAiReplyFromGemini(userText, profileName)) ??
    (await getAiReplyFromLovable(userText, profileName));
  return (
    reply ||
    "Hi! Thanks for reaching out to Lana Tutors 💛 Our team will get back to you shortly. In the meantime, you can explore tutors at https://lanatutors.africa"
  );
}

async function handleIncoming(body: any) {
  try {
    const change = body.entry?.[0]?.changes?.[0]?.value;
    const msg = change?.messages?.[0];
    if (!msg) {
      console.log("No message in webhook (likely status update). Skipping.");
      return;
    }
    if (msg.type !== "text") {
      console.log(`Unsupported message type: ${msg.type}`);
      await sendWhatsAppMessage(
        msg.from,
        "Thanks for your message! I can only read text right now — please type your question and I'll help 💛"
      );
      return;
    }
    const from = msg.from;
    const text = msg.text?.body ?? "";
    const profileName = change?.contacts?.[0]?.profile?.name;
    console.log(`Incoming from ${profileName ?? from}: ${text}`);

    const reply = await getAiReply(text, profileName);
    await sendWhatsAppMessage(from, reply);
  } catch (e) {
    console.error("handleIncoming error:", e);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Meta webhook verification
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verified");
      return new Response(challenge, { status: 200 });
    }
    console.error("Webhook verify failed");
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("WA webhook payload:", JSON.stringify(body));
      // Process async — Meta needs a 200 within 5s
      handleIncoming(body);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Webhook error:", error);
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 200, // still 200 so Meta doesn't retry endlessly
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
