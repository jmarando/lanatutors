import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const generateWeeklyEarningsEmail = (
  tutorName: string,
  weekEarnings: number,
  sessionsCompleted: number,
  upcomingSessions: number,
  weekStart: string,
  weekEnd: string
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
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">📊 Your Weekly Summary</h1>
                  <p style="color: #93c5fd; margin: 10px 0 0; font-size: 14px;">${weekStart} - ${weekEnd}</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                    Hi ${tutorName}, here's a snapshot of your teaching activity this week:
                  </p>
                  
                  <!-- Stats Cards -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                    <tr>
                      <td width="50%" style="padding-right: 10px;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px;">
                          <tr>
                            <td style="padding: 25px; text-align: center;">
                              <p style="color: #059669; font-size: 14px; margin: 0 0 5px; text-transform: uppercase; font-weight: 600;">Net Earnings</p>
                              <p style="color: #047857; font-size: 32px; font-weight: 700; margin: 0;">KES ${weekEarnings.toLocaleString()}</p>
                              <p style="color: #6b7280; font-size: 12px; margin: 5px 0 0;">(After 30% platform fee)</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td width="50%" style="padding-left: 10px;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 12px;">
                          <tr>
                            <td style="padding: 25px; text-align: center;">
                              <p style="color: #2563eb; font-size: 14px; margin: 0 0 5px; text-transform: uppercase; font-weight: 600;">Sessions</p>
                              <p style="color: #1d4ed8; font-size: 32px; font-weight: 700; margin: 0;">${sessionsCompleted}</p>
                              <p style="color: #6b7280; font-size: 12px; margin: 5px 0 0;">Completed this week</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Upcoming -->
                  <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; margin-bottom: 30px; text-align: center;">
                    <p style="color: #92400e; font-size: 14px; margin: 0;">
                      📅 You have <strong>${upcomingSessions} upcoming sessions</strong> scheduled for next week
                    </p>
                  </div>
                  
                  <!-- CTA -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 10px 0;">
                        <a href="https://lanatutors.africa/tutor/dashboard" 
                           style="display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(255, 107, 53, 0.4);">
                          View Dashboard
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
                    Thank you for teaching with Lana Tutors! 🎓
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

const generateCalendarSyncReminder = (tutorName: string) => {
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
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">📅 Sync Your Calendar</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                    Hi ${tutorName},
                  </p>
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                    We noticed you haven't connected your Google Calendar yet. Syncing your calendar helps you:
                  </p>
                  
                  <!-- Benefits -->
                  <div style="margin-bottom: 30px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 12px 0;">
                          <span style="display: inline-block; background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 20px; font-size: 14px; margin-right: 10px;">✓</span>
                          <span style="color: #374151; font-size: 15px;">Automatically block busy times</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0;">
                          <span style="display: inline-block; background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 20px; font-size: 14px; margin-right: 10px;">✓</span>
                          <span style="color: #374151; font-size: 15px;">Get booking notifications in your calendar</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0;">
                          <span style="display: inline-block; background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 20px; font-size: 14px; margin-right: 10px;">✓</span>
                          <span style="color: #374151; font-size: 15px;">Avoid double-booking conflicts</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0;">
                          <span style="display: inline-block; background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 20px; font-size: 14px; margin-right: 10px;">✓</span>
                          <span style="color: #374151; font-size: 15px;">Keep your schedule organized in one place</span>
                        </td>
                      </tr>
                    </table>
                  </div>
                  
                  <!-- CTA -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 10px 0 30px;">
                        <a href="https://lanatutors.africa/tutor/availability" 
                           style="display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(255, 107, 53, 0.4);">
                          Connect Google Calendar
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0; text-align: center;">
                    Takes less than 2 minutes to set up!
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
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
    let sentCount = 0;

    // 1. WEEKLY EARNINGS SUMMARY (Run on Sundays)
    if (now.getDay() === 0) { // Sunday
      const weekEnd = new Date(now);
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get all verified tutors
      const { data: tutors } = await supabase
        .from("tutor_profiles")
        .select("id, user_id, email")
        .eq("verified", true);

      for (const tutor of tutors || []) {
        try {
          // Get completed bookings this week
          const { data: weekBookings } = await supabase
            .from("bookings")
            .select(`
              amount,
              tutor_availability!inner (end_time)
            `)
            .eq("tutor_id", tutor.user_id)
            .eq("status", "confirmed")
            .gte("tutor_availability.end_time", weekStart.toISOString())
            .lt("tutor_availability.end_time", weekEnd.toISOString());

          const sessionsCompleted = weekBookings?.length || 0;
          const grossEarnings = (weekBookings || []).reduce((sum, b) => sum + (b.amount || 0), 0);
          const netEarnings = Math.round(grossEarnings * 0.7); // 70% after platform fee

          // Get upcoming sessions
          const { data: upcomingBookings } = await supabase
            .from("bookings")
            .select("id, tutor_availability!inner (start_time)")
            .eq("tutor_id", tutor.user_id)
            .eq("status", "confirmed")
            .gte("tutor_availability.start_time", now.toISOString());

          const upcomingSessions = upcomingBookings?.length || 0;

          // Get tutor name
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", tutor.user_id)
            .single();

          const { data: userData } = await supabase.auth.admin.getUserById(tutor.user_id);

          if (!userData?.user?.email) continue;

          const weekStartStr = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const weekEndStr = weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" });

          const emailHtml = generateWeeklyEarningsEmail(
            profile?.full_name || "Tutor",
            netEarnings,
            sessionsCompleted,
            upcomingSessions,
            weekStartStr,
            weekEndStr
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
              subject: `📊 Weekly Summary: KES ${netEarnings.toLocaleString()} Earned, ${sessionsCompleted} Sessions`,
              html: emailHtml,
            }),
          });

          if (emailResponse.ok) sentCount++;
        } catch (err) {
          console.error("Error sending weekly summary:", err);
        }
      }
    }

    // 2. CALENDAR SYNC REMINDER (Check monthly - run on 1st)
    if (now.getDate() === 1) {
      const { data: unconnectedTutors } = await supabase
        .from("tutor_profiles")
        .select("id, user_id")
        .eq("verified", true)
        .or("google_calendar_connected.is.null,google_calendar_connected.eq.false");

      for (const tutor of unconnectedTutors || []) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", tutor.user_id)
            .single();

          const { data: userData } = await supabase.auth.admin.getUserById(tutor.user_id);

          if (!userData?.user?.email) continue;

          const emailHtml = generateCalendarSyncReminder(profile?.full_name || "Tutor");

          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "Lana Tutors <info@lanatutors.africa>",
              to: [userData.user.email],
              subject: "📅 Connect Your Google Calendar for Easier Scheduling",
              html: emailHtml,
            }),
          });

          if (emailResponse.ok) sentCount++;
        } catch (err) {
          console.error("Error sending calendar reminder:", err);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, emailsSent: sentCount }),
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
