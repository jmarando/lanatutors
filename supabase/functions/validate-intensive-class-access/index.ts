import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("No authorization header provided");
      return new Response(
        JSON.stringify({ hasAccess: false, message: "Not authenticated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.log("Invalid token or user not found:", userError);
      return new Response(
        JSON.stringify({ hasAccess: false, message: "Invalid authentication" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const { classId } = await req.json();

    if (!classId) {
      console.log("No classId provided");
      return new Response(
        JSON.stringify({ hasAccess: false, message: "Class ID is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`Validating access for user ${user.id} to class ${classId}`);

    // Check if user has an enrollment that includes this class
    const { data: enrollments, error: enrollmentError } = await supabase
      .from("intensive_enrollments")
      .select("*, intensive_programs(*)")
      .eq("student_id", user.id)
      .contains("enrolled_class_ids", [classId]);

    if (enrollmentError) {
      console.error("Error fetching enrollments:", enrollmentError);
      return new Response(
        JSON.stringify({ hasAccess: false, message: "Error checking enrollment" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!enrollments || enrollments.length === 0) {
      console.log("No enrollment found for this class");
      return new Response(
        JSON.stringify({ hasAccess: false, message: "You are not enrolled in this class" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const enrollment = enrollments[0];
    const program = enrollment.intensive_programs;

    // Check payment status - allow access even with pending payment (per memory)
    // but log for monitoring
    if (enrollment.payment_status !== "completed") {
      console.log(`User ${user.id} accessing class with payment status: ${enrollment.payment_status}`);
    }

    // Check if program dates are active
    const now = new Date();
    const startDate = new Date(program.start_date);
    const endDate = new Date(program.end_date);
    // Add buffer of 1 hour before start and after end
    startDate.setHours(startDate.getHours() - 1);
    endDate.setHours(endDate.getHours() + 1);

    const isWithinDates = now >= startDate && now <= endDate;

    if (!isWithinDates) {
      console.log(`Program dates check: now=${now.toISOString()}, start=${startDate.toISOString()}, end=${endDate.toISOString()}`);
      return new Response(
        JSON.stringify({ 
          hasAccess: false, 
          message: `Program runs from ${program.start_date} to ${program.end_date}` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log attendance (optional - for tracking)
    try {
      // We could create an intensive_attendance table similar to group_class_attendance
      // For now, just log it
      console.log(`Access granted: user ${user.id}, class ${classId}, time ${now.toISOString()}`);
    } catch (logError) {
      console.error("Error logging attendance:", logError);
      // Don't fail the request for logging errors
    }

    return new Response(
      JSON.stringify({ 
        hasAccess: true, 
        message: "Access granted",
        enrollment: {
          id: enrollment.id,
          payment_status: enrollment.payment_status,
          program_name: program.name
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error validating intensive class access:", error);
    return new Response(
      JSON.stringify({ hasAccess: false, message: "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
