import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Nairobi",
  });
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Africa/Nairobi",
  });
};

const generateEmailTemplate = (
  studentName: string,
  tutorName: string,
  subject: string,
  sessionDate: string,
  sessionTime: string,
  meetingLink: string,
  reminderType: "24h" | "1h"
) => {
  const urgencyText = reminderType === "1h" 
    ? "Your session starts in 1 hour!" 
    : "Your session is tomorrow!";
  
  const ctaText = reminderType === "1h" 
    ? "Join Now" 
    : "Add to Calendar";

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
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">⏰ ${urgencyText}</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                    Hi ${studentName},
                  </p>
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                    This is a friendly reminder about your upcoming tutoring session. We're excited to see you learn and grow!
                  </p>
                  
                  <!-- Session Details Card -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; margin-bottom: 30px;">
                    <tr>
                      <td style="padding: 25px;">
                        <h3 style="color: #92400e; margin: 0 0 15px; font-size: 18px;">📚 Session Details</h3>
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 8px 0; color: #78350f; font-size: 15px;">
                              <strong>Subject:</strong> ${subject}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #78350f; font-size: 15px;">
                              <strong>Tutor:</strong> ${tutorName}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #78350f; font-size: 15px;">
                              <strong>Date:</strong> ${sessionDate}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #78350f; font-size: 15px;">
                              <strong>Time:</strong> ${sessionTime} (EAT)
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 10px 0 30px;">
                        <a href="${meetingLink || 'https://lanatutors.africa/student/dashboard'}" 
                           style="display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(255, 107, 53, 0.4);">
                          ${ctaText}
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Tips -->
                  <div style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                    <h4 style="color: #0369a1; margin: 0 0 10px; font-size: 15px;">💡 Tips for a Great Session:</h4>
                    <ul style="color: #0c4a6e; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
                      <li>Have your notebook and materials ready</li>
                      <li>Find a quiet space with good internet</li>
                      <li>Prepare any questions you have</li>
                      <li>Join 5 minutes early to test your setup</li>
                    </ul>
                  </div>
                  
                  <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">
                    Need to reschedule? Reply to this email or contact us at 
                    <a href="mailto:info@lanatutors.africa" style="color: #FF6B35;">info@lanatutors.africa</a>
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px;">
                    Happy Learning! 🎓
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

    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const twentyFiveHoursFromNow = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // Fetch bookings for 24-hour reminder (between 24-25 hours from now)
    const { data: bookings24h, error: error24h } = await supabase
      .from("bookings")
      .select(`
        *,
        tutor_availability!inner (start_time, end_time)
      `)
      .eq("status", "confirmed")
      .gte("tutor_availability.start_time", twentyFourHoursFromNow.toISOString())
      .lt("tutor_availability.start_time", twentyFiveHoursFromNow.toISOString());

    if (error24h) {
      console.error("Error fetching 24h bookings:", error24h);
    }

    // Fetch bookings for 1-hour reminder (between 1-2 hours from now)
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const { data: bookings1h, error: error1h } = await supabase
      .from("bookings")
      .select(`
        *,
        tutor_availability!inner (start_time, end_time)
      `)
      .eq("status", "confirmed")
      .gte("tutor_availability.start_time", oneHourFromNow.toISOString())
      .lt("tutor_availability.start_time", twoHoursFromNow.toISOString());

    if (error1h) {
      console.error("Error fetching 1h bookings:", error1h);
    }

    let sentCount = 0;

    // Process 24-hour reminders
    for (const booking of bookings24h || []) {
      try {
        // Get student profile
        const { data: studentProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", booking.student_id)
          .single();

        // Get student email
        const { data: userData } = await supabase.auth.admin.getUserById(booking.student_id);

        // Get tutor profile
        const { data: tutorProfile } = await supabase
          .from("tutor_profiles")
          .select("user_id")
          .eq("user_id", booking.tutor_id)
          .single();

        const { data: tutorName } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", booking.tutor_id)
          .single();

        if (!userData?.user?.email) continue;

        const emailHtml = generateEmailTemplate(
          studentProfile?.full_name || "Student",
          tutorName?.full_name || "Your Tutor",
          booking.subject,
          formatDate(booking.tutor_availability.start_time),
          formatTime(booking.tutor_availability.start_time),
          booking.meeting_link || "",
          "24h"
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
            subject: `⏰ Reminder: ${booking.subject} Session Tomorrow with ${tutorName?.full_name || "Your Tutor"}`,
            html: emailHtml,
          }),
        });

        if (emailResponse.ok) {
          sentCount++;
          console.log(`24h reminder sent for booking ${booking.id}`);
        }
      } catch (err) {
        console.error(`Error sending 24h reminder for booking ${booking.id}:`, err);
      }
    }

    // Process 1-hour reminders
    for (const booking of bookings1h || []) {
      try {
        const { data: studentProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", booking.student_id)
          .single();

        const { data: userData } = await supabase.auth.admin.getUserById(booking.student_id);

        const { data: tutorName } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", booking.tutor_id)
          .single();

        if (!userData?.user?.email) continue;

        const emailHtml = generateEmailTemplate(
          studentProfile?.full_name || "Student",
          tutorName?.full_name || "Your Tutor",
          booking.subject,
          formatDate(booking.tutor_availability.start_time),
          formatTime(booking.tutor_availability.start_time),
          booking.meeting_link || "",
          "1h"
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
            subject: `🔔 Starting Soon: ${booking.subject} Session in 1 Hour!`,
            html: emailHtml,
          }),
        });

        if (emailResponse.ok) {
          sentCount++;
          console.log(`1h reminder sent for booking ${booking.id}`);
        }
      } catch (err) {
        console.error(`Error sending 1h reminder for booking ${booking.id}:`, err);
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
