import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting classroom backfill...");

    // Get all bookings without classrooms
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("id, subject, student_id, tutor_id")
      .is("classroom_id", null)
      .eq("status", "confirmed");

    if (bookingsError) {
      throw bookingsError;
    }

    console.log(`Found ${bookings?.length || 0} bookings without classrooms`);

    const results = [];
    
    for (const booking of bookings || []) {
      try {
        // Get student info
        const { data: studentData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", booking.student_id)
          .maybeSingle();

        // Get tutor info - use id, not user_id
        const { data: tutorData } = await supabase
          .from("tutor_profiles")
          .select("email")
          .eq("id", booking.tutor_id)
          .maybeSingle();

        // Get student email from auth
        const { data: studentAuth } = await supabase.auth.admin.getUserById(booking.student_id);
        const studentEmail = studentAuth?.user?.email || "";
        const studentName = studentData?.full_name || "Student";
        const tutorEmail = tutorData?.email || "";

        if (studentEmail && tutorEmail) {
          console.log(`Creating classroom for booking ${booking.id}...`);
          
          const classroomResponse = await supabase.functions.invoke("create-google-classroom", {
            body: {
              bookingId: booking.id,
              tutorName: tutorEmail.split("@")[0],
              tutorEmail,
              studentName,
              studentEmail,
              subject: booking.subject,
            },
          });

          if (classroomResponse.error) {
            console.error(`Error for booking ${booking.id}:`, classroomResponse.error);
            results.push({ bookingId: booking.id, status: "error", error: classroomResponse.error });
          } else {
            console.log(`Classroom created for booking ${booking.id}`);
            results.push({ bookingId: booking.id, status: "success" });
          }
        } else {
          console.log(`Skipping booking ${booking.id} - missing email info`);
          results.push({ bookingId: booking.id, status: "skipped", reason: "missing_email_info" });
        }
      } catch (error) {
        console.error(`Error processing booking ${booking.id}:`, error);
        results.push({ bookingId: booking.id, status: "error", error: error instanceof Error ? error.message : "Unknown error" });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalBookings: bookings?.length || 0,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in backfill:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
