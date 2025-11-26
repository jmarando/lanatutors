import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StatusRequest {
  orderTrackingId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderTrackingId }: StatusRequest = await req.json();

    if (!orderTrackingId) {
      return new Response(
        JSON.stringify({ error: "orderTrackingId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: payment, error } = await supabase
      .from("payments")
      .select("reference_id, payment_type, status")
      .eq("pesapal_order_tracking_id", orderTrackingId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching payment status:", error);
      return new Response(
        JSON.stringify({ error: "payment_lookup_failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ payment }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error in get-payment-status:", err);
    return new Response(
      JSON.stringify({ error: "unexpected_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
