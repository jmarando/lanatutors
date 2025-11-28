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

    // If payment completed, send confirmation and notification emails
    if (paymentStatus === "completed") {
      try {
        // Send enrollment confirmation to student
        await supabaseClient.functions.invoke("send-group-class-enrollment-confirmation", {
          body: { enrollmentId }
        });
        
        // Notify tutor of new enrollment
        await supabaseClient.functions.invoke("send-group-class-tutor-notification", {
          body: { enrollmentId }
        });
        
        console.log("Enrollment emails sent for:", enrollmentId);
      } catch (emailError) {
        console.error("Failed to send enrollment emails:", emailError);
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