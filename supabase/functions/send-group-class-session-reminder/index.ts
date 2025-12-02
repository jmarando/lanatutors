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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get tomorrow's day of week
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDay = tomorrow.toLocaleDateString("en-US", { weekday: "long" });

    // Fetch all active enrollments for classes happening tomorrow
    const { data: enrollments, error } = await supabase
      .from("group_class_enrollments")
      .select(`
        *,
        group_classes (
          id,
          title,
          subject,
          day_of_week,
          start_time,
          end_time,
          meeting_link
        )
      `)
      .eq("status", "active")
      .eq("payment_status", "completed")
      .eq("group_classes.day_of_week", tomorrowDay)
      .gte("expires_at", tomorrow.toISOString().split('T')[0]);

    if (error) throw error;

    if (!enrollments || enrollments.length === 0) {
      return new Response(JSON.stringify({ message: "No reminders to send" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formatTime = (time: string) => {
      return new Date(`1970-01-01T${time}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    };

    let sentCount = 0;

    for (const enrollment of enrollments) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", enrollment.student_id)
          .single();

        const { data: userEmail } = await supabase.auth.admin.getUserById(enrollment.student_id);

        if (!userEmail?.user?.email) continue;

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
              .reminder-box { background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0; }
              .class-info { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
              .button { display: inline-block; background: #FF6B35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">Class Reminder ⏰</h1>
              </div>
              <div class="content">
                <p>Hi ${profile?.full_name || "there"},</p>
                
                <div class="reminder-box">
                  <h2 style="margin-top: 0;">Your class is tomorrow!</h2>
                  <p style="margin-bottom: 0;">Don't forget about your upcoming ${enrollment.group_classes.subject} class.</p>
                </div>

                <div class="class-info">
                  <h3 style="margin-top: 0;">${enrollment.group_classes.title}</h3>
                  <p><strong>When:</strong> Tomorrow, ${tomorrowDay}</p>
                  <p><strong>Time:</strong> ${formatTime(enrollment.group_classes.start_time)} - ${formatTime(enrollment.group_classes.end_time)} EAT</p>
                  <p><strong>Subject:</strong> ${enrollment.group_classes.subject}</p>
                </div>

                <div style="text-align: center;">
                  <a href="${enrollment.group_classes.meeting_link || 'https://lanatutors.africa/student/dashboard'}" class="button">Join Class Tomorrow</a>
                </div>

                <h3>What to bring:</h3>
                <ul>
                  <li>Your notebook and writing materials</li>
                  <li>Any homework or assignments from the last class</li>
                  <li>Questions you'd like to ask your tutor</li>
                  <li>A positive attitude and readiness to learn!</li>
                </ul>

                <p>If you need to reschedule or have any questions, please contact us at <a href="mailto:info@lanatutors.africa">info@lanatutors.africa</a>.</p>

                <p>See you tomorrow!</p>
                <p><strong>The Lana Tutors Team</strong></p>
              </div>
              <div class="footer">
                <p>© 2025 Lana Tutors. All rights reserved.</p>
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
            from: "Lana Tutors <reminders@lanatutors.africa>",
            to: [userEmail.user.email],
            subject: `⏰ Reminder: ${enrollment.group_classes.title} Tomorrow`,
            html: emailHtml,
          }),
        });

        if (emailResponse.ok) {
          sentCount++;
        }
      } catch (emailError) {
        console.error(`Failed to send reminder to enrollment ${enrollment.id}:`, emailError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, remindersSent: sentCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
