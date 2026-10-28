// Retired in the Phase 1 email-cadence cleanup (28 Oct 2026).
// The live reminder path is send-session-reminders (24h). This function had no
// callers in the app; it is kept as a no-op so any stale deployment or scheduler
// entry stops sending instead of remaining live.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      success: true,
      skipped: true,
      reason: "Retired. Session reminders are sent by send-session-reminders.",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
