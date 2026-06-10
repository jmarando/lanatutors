import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WA_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    // AuthN + admin check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const { phone, text, pauseAi = true } = await req.json();
    if (!phone || !text) return json({ error: "phone and text required" }, 400);

    // Send via WhatsApp Cloud API
    const res = await fetch(`https://graph.facebook.com/v21.0/${WA_PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: text, preview_url: true },
      }),
    });
    const waData = await res.json();
    if (!res.ok) {
      console.error("WA send error:", waData);
      return json({ error: "WhatsApp send failed", detail: waData }, 502);
    }

    // Append to conversation history
    const { data: convo } = await admin
      .from("whatsapp_conversations")
      .select("*")
      .eq("phone_number", phone)
      .maybeSingle();

    const history = Array.isArray(convo?.messages) ? (convo!.messages as any[]) : [];
    history.push({
      role: "model",
      content: text,
      ts: new Date().toISOString(),
      sent_by: "human",
      admin_user_id: user.id,
    });
    const trimmed = history.slice(-50);

    const patch: Record<string, unknown> = {
      messages: trimmed,
      last_message_at: new Date().toISOString(),
    };
    if (pauseAi) {
      patch.escalated = true;
      patch.escalated_at = new Date().toISOString();
    }

    if (convo) {
      await admin.from("whatsapp_conversations").update(patch).eq("phone_number", phone);
    } else {
      await admin.from("whatsapp_conversations").insert({
        phone_number: phone,
        messages: trimmed,
        escalated: pauseAi,
        escalated_at: pauseAi ? new Date().toISOString() : null,
      });
    }

    // Log outbound
    try {
      await admin.from("communication_logs").insert({
        parent_id: convo?.parent_id ?? null,
        channel: "whatsapp",
        direction: "outbound",
        content: text,
        status: "sent",
        subject: `WhatsApp outbound (human) ${phone}`,
      });
    } catch (e) {
      console.error("logComm failed:", e);
    }

    return json({ success: true });
  } catch (e) {
    console.error("whatsapp-send error:", e);
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
