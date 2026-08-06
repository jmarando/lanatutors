import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PIXEL_ID = Deno.env.get("META_PIXEL_ID") ?? "1806197037029344";
const ACCESS_TOKEN = Deno.env.get("META_CAPI_ACCESS_TOKEN");
const TEST_EVENT_CODE = Deno.env.get("META_CAPI_TEST_EVENT_CODE");

/** SHA-256 hex, as required by Meta for PII (email, phone, names). */
async function sha256(value: string) {
  const data = new TextEncoder().encode(value.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizePhone(phone: string) {
  return phone.replace(/[^0-9]/g, "");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!ACCESS_TOKEN) {
    console.error("META_CAPI_ACCESS_TOKEN is not configured");
    return new Response(JSON.stringify({ error: "META_CAPI_ACCESS_TOKEN is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const eventName = typeof body?.event_name === "string" ? body.event_name : null;
    if (!eventName) {
      return new Response(JSON.stringify({ error: "event_name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventId = typeof body?.event_id === "string" ? body.event_id : crypto.randomUUID();
    const eventSourceUrl = typeof body?.event_source_url === "string" ? body.event_source_url : undefined;
    const customData = typeof body?.custom_data === "object" && body.custom_data ? body.custom_data : {};

    // CRM / offline events: action_source "system_generated" plus a lead_event_source label.
    const allowedSources = ["website", "system_generated", "phone_call", "chat", "email", "business_messaging", "other"];
    const actionSource =
      typeof body?.action_source === "string" && allowedSources.includes(body.action_source)
        ? body.action_source
        : "website";
    const leadEventSource =
      typeof body?.lead_event_source === "string" && body.lead_event_source
        ? body.lead_event_source
        : actionSource === "system_generated"
        ? "Lana Tutors CRM"
        : undefined;
    const eventTime =
      typeof body?.event_time === "number" && body.event_time > 0
        ? Math.floor(body.event_time)
        : Math.floor(Date.now() / 1000);


    const userData: Record<string, unknown> = {};
    if (typeof body?.email === "string" && body.email.includes("@")) {
      userData.em = [await sha256(body.email)];
    }
    if (typeof body?.phone === "string" && body.phone.length > 5) {
      userData.ph = [await sha256(normalizePhone(body.phone))];
    }
    if (typeof body?.first_name === "string" && body.first_name) {
      userData.fn = [await sha256(body.first_name)];
    }
    if (typeof body?.last_name === "string" && body.last_name) {
      userData.ln = [await sha256(body.last_name)];
    }
    if (typeof body?.fbp === "string" && body.fbp) userData.fbp = body.fbp;
    if (typeof body?.fbc === "string" && body.fbc) userData.fbc = body.fbc;

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("cf-connecting-ip") ??
      undefined;
    if (ip) userData.client_ip_address = ip;
    const ua = req.headers.get("user-agent");
    if (ua) userData.client_user_agent = ua;

    const payload: Record<string, unknown> = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          action_source: "website",
          ...(eventSourceUrl ? { event_source_url: eventSourceUrl } : {}),
          user_data: userData,
          custom_data: customData,
        },
      ],
    };
    if (TEST_EVENT_CODE) payload.test_event_code = TEST_EVENT_CODE;

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const text = await res.text();
    if (!res.ok) {
      console.error(`Meta CAPI failed [${res.status}]: ${text}`);
      return new Response(
        JSON.stringify({ error: "Meta CAPI request failed", status: res.status, details: text }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`Meta CAPI ${eventName} sent (event_id=${eventId}): ${text}`);
    return new Response(JSON.stringify({ success: true, event_id: eventId, meta: JSON.parse(text) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("meta-capi error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
