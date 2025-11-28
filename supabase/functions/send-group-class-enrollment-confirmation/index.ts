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

    // Fetch enrollment with all related data
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
          meeting_link
        )
      `)
      .eq("id", enrollmentId)
      .single();

    if (error) throw error;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", enrollment.student_id)
      .single();

    const { data: userEmail } = await supabase.auth.admin.getUserById(enrollment.student_id);

    if (!userEmail?.user?.email) {
      throw new Error("Student email not found");
    }

    const formatTime = (time: string) => {
      return new Date(`1970-01-01T${time}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
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
          .class-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
          .detail-label { font-weight: 600; color: #666; }
          .detail-value { color: #333; }
          .button { display: inline-block; background: #FF6B35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Enrollment Confirmed! 🎉</h1>
          </div>
          <div class="content">
            <p>Hi ${profile?.full_name || "there"},</p>
            <p>Congratulations! You've successfully enrolled in <strong>${enrollment.group_classes.title}</strong>.</p>
            
            <div class="class-details">
              <h3 style="margin-top: 0;">Class Details</h3>
              <div class="detail-row">
                <span class="detail-label">Subject:</span>
                <span class="detail-value">${enrollment.group_classes.subject}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Curriculum:</span>
                <span class="detail-value">${enrollment.group_classes.curriculum}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Grade Level:</span>
                <span class="detail-value">${enrollment.group_classes.grade_level}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Schedule:</span>
                <span class="detail-value">${enrollment.group_classes.day_of_week}s at ${formatTime(enrollment.group_classes.start_time)} - ${formatTime(enrollment.group_classes.end_time)} EAT</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Start Date:</span>
                <span class="detail-value">${formatDate(enrollment.starts_at)}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Enrollment Type:</span>
                <span class="detail-value">${enrollment.enrollment_type === 'weekly' ? 'Weekly Pass (4 sessions)' : 'Monthly Pass (16 sessions)'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Amount Paid:</span>
                <span class="detail-value">KES ${enrollment.amount_paid.toLocaleString()}</span>
              </div>
            </div>

            ${enrollment.group_classes.meeting_link ? `
            <div style="text-align: center;">
              <a href="${enrollment.group_classes.meeting_link}" class="button">Join Class</a>
            </div>
            ` : '<p style="background: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107;">Your class meeting link will be available in your Student Dashboard before your first session.</p>'}

            <h3>What's Next?</h3>
            <ul>
              <li>You'll receive a reminder email before each scheduled session</li>
              <li>Access your class anytime from your <a href="https://lanatutors.africa/student/dashboard">Student Dashboard</a></li>
              <li>Your tutor will share learning materials via Google Classroom</li>
              <li>Attendance will be tracked automatically when you join sessions</li>
            </ul>

            <p>If you have any questions, reply to this email or contact us at <a href="mailto:info@lanatutors.africa">info@lanatutors.africa</a>.</p>

            <p>See you in class!</p>
            <p><strong>The LANA Tutors Team</strong></p>
          </div>
          <div class="footer">
            <p>© 2025 LANA Tutors. All rights reserved.</p>
            <p>Empowering students through quality online education.</p>
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
        from: "LANA Tutors <bookings@lanatutors.africa>",
        to: [userEmail.user.email],
        subject: `✅ Enrollment Confirmed: ${enrollment.group_classes.title}`,
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
