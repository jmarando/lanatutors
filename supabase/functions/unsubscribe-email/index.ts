import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    let email = (url.searchParams.get("email") || url.searchParams.get("e") || "").trim();
    let source = url.searchParams.get("source") || undefined;

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      email = String(body.email ?? email ?? "").trim();
      source = body.source ?? source;
    }

    email = email.toLowerCase();
    if (!email || !EMAIL_RE.test(email) || email.length > 320) {
      return json({ error: "A valid email address is required" }, 400);
    }

    // GET = check current status only
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("email_suppressions")
        .select("email, created_at")
        .eq("email", email)
        .maybeSingle();
      if (error) throw error;
      return json({ email, suppressed: !!data, since: data?.created_at ?? null });
    }

    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const { error } = await supabase
      .from("email_suppressions")
      .upsert(
        { email, reason: "unsubscribe", source: source ?? "unsubscribe-page" },
        { onConflict: "email" },
      );
    if (error) throw error;

    console.log("Suppressed email:", email);
    return json({ success: true, email, suppressed: true });
  } catch (error) {
    console.error("unsubscribe-email error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
