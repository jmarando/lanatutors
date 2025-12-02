import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get today's date
    const today = new Date();
    const todayDay = today.toLocaleString('en-US', { weekday: 'long' });

    // Fetch all enrollments with completed payment
    const { data: enrollments, error: enrollmentsError } = await supabaseAdmin
      .from("intensive_enrollments")
      .select(`
        *,
        intensive_programs (
          name,
          start_date,
          end_date
        )
      `)
      .eq("payment_status", "completed");

    if (enrollmentsError) {
      throw enrollmentsError;
    }

    // Process each enrollment
    for (const enrollment of enrollments || []) {
      // Check if program is currently active
      const startDate = new Date(enrollment.intensive_programs.start_date);
      const endDate = new Date(enrollment.intensive_programs.end_date);
      
      if (today < startDate || today > endDate) {
        continue; // Skip if program hasn't started or has ended
      }

      // Fetch student profile and email
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", enrollment.student_id)
        .single();

      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(enrollment.student_id);

      if (!user?.email) {
        console.error(`No email found for student ${enrollment.student_id}`);
        continue;
      }

      // Fetch today's classes for this student
      const { data: classes } = await supabaseAdmin
        .from("intensive_classes")
        .select("subject, time_slot, meeting_link")
        .in("id", enrollment.enrolled_class_ids);

      if (!classes || classes.length === 0) {
        continue;
      }

      // Build schedule HTML
      const scheduleHTML = classes
        .map((cls) => `
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${cls.subject}</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${cls.time_slot} EAT</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">
              ${cls.meeting_link 
                ? `<a href="${cls.meeting_link}" style="color: #667eea; text-decoration: none;">Join Class</a>`
                : 'Link coming soon'
              }
            </td>
          </tr>
        `)
        .join("");

      const emailHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 28px;">Today's Classes</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">${todayDay}, ${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px;">Good morning, ${profile?.full_name || "Student"}!</p>
              
              <p style="font-size: 16px;">
                Here's your schedule for today's December Intensive classes:
              </p>

              <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: white;">
                <thead>
                  <tr style="background: #667eea; color: white;">
                    <th style="padding: 12px; text-align: left;">Subject</th>
                    <th style="padding: 12px; text-align: left;">Time</th>
                    <th style="padding: 12px; text-align: left;">Meeting Link</th>
                  </tr>
                </thead>
                <tbody>
                  ${scheduleHTML}
                </tbody>
              </table>

              <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                <p style="margin: 0; font-size: 14px;">
                  <strong>💡 Tips for Success:</strong><br>
                  • Join 5 minutes before class starts<br>
                  • Have your notebook and materials ready<br>
                  • All times are in East Africa Time (EAT)<br>
                  • Need help? Email us at info@lanatutors.africa
                </p>
              </div>

              <p style="font-size: 16px;">
                Have a great day of learning!
              </p>

              <p style="font-size: 16px;">
                Best regards,<br>
                <strong>The Lana Tutors Team</strong>
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
          from: "Lana Tutors <info@lanatutors.africa>",
          to: [user.email],
          subject: `Today's December Intensive Schedule - ${todayDay}`,
          html: emailHTML,
        }),
      });

      if (!emailRes.ok) {
        const error = await emailRes.text();
        console.error(`Failed to send email to ${user.email}: ${error}`);
      }
    }

    return new Response(JSON.stringify({ success: true, count: enrollments?.length || 0 }), {
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