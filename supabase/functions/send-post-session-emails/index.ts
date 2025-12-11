import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const generateFeedbackEmail = (
  studentName: string,
  tutorName: string,
  subject: string,
  sessionDate: string
) => {
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
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">🌟 How Was Your Session?</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                    Hi ${studentName},
                  </p>
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                    We hope you had a great ${subject} session with ${tutorName} on ${sessionDate}! Your feedback helps us improve and helps other students find great tutors.
                  </p>
                  
                  <!-- Session Card -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; margin-bottom: 30px;">
                    <tr>
                      <td style="padding: 25px; text-align: center;">
                        <p style="color: #166534; font-size: 16px; margin: 0 0 10px;">Your session with</p>
                        <h3 style="color: #15803d; margin: 0; font-size: 24px;">${tutorName}</h3>
                        <p style="color: #166534; font-size: 14px; margin: 10px 0 0;">${subject} • ${sessionDate}</p>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Rating Stars -->
                  <div style="text-align: center; margin-bottom: 30px;">
                    <p style="color: #6b7280; font-size: 14px; margin: 0 0 15px;">How would you rate your experience?</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <a href="mailto:info@lanatutors.africa?subject=Session Feedback - 5 Stars&body=I rate my session with ${tutorName} 5 stars! Comments: " style="text-decoration: none; font-size: 32px; margin: 0 5px;">⭐</a>
                          <a href="mailto:info@lanatutors.africa?subject=Session Feedback - 5 Stars&body=I rate my session with ${tutorName} 5 stars! Comments: " style="text-decoration: none; font-size: 32px; margin: 0 5px;">⭐</a>
                          <a href="mailto:info@lanatutors.africa?subject=Session Feedback - 5 Stars&body=I rate my session with ${tutorName} 5 stars! Comments: " style="text-decoration: none; font-size: 32px; margin: 0 5px;">⭐</a>
                          <a href="mailto:info@lanatutors.africa?subject=Session Feedback - 5 Stars&body=I rate my session with ${tutorName} 5 stars! Comments: " style="text-decoration: none; font-size: 32px; margin: 0 5px;">⭐</a>
                          <a href="mailto:info@lanatutors.africa?subject=Session Feedback - 5 Stars&body=I rate my session with ${tutorName} 5 stars! Comments: " style="text-decoration: none; font-size: 32px; margin: 0 5px;">⭐</a>
                        </td>
                      </tr>
                    </table>
                  </div>
                  
                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 10px 0 30px;">
                        <a href="mailto:info@lanatutors.africa?subject=Session Feedback for ${tutorName}&body=Hi Lana Tutors,%0A%0AI had a session with ${tutorName} for ${subject} on ${sessionDate}.%0A%0AMy rating: [1-5 stars]%0A%0AWhat I liked:%0A%0AWhat could be improved:%0A%0AAdditional comments:" 
                           style="display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(255, 107, 53, 0.4);">
                          Share Your Feedback
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0; text-align: center;">
                    Your feedback is anonymous and helps us maintain high teaching standards.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px;">
                    Thank you for learning with us! 📚
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
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);

    // Find completed sessions from 24-25 hours ago
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(`
        *,
        tutor_availability!inner (start_time, end_time)
      `)
      .eq("status", "confirmed")
      .gte("tutor_availability.end_time", twentyFiveHoursAgo.toISOString())
      .lt("tutor_availability.end_time", twentyFourHoursAgo.toISOString());

    if (error) {
      console.error("Error fetching bookings:", error);
      throw error;
    }

    let sentCount = 0;

    for (const booking of bookings || []) {
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

        const sessionDate = new Date(booking.tutor_availability.start_time).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        });

        const emailHtml = generateFeedbackEmail(
          studentProfile?.full_name || "Student",
          tutorName?.full_name || "Your Tutor",
          booking.subject,
          sessionDate
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
            subject: `🌟 How was your ${booking.subject} session with ${tutorName?.full_name}?`,
            html: emailHtml,
          }),
        });

        if (emailResponse.ok) {
          sentCount++;
          console.log(`Feedback request sent for booking ${booking.id}`);
        }
      } catch (err) {
        console.error(`Error sending feedback request:`, err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, feedbackRequestsSent: sentCount }),
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
