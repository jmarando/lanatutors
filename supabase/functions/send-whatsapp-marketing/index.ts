import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const WA_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN")!;
const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(phone: string) {
  let p = phone.replace(/[\s+()-]/g, "");
  if (p.startsWith("0")) p = "254" + p.slice(1);
  if (p.length === 9) p = "254" + p;
  return p;
}

function buildPayload(templateName: string, languageCode: string, recipient: any) {
  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalizePhone(recipient.phone),
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
    },
  };
  if (recipient.components && Array.isArray(recipient.components)) {
    (body.template as Record<string, unknown>).components = recipient.components;
  }
  return body;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

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

    const body = await req.json();
    const { templateName, languageCode = "en_US", audience, preview = false } = body;

    if (!templateName || typeof templateName !== "string") {
      return json({ error: "templateName is required" }, 400);
    }
    if (!Array.isArray(audience) || audience.length === 0) {
      return json({ error: "audience must be a non-empty array" }, 400);
    }

    // Check suppressions
    const phones = audience.map((a: any) => normalizePhone(a.phone || a.phone_number));
    const { data: suppressed } = await admin
      .from("whatsapp_suppressions")
      .select("phone_number")
      .in("phone_number", phones);
    const suppressedSet = new Set((suppressed || []).map((s: any) => s.phone_number));

    if (preview) {
      const first = audience.find((a: any) => !suppressedSet.has(normalizePhone(a.phone || a.phone_number))) || audience[0];
      return json({
        preview: true,
        total: audience.length,
        suppressed: suppressedSet.size,
        payload: buildPayload(templateName, languageCode, first),
      });
    }

    const results: Array<{
      phone: string;
      status: string;
      messageId?: string;
      error?: string;
    }> = [];

    for (const recipient of audience) {
      const phone = normalizePhone(recipient.phone || recipient.phone_number);
      if (suppressedSet.has(phone)) {
        results.push({ phone, status: "suppressed" });
        continue;
      }

      const payload = buildPayload(templateName, languageCode, recipient);
      const res = await fetch(`https://graph.facebook.com/v21.0/${WA_PHONE_ID}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WA_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      const status = res.ok ? "sent" : "failed";

      // Log outbound
      try {
        await admin.from("communication_logs").insert({
          channel: "whatsapp",
          direction: "outbound",
          content: `Template: ${templateName}`,
          status,
          subject: `WhatsApp marketing: ${templateName}`,
          metadata: {
            template_name: templateName,
            phone,
            wa_response: data,
            sent_by: user.id,
          },
        });
      } catch (e) {
        console.error("logComm failed:", e);
      }

      results.push({
        phone,
        status,
        messageId: data.messages?.[0]?.id,
        error: data.error?.message || (res.ok ? undefined : "Unknown error"),
      });
    }

    return json({
      success: true,
      total: audience.length,
      sent: results.filter((r) => r.status === "sent").length,
      failed: results.filter((r) => r.status === "failed").length,
      suppressed: results.filter((r) => r.status === "suppressed").length,
      results,
    });
  } catch (e) {
    console.error("send-whatsapp-marketing error:", e);
    return json({ error: String(e) }, 500);
  }
});
