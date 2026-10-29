// Retired in the Phase 1 email-cadence cleanup (28 Oct 2026).
// Daily intensive schedules are sent by send-bootcamp-morning-reminder, which
// reads the same intensive_programs / intensive_enrollments / intensive_classes
// tables. This function is a no-op so a stale scheduler entry cannot double-send.
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
      reason: "Consolidated into send-bootcamp-morning-reminder.",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
