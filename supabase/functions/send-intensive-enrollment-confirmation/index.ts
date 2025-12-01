import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  enrollmentId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { enrollmentId }: EmailRequest = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch enrollment with related data
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from("intensive_enrollments")
      .select(`
        *,
        intensive_programs (
          name,
          start_date,
          end_date
        )
      `)
      .eq("id", enrollmentId)
      .single();

    if (enrollmentError || !enrollment) {
      throw new Error("Enrollment not found");
    }

    // Fetch student profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", enrollment.student_id)
      .single();

    // Fetch enrolled classes
    const { data: classes } = await supabaseAdmin
      .from("intensive_classes")
      .select("subject, time_slot, curriculum, grade_levels")
      .in("id", enrollment.enrolled_class_ids);

    // Get student email
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(enrollment.student_id);

    if (!user?.email) {
      throw new Error("Student email not found");
    }

    // Build schedule HTML
    const scheduleHTML = classes
      ?.map((cls) => `
        <tr>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">${cls.subject}</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">${cls.time_slot} EAT</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">${cls.curriculum}</td>
        </tr>
      `)
      .join("") || "";

    const emailHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Welcome to December Intensive!</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Dear ${profile?.full_name || "Student"},</p>
            
            <p style="font-size: 16px;">
              Thank you for enrolling in the <strong>December 2025 Intensive Program</strong>! 
              We're excited to have you join us for this comprehensive 2-week learning experience.
            </p>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h2 style="margin-top: 0; color: #667eea;">Program Details</h2>
              <p><strong>Program:</strong> ${enrollment.intensive_programs.name}</p>
              <p><strong>Dates:</strong> December 8-19, 2025</p>
              <p><strong>Total Subjects:</strong> ${enrollment.total_subjects}</p>
            </div>

            <h3 style="color: #667eea; margin-top: 30px;">Your Daily Schedule</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: white;">
              <thead>
                <tr style="background: #667eea; color: white;">
                  <th style="padding: 12px; text-align: left;">Subject</th>
                  <th style="padding: 12px; text-align: left;">Time</th>
                  <th style="padding: 12px; text-align: left;">Curriculum</th>
                </tr>
              </thead>
              <tbody>
                ${scheduleHTML}
              </tbody>
            </table>

            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; font-size: 14px;">
                <strong>📅 What's Next:</strong><br>
                • You will receive daily reminder emails at 7:00 AM EAT with that day's schedule<br>
                • Meeting links will be sent 24 hours before the program starts<br>
                • All times are in East Africa Time (EAT)
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <p style="font-size: 14px; color: #6b7280;">
                Questions? Contact us at <a href="mailto:info@lanatutors.africa" style="color: #667eea;">info@lanatutors.africa</a>
              </p>
            </div>

            <p style="font-size: 16px;">
              We look forward to seeing you in class!
            </p>

            <p style="font-size: 16px;">
              Best regards,<br>
              <strong>The LANA Tutors Team</strong>
            </p>
          </div>
        </body>
      </html>
    `;

    // Send email via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "LANA Tutors <info@lanatutors.africa>",
        to: [user.email],
        subject: `Welcome to December Intensive Program - Your Enrollment is Confirmed`,
        html: emailHTML,
      }),
    });

    if (!emailRes.ok) {
      const error = await emailRes.text();
      throw new Error(`Failed to send email: ${error}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});