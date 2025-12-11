import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const generateMissYouEmail = (studentName: string, lastBookingDate: string) => {
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
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">💫 We Miss You!</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                    Hi ${studentName},
                  </p>
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                    It's been a while since your last session on ${lastBookingDate}. We hope everything is going well with your studies!
                  </p>
                  
                  <!-- Encouragement Card -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 12px; margin-bottom: 30px;">
                    <tr>
                      <td style="padding: 25px; text-align: center;">
                        <h3 style="color: #1e40af; margin: 0 0 15px; font-size: 20px;">Ready to Continue Learning?</h3>
                        <p style="color: #1e3a8a; font-size: 15px; margin: 0; line-height: 1.6;">
                          Our expert tutors are here to help you achieve your academic goals. Whether you need help with homework, exam prep, or mastering new concepts – we've got you covered!
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Benefits -->
                  <div style="margin-bottom: 30px;">
                    <h4 style="color: #374151; margin: 0 0 15px; font-size: 16px;">Why students love Lana Tutors:</h4>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="color: #059669; font-size: 18px; margin-right: 10px;">✓</span>
                          <span style="color: #374151; font-size: 15px;">Personalized 1-on-1 attention</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="color: #059669; font-size: 18px; margin-right: 10px;">✓</span>
                          <span style="color: #374151; font-size: 15px;">Flexible scheduling that fits your life</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="color: #059669; font-size: 18px; margin-right: 10px;">✓</span>
                          <span style="color: #374151; font-size: 15px;">Expert tutors for every subject</span>
                        </td>
                      </tr>
                    </table>
                  </div>
                  
                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 10px 0 30px;">
                        <a href="https://lanatutors.africa/find-a-tutor" 
                           style="display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(255, 107, 53, 0.4);">
                          Book a Session
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0; text-align: center;">
                    Need help choosing a tutor? Book a free consultation with our team!
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px;">
                    We're here to help you succeed! 🎓
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

const generatePackageExpiryEmail = (
  studentName: string,
  tutorName: string,
  sessionsRemaining: number,
  expiryDate: string,
  daysLeft: number,
  isUrgent: boolean
) => {
  const urgencyColor = isUrgent ? "#dc2626" : "#f59e0b";
  const urgencyBg = isUrgent ? "#fef2f2" : "#fffbeb";
  
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
                <td style="background: linear-gradient(135deg, ${urgencyColor} 0%, ${isUrgent ? '#ef4444' : '#fbbf24'} 100%); padding: 40px 40px 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
                    ${isUrgent ? '⚠️ Package Expires Tomorrow!' : '⏳ Package Expiring Soon'}
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                    Hi ${studentName},
                  </p>
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                    ${isUrgent 
                      ? `This is your final reminder – your session package with ${tutorName} expires tomorrow!` 
                      : `Just a heads up that your session package with ${tutorName} will expire in ${daysLeft} days.`
                    }
                  </p>
                  
                  <!-- Package Details Card -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: ${urgencyBg}; border-radius: 12px; margin-bottom: 30px; border: 2px solid ${urgencyColor};">
                    <tr>
                      <td style="padding: 25px; text-align: center;">
                        <h3 style="color: ${urgencyColor}; margin: 0 0 15px; font-size: 18px;">📦 Package Status</h3>
                        <p style="color: #374151; font-size: 40px; font-weight: 700; margin: 0;">${sessionsRemaining}</p>
                        <p style="color: #6b7280; font-size: 14px; margin: 5px 0 15px;">Sessions Remaining</p>
                        <p style="color: ${urgencyColor}; font-size: 16px; font-weight: 600; margin: 0;">
                          Expires: ${expiryDate}
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 10px 0 30px;">
                        <a href="https://lanatutors.africa/student/dashboard" 
                           style="display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(255, 107, 53, 0.4);">
                          Book Your Sessions Now
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0; text-align: center;">
                    Don't let your sessions go to waste! Book before ${expiryDate} to use them all.
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

    // 1. PACKAGE EXPIRY REMINDERS (7 days and 1 day before)
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const eightDaysFromNow = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
    const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    // 7-day warning
    const { data: packages7d } = await supabase
      .from("package_purchases")
      .select("*")
      .eq("payment_status", "completed")
      .gt("sessions_remaining", 0)
      .gte("expires_at", sevenDaysFromNow.toISOString())
      .lt("expires_at", eightDaysFromNow.toISOString());

    for (const pkg of packages7d || []) {
      try {
        const { data: studentProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", pkg.student_id)
          .single();

        const { data: userData } = await supabase.auth.admin.getUserById(pkg.student_id);

        const { data: tutorProfile } = await supabase
          .from("tutor_profiles")
          .select("user_id")
          .eq("id", pkg.tutor_id)
          .single();

        const { data: tutorName } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", tutorProfile?.user_id)
          .single();

        if (!userData?.user?.email) continue;

        const expiryDate = new Date(pkg.expires_at).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        });

        const emailHtml = generatePackageExpiryEmail(
          studentProfile?.full_name || "Student",
          tutorName?.full_name || "Your Tutor",
          pkg.sessions_remaining,
          expiryDate,
          7,
          false
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
            subject: `⏳ Your Package Expires in 7 Days - ${pkg.sessions_remaining} Sessions Left`,
            html: emailHtml,
          }),
        });

        if (emailResponse.ok) sentCount++;
      } catch (err) {
        console.error("Error sending 7-day expiry:", err);
      }
    }

    // 1-day urgent warning
    const { data: packages1d } = await supabase
      .from("package_purchases")
      .select("*")
      .eq("payment_status", "completed")
      .gt("sessions_remaining", 0)
      .gte("expires_at", oneDayFromNow.toISOString())
      .lt("expires_at", twoDaysFromNow.toISOString());

    for (const pkg of packages1d || []) {
      try {
        const { data: studentProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", pkg.student_id)
          .single();

        const { data: userData } = await supabase.auth.admin.getUserById(pkg.student_id);

        const { data: tutorProfile } = await supabase
          .from("tutor_profiles")
          .select("user_id")
          .eq("id", pkg.tutor_id)
          .single();

        const { data: tutorName } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", tutorProfile?.user_id)
          .single();

        if (!userData?.user?.email) continue;

        const expiryDate = new Date(pkg.expires_at).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        });

        const emailHtml = generatePackageExpiryEmail(
          studentProfile?.full_name || "Student",
          tutorName?.full_name || "Your Tutor",
          pkg.sessions_remaining,
          expiryDate,
          1,
          true
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
            subject: `⚠️ URGENT: Package Expires Tomorrow - ${pkg.sessions_remaining} Sessions Will Be Lost!`,
            html: emailHtml,
          }),
        });

        if (emailResponse.ok) sentCount++;
      } catch (err) {
        console.error("Error sending 1-day expiry:", err);
      }
    }

    // 2. "WE MISS YOU" EMAILS (30 days no booking)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyOneDaysAgo = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);

    const { data: inactiveBookings } = await supabase
      .from("bookings")
      .select("student_id, created_at")
      .eq("status", "confirmed")
      .gte("created_at", thirtyOneDaysAgo.toISOString())
      .lt("created_at", thirtyDaysAgo.toISOString());

    // Get unique students who haven't booked in 30 days
    const inactiveStudentIds = [...new Set((inactiveBookings || []).map(b => b.student_id))];

    for (const studentId of inactiveStudentIds) {
      try {
        // Check if they've booked anything more recently
        const { data: recentBookings } = await supabase
          .from("bookings")
          .select("id")
          .eq("student_id", studentId)
          .gt("created_at", thirtyDaysAgo.toISOString())
          .limit(1);

        if (recentBookings && recentBookings.length > 0) continue;

        const { data: studentProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", studentId)
          .single();

        const { data: userData } = await supabase.auth.admin.getUserById(studentId);

        if (!userData?.user?.email) continue;

        const lastBookingDate = thirtyDaysAgo.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
        });

        const emailHtml = generateMissYouEmail(
          studentProfile?.full_name || "Student",
          lastBookingDate
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
            subject: "💫 We Miss You! Ready to Continue Learning?",
            html: emailHtml,
          }),
        });

        if (emailResponse.ok) sentCount++;
      } catch (err) {
        console.error("Error sending miss you email:", err);
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
