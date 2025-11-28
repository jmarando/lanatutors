import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { enrollmentId, paymentStatus } = await req.json();

    if (!enrollmentId) {
      throw new Error("Enrollment ID is required");
    }

    // Update enrollment payment status
    const { error: updateError } = await supabaseClient
      .from("group_class_enrollments")
      .update({ 
        payment_status: paymentStatus === "completed" ? "completed" : "failed",
        status: paymentStatus === "completed" ? "active" : "pending"
      })
      .eq("id", enrollmentId);

    if (updateError) throw updateError;

    // If payment completed, get class details and send confirmation email
    if (paymentStatus === "completed") {
      const { data: enrollment } = await supabaseClient
        .from("group_class_enrollments")
        .select(`
          *,
          group_classes (
            title,
            subject,
            day_of_week,
            start_time,
            end_time,
            meeting_link
          )
        `)
        .eq("id", enrollmentId)
        .single();

      if (enrollment) {
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("full_name")
          .eq("id", enrollment.student_id)
          .single();

        // TODO: Send confirmation email with meeting link
        console.log("Enrollment confirmed for:", profile?.full_name);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error handling group class payment:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});