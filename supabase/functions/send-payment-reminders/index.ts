import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const generateBalanceReminderEmail = (
  parentName: string,
  studentName: string,
  tutorName: string,
  subject: string,
  sessionDate: string,
  balanceDue: number,
  paymentLink: string
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
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">💳 Balance Payment Reminder</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                    Dear ${parentName},
                  </p>
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                    This is a friendly reminder that the balance payment for ${studentName}'s upcoming session is due before the class.
                  </p>
                  
                  <!-- Payment Details Card -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 12px; margin-bottom: 30px;">
                    <tr>
                      <td style="padding: 25px;">
                        <h3 style="color: #991b1b; margin: 0 0 15px; font-size: 18px;">📋 Payment Details</h3>
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 8px 0; color: #7f1d1d; font-size: 15px;">
                              <strong>Student:</strong> ${studentName}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #7f1d1d; font-size: 15px;">
                              <strong>Subject:</strong> ${subject}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #7f1d1d; font-size: 15px;">
                              <strong>Tutor:</strong> ${tutorName}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #7f1d1d; font-size: 15px;">
                              <strong>Session Date:</strong> ${sessionDate}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 12px 0; color: #991b1b; font-size: 20px; font-weight: 700;">
                              <strong>Balance Due:</strong> KES ${balanceDue.toLocaleString()}
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
                        <a href="${paymentLink}" 
                           style="display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(255, 107, 53, 0.4);">
                          Pay Balance Now
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0; text-align: center;">
                    Please complete the payment to secure ${studentName}'s spot.<br>
                    Questions? Contact us at <a href="mailto:info@lanatutors.africa" style="color: #FF6B35;">info@lanatutors.africa</a>
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
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const fourDaysFromNow = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

    // Find bookings with balance due, session in 3-4 days
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(`
        *,
        tutor_availability!inner (start_time, end_time)
      `)
      .eq("status", "confirmed")
      .eq("payment_option", "deposit")
      .gt("balance_due", 0)
      .gte("tutor_availability.start_time", threeDaysFromNow.toISOString())
      .lt("tutor_availability.start_time", fourDaysFromNow.toISOString());

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
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const paymentLink = `https://lanatutors.africa/pay-balance?bookingId=${booking.id}`;

        const emailHtml = generateBalanceReminderEmail(
          studentProfile?.full_name || "Parent",
          studentProfile?.full_name || "Student",
          tutorName?.full_name || "Tutor",
          booking.subject,
          sessionDate,
          booking.balance_due,
          paymentLink
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
            subject: `💳 Balance Payment Reminder: KES ${booking.balance_due.toLocaleString()} Due`,
            html: emailHtml,
          }),
        });

        if (emailResponse.ok) {
          sentCount++;
          console.log(`Balance reminder sent for booking ${booking.id}`);
        }
      } catch (err) {
        console.error(`Error sending balance reminder:`, err);
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
