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
    console.log(`Processing enrollment confirmation for: ${enrollmentId}`);

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
      console.error("Enrollment not found:", enrollmentError);
      throw new Error("Enrollment not found");
    }

    // Fetch student profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", enrollment.student_id)
      .single();

    // If enrollment has student_profile_id, fetch the student's name from students table
    let actualStudentName = profile?.full_name;
    if (enrollment.student_profile_id) {
      const { data: studentChildProfile } = await supabaseAdmin
        .from("students")
        .select("full_name")
        .eq("id", enrollment.student_profile_id)
        .maybeSingle();
      if (studentChildProfile?.full_name) {
        actualStudentName = studentChildProfile.full_name;
      }
    }

    // Fetch enrolled classes WITH meeting_link and tutor info
    const { data: classes } = await supabaseAdmin
      .from("intensive_classes")
      .select("id, subject, time_slot, curriculum, grade_levels, meeting_link, tutor_id")
      .in("id", enrollment.enrolled_class_ids);

    // Get tutor names
    const tutorIds = classes?.map(c => c.tutor_id).filter(Boolean) || [];
    const tutorInfo: Record<string, string> = {};
    
    if (tutorIds.length > 0) {
      const { data: tutorProfiles } = await supabaseAdmin
        .from("tutor_profiles")
        .select("id, user_id")
        .in("id", tutorIds);
      
      if (tutorProfiles) {
        const userIds = tutorProfiles.map(tp => tp.user_id);
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        
        if (profiles) {
          tutorProfiles.forEach(tp => {
            const p = profiles.find(pr => pr.id === tp.user_id);
            if (p) tutorInfo[tp.id] = p.full_name || "TBA";
          });
        }
      }
    }

    // Get student email
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(enrollment.student_id);

    if (!user?.email) {
      console.error("Student email not found");
      throw new Error("Student email not found");
    }

    console.log(`Sending email to: ${user.email}`);

    // Build schedule HTML with meeting links
    const scheduleHTML = classes
      ?.map((cls) => {
        const tutorName = cls.tutor_id ? tutorInfo[cls.tutor_id] || "TBA" : "TBA";
        const meetingLink = cls.meeting_link || "";
        const joinButton = meetingLink
          ? `<a href="${meetingLink}" style="display: inline-block; background-color: #D95436; color: #ffffff; text-decoration: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 500;">Join Class</a>`
          : `<span style="color: #666666; font-size: 12px;">Link coming soon</span>`;
        
        return `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #1a1a1a; font-weight: 500;">${cls.subject}</td>
            <td style="padding: 12px; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #666666;">${cls.time_slot} EAT</td>
            <td style="padding: 12px; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #666666;">${tutorName}</td>
            <td style="padding: 12px; border-bottom: 1px solid #FFD6D6; text-align: center;">${joinButton}</td>
          </tr>
        `;
      })
      .join("") || "";

    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; max-width: 600px;">
                
                <!-- Header -->
                <tr>
                  <td align="center" style="background-color: #D95436; padding: 40px 30px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td align="center" style="font-size: 32px; color: #ffffff; padding-bottom: 8px;">🎓</td>
                      </tr>
                      <tr>
                        <td align="center" style="font-size: 28px; font-weight: 600; color: #ffffff; letter-spacing: -0.5px;">Welcome to December Bootcamp!</td>
                      </tr>
                      <tr>
                        <td align="center" style="font-size: 14px; color: #ffffff; opacity: 0.9; padding-top: 8px;">December 8-19, 2025</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 30px;">
                    
                    <!-- Greeting -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 8px; font-size: 18px; font-weight: 600; color: #1a1a1a;">Hi ${profile?.full_name || "there"},</td>
                      </tr>
                      ${actualStudentName && actualStudentName !== profile?.full_name ? `
                      <tr>
                        <td style="padding-bottom: 8px; font-size: 14px; color: #4a4a4a;">Enrollment for: <strong>${actualStudentName}</strong></td>
                      </tr>
                      ` : ''}
                      </tr>
                      <tr>
                        <td style="padding-bottom: 20px; font-size: 15px; line-height: 1.6; color: #4a4a4a;">
                          Thank you for enrolling in the <strong>December 2025 Holiday Bootcamp</strong>! 
                          We're excited to have you join us for this intensive 2-week learning experience.
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Program Details -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FFF5F5; border-radius: 12px; margin: 24px 0;">
                      <tr>
                        <td style="padding: 24px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td style="padding-bottom: 16px; font-size: 18px; font-weight: 600; color: #D95436;">📅 Program Details</td>
                            </tr>
                            <tr>
                              <td>
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                  <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #666666;">Program:</td>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${enrollment.intensive_programs?.name || "December Holiday Bootcamp"}</td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #666666;">Dates:</td>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">December 8-19, 2025 (Mon-Fri)</td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #666666;">Daily Schedule:</td>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">8:00 AM - 5:15 PM EAT</td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 10px 0; font-size: 14px; color: #666666;">Total Subjects:</td>
                                    <td style="padding: 10px 0; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${enrollment.total_subjects}</td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Your Classes -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0;">
                      <tr>
                        <td style="padding-bottom: 16px; font-size: 18px; font-weight: 600; color: #D95436;">📚 Your Classes</td>
                      </tr>
                      <tr>
                        <td>
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff; border: 1px solid #FFD6D6; border-radius: 8px;">
                            <thead>
                              <tr style="background-color: #FFF5F5;">
                                <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600; color: #D95436;">Subject</th>
                                <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600; color: #D95436;">Time</th>
                                <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600; color: #D95436;">Tutor</th>
                                <th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 600; color: #D95436;">Join</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${scheduleHTML}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- What's Next -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FFFBEB; border-radius: 12px; margin: 24px 0; border-left: 4px solid #D97706;">
                      <tr>
                        <td style="padding: 20px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td style="padding-bottom: 12px; font-size: 16px; font-weight: 600; color: #92400E;">📌 What's Next?</td>
                            </tr>
                            <tr>
                              <td style="font-size: 14px; line-height: 1.8; color: #78350F;">
                                • <strong>Join your classes</strong> using the links above on December 8th<br>
                                • All times are in <strong>East Africa Time (EAT)</strong><br>
                                • You'll receive daily reminders at 7:00 AM EAT<br>
                                • <strong>Manage your classes</strong> anytime via your <a href="https://lanatutors.africa/student/dashboard" style="color: #D95436; text-decoration: underline;">Student Dashboard</a><br>
                                • Ensure a quiet study space and stable internet connection
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Contact -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 24px;">
                      <tr>
                        <td style="text-align: center; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                          <p style="margin: 0 0 8px 0; font-size: 14px; color: #666666;">Questions? We're here to help!</p>
                          <a href="mailto:info@lanatutors.africa" style="color: #D95436; font-weight: 500; text-decoration: none;">info@lanatutors.africa</a>
                        </td>
                      </tr>
                    </table>

                    <!-- Sign Off -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 30px;">
                      <tr>
                        <td style="font-size: 15px; line-height: 1.6; color: #4a4a4a;">
                          We look forward to seeing you in class!<br><br>
                          Best regards,<br>
                          <strong style="color: #D95436;">The Lana Tutors Team</strong>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                      Lana Tutors • Quality Education, Accessible to All<br>
                      <a href="https://lanatutors.africa" style="color: #D95436; text-decoration: none;">lanatutors.africa</a>
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
        subject: `🎓 Welcome to December Bootcamp - Your Enrollment is Confirmed!`,
        html: emailHTML,
      }),
    });

    if (!emailRes.ok) {
      const error = await emailRes.text();
      console.error("Resend API error:", error);
      throw new Error(`Failed to send email: ${error}`);
    }

    console.log("Email sent successfully");

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
