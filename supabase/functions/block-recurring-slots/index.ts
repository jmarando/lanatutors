import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { authenticate } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticate(req, corsHeaders);
    if (auth.error) return auth.error;

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { packagePurchaseId } = await req.json();

    if (!packagePurchaseId) {
      throw new Error("Package purchase ID is required");
    }

    console.log("Processing recurring slot blocking for package:", packagePurchaseId);

    // Ownership guard: only the purchasing student or an admin may block slots
    const { data: ownerCheck } = await supabaseClient
      .from("package_purchases")
      .select("student_id")
      .eq("id", packagePurchaseId)
      .maybeSingle();

    if (!ownerCheck) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!auth.isAdmin && ownerCheck.student_id !== auth.userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the package purchase with metadata
    const { data: packagePurchase, error: packageError } = await supabaseClient
      .from("package_purchases")
      .select(`
        *,
        tutor_id
      `)
      .eq("id", packagePurchaseId)
      .single();

    if (packageError) {
      console.error("Error fetching package:", packageError);
      throw packageError;
    }

    // Check if this package has recurring slots to block
    const metadata = packagePurchase.metadata as any;
    if (!metadata?.schedule_preference?.recurringSlotIds || 
        metadata.schedule_preference.mode !== 'schedule_now') {
      console.log("No recurring slots to block for this package");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No recurring slots to block" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const slotIds = metadata.schedule_preference.recurringSlotIds;
    console.log(`Blocking ${slotIds.length} recurring slots`);

    // Block all the selected slots
    const { error: updateError } = await supabaseClient
      .from("tutor_availability")
      .update({ 
        is_booked: true,
        slot_type: 'recurring_package'
      })
      .in("id", slotIds)
      .eq("tutor_id", packagePurchase.tutor_id);

    if (updateError) {
      console.error("Error blocking slots:", updateError);
      throw updateError;
    }

    console.log("Successfully blocked recurring slots");

    // Get tutor profile for notification
    const { data: tutorProfile, error: tutorError } = await supabaseClient
      .from("tutor_profiles")
      .select("user_id")
      .eq("id", packagePurchase.tutor_id)
      .single();

    if (!tutorError && tutorProfile) {
      const { data: tutorUser } = await supabaseClient
        .from("profiles")
        .select("full_name, phone_number")
        .eq("id", tutorProfile.user_id)
        .single();

      // Get student info
      const { data: studentProfile } = await supabaseClient
        .from("profiles")
        .select("full_name")
        .eq("id", packagePurchase.student_id)
        .single();

      // TODO: Send notification to tutor about blocked slots
      // This could be an email or SMS notification
      console.log(`Tutor ${tutorUser?.full_name} - ${slotIds.length} slots blocked for student ${studentProfile?.full_name}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        slotsBlocked: slotIds.length,
        message: "Recurring slots successfully blocked"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in block-recurring-slots:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
