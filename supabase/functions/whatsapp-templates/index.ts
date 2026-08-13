import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WA_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN")!;
const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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

    const phoneRes = await fetch(
      `https://graph.facebook.com/v21.0/${WA_PHONE_ID}?fields=whatsapp_business_account{id,name}`,
      { headers: { Authorization: `Bearer ${WA_TOKEN}` } },
    );
    const phoneData = await phoneRes.json();
    const wabaId = phoneData?.whatsapp_business_account?.id;
    if (!wabaId) return json({ error: "Could not resolve WABA", detail: phoneData }, 502);

    const tplRes = await fetch(
      `https://graph.facebook.com/v21.0/${wabaId}/message_templates?limit=50&fields=name,status,language,category,components`,
      { headers: { Authorization: `Bearer ${WA_TOKEN}` } },
    );
    const tplData = await tplRes.json();
    return json({ wabaId, templates: tplData.data ?? tplData });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
