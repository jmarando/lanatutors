import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const generate24hFollowupEmail = (
  parentName: string,
  studentName: string,
  consultationDate: string
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
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">🙏 Thank You for Your Consultation!</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                    Dear ${parentName},
                  </p>
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                    Thank you for taking the time to speak with us about ${studentName}'s learning journey. We truly enjoyed learning about your goals and discussing how we can help!
                  </p>
                  
                  <!-- Recap Card -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; margin-bottom: 30px;">
                    <tr>
                      <td style="padding: 25px;">
                        <h3 style="color: #166534; margin: 0 0 15px; font-size: 18px;">📋 What We Discussed</h3>
                        <p style="color: #15803d; font-size: 15px; line-height: 1.6; margin: 0;">
                          During our consultation on ${consultationDate}, we explored ${studentName}'s academic needs and the best tutoring options. Based on our conversation, our team will be in touch with personalized recommendations.
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Next Steps -->
                  <div style="margin-bottom: 30px;">
                    <h4 style="color: #374151; margin: 0 0 15px; font-size: 16px;">📌 What Happens Next:</h4>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 10px 0; color: #374151; font-size: 15px;">
                          <span style="color: #FF6B35; font-weight: 700; margin-right: 10px;">1.</span>
                          We'll match you with the perfect tutor(s)
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; color: #374151; font-size: 15px;">
                          <span style="color: #FF6B35; font-weight: 700; margin-right: 10px;">2.</span>
                          You'll receive tutor recommendations via email
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; color: #374151; font-size: 15px;">
                          <span style="color: #FF6B35; font-weight: 700; margin-right: 10px;">3.</span>
                          Book your first session whenever you're ready
                        </td>
                      </tr>
                    </table>
                  </div>
                  
                  <!-- CTA -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 10px 0 30px;">
                        <a href="https://lanatutors.africa/find-a-tutor" 
                           style="display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(255, 107, 53, 0.4);">
                          Browse Our Tutors
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0; text-align: center;">
                    Questions? We're always here to help at <a href="mailto:info@lanatutors.africa" style="color: #FF6B35;">info@lanatutors.africa</a>
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px;">
                    Looking forward to helping ${studentName} succeed! 🎓
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

const generate3dayNudgeEmail = (
  parentName: string,
  studentName: string
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
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">🎯 Ready to Get Started?</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                    Hi ${parentName},
                  </p>
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                    We hope you've had a chance to think about our consultation regarding ${studentName}'s tutoring needs. We're excited to help ${studentName} reach their academic goals!
                  </p>
                  
                  <!-- Value Prop Card -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; margin-bottom: 30px;">
                    <tr>
                      <td style="padding: 25px; text-align: center;">
                        <h3 style="color: #92400e; margin: 0 0 15px; font-size: 20px;">Why Start Now?</h3>
                        <p style="color: #78350f; font-size: 15px; line-height: 1.6; margin: 0;">
                          The sooner ${studentName} starts, the more progress they can make this term. Our tutors are ready to create a personalized learning plan just for them.
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Benefits -->
                  <div style="margin-bottom: 30px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="color: #059669; font-size: 18px; margin-right: 10px;">✓</span>
                          <span style="color: #374151; font-size: 15px;">First session can be scheduled this week</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="color: #059669; font-size: 18px; margin-right: 10px;">✓</span>
                          <span style="color: #374151; font-size: 15px;">Flexible payment options available</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="color: #059669; font-size: 18px; margin-right: 10px;">✓</span>
                          <span style="color: #374151; font-size: 15px;">Cancel anytime - no long-term commitment</span>
                        </td>
                      </tr>
                    </table>
                  </div>
                  
                  <!-- CTA -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 10px 0 20px;">
                        <a href="https://lanatutors.africa/find-a-tutor" 
                           style="display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(255, 107, 53, 0.4);">
                          Book First Session
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding: 10px 0;">
                        <a href="https://lanatutors.africa/book-consultation" 
                           style="color: #6b7280; font-size: 14px; text-decoration: underline;">
                          Need another consultation? Book here
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0; text-align: center;">
                    Have questions? Just reply to this email or call us!
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

    // 1. 24-HOUR POST-CONSULTATION FOLLOW-UP
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);
    const todayDate = now.toISOString().split('T')[0];
    const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Find consultations that happened ~24 hours ago
    const { data: recentConsultations } = await supabase
      .from("consultation_bookings")
      .select("*")
      .eq("status", "confirmed")
      .eq("consultation_date", yesterdayDate)
      .is("follow_up_sent_at", null);

    for (const consultation of recentConsultations || []) {
      try {
        if (!consultation.email) continue;

        const consultationDate = new Date(consultation.consultation_date).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        });

        const emailHtml = generate24hFollowupEmail(
          consultation.parent_name,
          consultation.student_name,
          consultationDate
        );

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Lana Tutors <info@lanatutors.africa>",
            to: [consultation.email],
            subject: `🙏 Thank You for Your Consultation - Next Steps for ${consultation.student_name}`,
            html: emailHtml,
          }),
        });

        if (emailResponse.ok) {
          // Mark as sent
          await supabase
            .from("consultation_bookings")
            .update({ follow_up_sent_at: now.toISOString() })
            .eq("id", consultation.id);
          sentCount++;
        }
      } catch (err) {
        console.error("Error sending 24h followup:", err);
      }
    }

    // 2. 3-DAY "READY TO BOOK?" NUDGE
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
    const threeDaysAgoDate = threeDaysAgo.toISOString().split('T')[0];

    const { data: pendingConsultations } = await supabase
      .from("consultation_bookings")
      .select("*")
      .eq("status", "confirmed")
      .eq("consultation_date", threeDaysAgoDate)
      .eq("converted_to_customer", false)
      .not("follow_up_sent_at", "is", null);

    for (const consultation of pendingConsultations || []) {
      try {
        if (!consultation.email) continue;

        // Check if they've already booked
        // We can't easily check this without user auth, so we just send the nudge

        const emailHtml = generate3dayNudgeEmail(
          consultation.parent_name,
          consultation.student_name
        );

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Lana Tutors <info@lanatutors.africa>",
            to: [consultation.email],
            subject: `🎯 Ready to Start ${consultation.student_name}'s Learning Journey?`,
            html: emailHtml,
          }),
        });

        if (emailResponse.ok) {
          // Update follow-up status
          await supabase
            .from("consultation_bookings")
            .update({ follow_up_status: "nudge_sent" })
            .eq("id", consultation.id);
          sentCount++;
        }
      } catch (err) {
        console.error("Error sending 3-day nudge:", err);
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
