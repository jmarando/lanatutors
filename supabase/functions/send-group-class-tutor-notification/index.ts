import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { enrollmentId } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch enrollment with student and class details
    const { data: enrollment, error } = await supabase
      .from("group_class_enrollments")
      .select(`
        *,
        group_classes (
          id,
          title,
          subject,
          curriculum,
          grade_level,
          day_of_week,
          start_time,
          end_time,
          group_class_tutor_assignments!inner (
            tutor_id,
            is_primary
          )
        )
      `)
      .eq("id", enrollmentId)
      .eq("group_classes.group_class_tutor_assignments.is_primary", true)
      .single();

    if (error) throw error;

    const { data: studentProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", enrollment.student_id)
      .single();

    const tutorId = enrollment.group_classes.group_class_tutor_assignments[0]?.tutor_id;
    
    if (!tutorId) {
      console.log("No primary tutor assigned to class");
      return new Response(JSON.stringify({ success: true, message: "No tutor to notify" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get tutor's user ID and email
    const { data: tutorProfile } = await supabase
      .from("tutor_profiles")
      .select("user_id")
      .eq("id", tutorId)
      .single();

    if (!tutorProfile) throw new Error("Tutor profile not found");

    const { data: tutorUser } = await supabase.auth.admin.getUserById(tutorProfile.user_id);

    if (!tutorUser?.user?.email) {
      throw new Error("Tutor email not found");
    }

    const { data: tutorName } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", tutorProfile.user_id)
      .single();

    const formatTime = (time: string) => {
      return new Date(`1970-01-01T${time}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    };

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
          .student-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
          .button { display: inline-block; background: #FF6B35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">New Student Enrolled! 🎓</h1>
          </div>
          <div class="content">
            <p>Hi ${tutorName?.full_name || "there"},</p>
            <p>Great news! A new student has enrolled in your group class.</p>
            
            <div class="student-info">
              <h3 style="margin-top: 0;">Enrollment Details</h3>
              <div class="detail-row">
                <strong>Student:</strong> ${studentProfile?.full_name || "New Student"}
              </div>
              <div class="detail-row">
                <strong>Class:</strong> ${enrollment.group_classes.title}
              </div>
              <div class="detail-row">
                <strong>Subject:</strong> ${enrollment.group_classes.subject}
              </div>
              <div class="detail-row">
                <strong>Curriculum:</strong> ${enrollment.group_classes.curriculum}
              </div>
              <div class="detail-row">
                <strong>Grade Level:</strong> ${enrollment.group_classes.grade_level}
              </div>
              <div class="detail-row">
                <strong>Schedule:</strong> ${enrollment.group_classes.day_of_week}s at ${formatTime(enrollment.group_classes.start_time)} - ${formatTime(enrollment.group_classes.end_time)} EAT
              </div>
              <div class="detail-row">
                <strong>Enrollment Type:</strong> ${enrollment.enrollment_type === 'weekly' ? 'Weekly Pass' : 'Monthly Pass'}
              </div>
            </div>

            <div style="text-align: center;">
              <a href="https://lanatutors.africa/tutor/dashboard" class="button">View on Dashboard</a>
            </div>

            <h3>What's Next?</h3>
            <ul>
              <li>The student will appear in your class roster</li>
              <li>Share learning materials via Google Classroom</li>
              <li>Attendance will be tracked automatically</li>
              <li>Welcome your new student in the next session!</li>
            </ul>

            <p>If you have any questions, contact us at <a href="mailto:info@lanatutors.africa">info@lanatutors.africa</a>.</p>

            <p>Happy teaching!</p>
            <p><strong>The LANA Tutors Team</strong></p>
          </div>
          <div class="footer">
            <p>© 2025 LANA Tutors. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "LANA Tutors <notifications@lanatutors.africa>",
        to: [tutorUser.user.email],
        subject: `New Student Enrolled: ${enrollment.group_classes.title}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
