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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header", hasAccess: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const { classId, enrollmentId } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token", hasAccess: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Verify enrollment exists, is active, and payment completed
    const { data: enrollment, error: enrollmentError } = await supabase
      .from("group_class_enrollments")
      .select(`
        *,
        group_classes (
          id,
          meeting_link,
          title
        )
      `)
      .eq("id", enrollmentId)
      .eq("student_id", user.id)
      .eq("group_class_id", classId)
      .eq("status", "active")
      .eq("payment_status", "completed")
      .single();

    if (enrollmentError || !enrollment) {
      console.log("Access denied:", {
        userId: user.id,
        classId,
        enrollmentId,
        error: enrollmentError?.message
      });

      return new Response(
        JSON.stringify({ 
          error: "No active enrollment found or payment not completed",
          hasAccess: false 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Check if enrollment has expired
    const now = new Date();
    const expiresAt = new Date(enrollment.expires_at);
    
    if (expiresAt < now) {
      return new Response(
        JSON.stringify({ 
          error: "Enrollment has expired. Please renew to continue.",
          hasAccess: false 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Log attendance attempt
    const today = new Date().toISOString().split('T')[0];
    const { error: attendanceError } = await supabase
      .from("group_class_attendance")
      .upsert({
        group_class_id: classId,
        student_id: user.id,
        session_date: today,
        attended: true,
        joined_at: new Date().toISOString(),
      }, {
        onConflict: "group_class_id,student_id,session_date",
        ignoreDuplicates: false
      });

    if (attendanceError) {
      console.error("Failed to log attendance:", attendanceError);
    }

    // Return meeting link
    return new Response(
      JSON.stringify({
        hasAccess: true,
        meetingLink: enrollment.group_classes.meeting_link,
        className: enrollment.group_classes.title,
        expiresAt: enrollment.expires_at
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Validation error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        hasAccess: false 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
