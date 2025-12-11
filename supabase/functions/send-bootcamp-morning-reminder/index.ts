import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const generateMorningReminderEmail = (
  studentName: string,
  classes: Array<{ subject: string; time_slot: string; tutor_name: string; meeting_link: string }>,
  dayNumber: number
) => {
  const classRows = classes.map(c => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #374151;">${c.time_slot}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #374151; font-weight: 600;">${c.subject}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #374151;">${c.tutor_name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <a href="${c.meeting_link || '#'}" style="color: #FF6B35; text-decoration: none; font-weight: 600;">Join →</a>
      </td>
    </tr>
  `).join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 40px 40px 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">🌅 Good Morning!</h1>
                  <p style="color: #93c5fd; margin: 10px 0 0; font-size: 16px;">Day ${dayNumber} of December Holiday Bootcamp</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                    Hi ${studentName},
                  </p>
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                    Rise and shine! 🌟 Here's your schedule for today. Make the most of each session!
                  </p>
                  
                  <!-- Schedule Table -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 30px;">
                    <tr style="background-color: #f8fafc;">
                      <th style="padding: 12px; text-align: left; color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600;">Time</th>
                      <th style="padding: 12px; text-align: left; color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600;">Subject</th>
                      <th style="padding: 12px; text-align: left; color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600;">Tutor</th>
                      <th style="padding: 12px; text-align: left; color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600;">Link</th>
                    </tr>
                    ${classRows}
                  </table>
                  
                  <!-- Tips -->
                  <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                    <h4 style="color: #065f46; margin: 0 0 10px; font-size: 15px;">🎯 Today's Goals:</h4>
                    <ul style="color: #047857; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
                      <li>Stay focused and ask questions</li>
                      <li>Take notes on key concepts</li>
                      <li>Complete any practice exercises</li>
                      <li>Review today's topics tonight</li>
                    </ul>
                  </div>
                  
                  <!-- CTA -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 10px 0;">
                        <a href="https://lanatutors.africa/student/dashboard" 
                           style="display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(255, 107, 53, 0.4);">
                          View Full Schedule
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px;">
                    Have a productive day! 📚
                  </p>
                  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    © 2025 Lana Tutors. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return new Response(
        JSON.stringify({ message: "No bootcamp on weekends" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get active programs
    const { data: programs, error: programError } = await supabase
      .from("intensive_programs")
      .select("*")
      .eq("is_active", true)
      .lte("start_date", today.toISOString().split('T')[0])
      .gte("end_date", today.toISOString().split('T')[0]);

    if (programError || !programs?.length) {
      return new Response(
        JSON.stringify({ message: "No active bootcamp programs today" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;

    for (const program of programs) {
      // Calculate day number
      const startDate = new Date(program.start_date);
      let dayNumber = 1;
      const tempDate = new Date(startDate);
      while (tempDate < today) {
        const dow = tempDate.getDay();
        if (dow !== 0 && dow !== 6) dayNumber++;
        tempDate.setDate(tempDate.getDate() + 1);
      }

      // Get completed enrollments
      const { data: enrollments, error: enrollError } = await supabase
        .from("intensive_enrollments")
        .select("*")
        .eq("program_id", program.id)
        .eq("payment_status", "completed");

      if (enrollError) {
        console.error("Error fetching enrollments:", enrollError);
        continue;
      }

      for (const enrollment of enrollments || []) {
        try {
          // Get student info
          const { data: userData } = await supabase.auth.admin.getUserById(enrollment.student_id);
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", enrollment.student_id)
            .single();

          if (!userData?.user?.email) continue;

          // Get enrolled classes with tutor info
          const { data: classes } = await supabase
            .from("intensive_classes")
            .select(`
              *,
              tutor:tutor_profiles(
                user_id,
                profiles:user_id(full_name)
              )
            `)
            .in("id", enrollment.enrolled_class_ids);

          const classDetails = (classes || []).map(c => ({
            subject: c.subject,
            time_slot: c.time_slot,
            tutor_name: c.tutor?.profiles?.full_name || "TBA",
            meeting_link: c.meeting_link || "",
          })).sort((a, b) => a.time_slot.localeCompare(b.time_slot));

          const emailHtml = generateMorningReminderEmail(
            profile?.full_name || "Student",
            classDetails,
            dayNumber
          );

          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "Lana Tutors <info@lanatutors.africa>",
              to: [userData.user.email],
              subject: `🌅 Day ${dayNumber}: Your Bootcamp Schedule for Today`,
              html: emailHtml,
            }),
          });

          if (emailResponse.ok) {
            sentCount++;
            console.log(`Morning reminder sent to ${userData.user.email}`);
          }
        } catch (err) {
          console.error(`Error sending morning reminder:`, err);
        }
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
