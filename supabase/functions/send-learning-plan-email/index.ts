import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SessionSchedule {
  day: string;
  time: string;
}

interface LearningPlanEmailRequest {
  planId: string;
  parentEmail: string;
  parentName: string;
  studentName: string;
  planTitle: string;
  totalSessions: number;
  totalPrice: number;
  validityDays: number;
  personalMessage?: string;
  subjects: Array<{
    name: string;
    sessions: number;
    rate: number;
  }>;
  depositAmount?: number;
  paymentLink?: string;
  tutorName?: string;
  sessionSchedule?: SessionSchedule[];
  startDate?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      planId,
      parentEmail,
      parentName,
      studentName,
      planTitle,
      totalSessions,
      totalPrice,
      validityDays,
      personalMessage,
      subjects,
      depositAmount,
      paymentLink,
      tutorName,
      sessionSchedule,
      startDate,
    }: LearningPlanEmailRequest = await req.json();

    const appUrl = req.headers.get("origin") || "https://lanatutors.africa";
    const planUrl = `${appUrl}/learning-plan/${planId}`;

    // Calculate deposit amount (30%)
    const calculatedDeposit = depositAmount || Math.ceil(totalPrice * 0.3);

    // Generate subjects HTML
    const subjectsHtml = subjects
      .map(
        (s) => `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
              <strong>${s.name}</strong>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
              ${s.sessions}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
              KES ${s.rate.toLocaleString()}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
              <strong>KES ${(s.sessions * s.rate).toLocaleString()}</strong>
            </td>
          </tr>
        `
      )
      .join("");

    // Format time from 24h to 12h
    const formatTime = (time: string) => {
      if (!time) return "";
      const [hours, minutes] = time.split(":");
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    };

    // Schedule section
    const scheduleHtml = sessionSchedule && sessionSchedule.length > 0 ? `
      <table role="presentation" style="width: 100%; margin: 20px 0; background-color: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px;">
        <tr>
          <td style="padding: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #0369a1; font-size: 18px;">📅 Proposed Session Schedule</h3>
            ${startDate ? `<p style="margin: 0 0 10px 0; color: #374151;"><strong>Starting:</strong> ${new Date(startDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>` : ''}
            <table role="presentation" style="width: 100%;">
              ${sessionSchedule.map(s => `
                <tr>
                  <td style="padding: 8px 0; color: #374151;">
                    <span style="display: inline-block; background: #0ea5e9; color: white; padding: 4px 12px; border-radius: 4px; font-size: 14px; margin-right: 8px;">${s.day}</span>
                    <span style="font-weight: 600;">${formatTime(s.time)}</span>
                  </td>
                </tr>
              `).join('')}
            </table>
            <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 13px;">
              ✓ Sessions are 1 hour each<br>
              ✓ Schedule can be adjusted based on availability
            </p>
          </td>
        </tr>
      </table>
    ` : '';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Custom Learning Plan</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif; background-color: #f3f4f6;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
                  
                  <!-- Branded Header with Logo -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #dc2626 0%, #ea580c 50%, #f59e0b 100%); padding: 0;">
                      <table role="presentation" style="width: 100%;">
                        <tr>
                          <td style="padding: 30px 30px 20px 30px; text-align: center;">
                            <img src="https://lanatutors.africa/logo.png" alt="Lana Tutors" style="height: 50px; width: auto; margin-bottom: 15px;" onerror="this.style.display='none'" />
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                              LANA TUTORS
                            </h1>
                            <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px; letter-spacing: 1px;">
                              Empowering Students Through Personalized Learning
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 0 30px 30px 30px; text-align: center;">
                            <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; display: inline-block;">
                              <h2 style="margin: 0; color: #ffffff; font-size: 22px;">
                                📚 Custom Learning Plan for ${studentName}
                              </h2>
                              ${tutorName ? `<p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.95); font-size: 16px;">with ${tutorName}</p>` : ''}
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                        Hi ${parentName},
                      </p>
                      
                      ${personalMessage ? `
                        <table role="presentation" style="width: 100%; margin: 0 0 30px 0; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">
                          <tr>
                            <td style="padding: 20px;">
                              <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #374151; white-space: pre-wrap;">${personalMessage}</p>
                            </td>
                          </tr>
                        </table>
                      ` : `
                        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                          Great news! We have created a personalized learning plan for <strong>${studentName}</strong>.
                        </p>
                      `}

                      <!-- Plan Title -->
                      <table role="presentation" style="width: 100%; margin: 30px 0; border: 2px solid #dc2626; border-radius: 8px;">
                        <tr>
                          <td style="padding: 20px; background-color: #fef2f2;">
                            <h2 style="margin: 0; color: #dc2626; font-size: 20px;">
                              ${planTitle}
                            </h2>
                          </td>
                        </tr>
                      </table>

                      <!-- Subjects Table -->
                      <h3 style="margin: 30px 0 15px 0; color: #111827; font-size: 18px;">
                        Learning Plan Details
                      </h3>
                      <table role="presentation" style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                        <thead>
                          <tr style="background-color: #f9fafb;">
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Subject</th>
                            <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Sessions</th>
                            <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Rate</th>
                            <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${subjectsHtml}
                        </tbody>
                      </table>

                      <!-- Schedule Section -->
                      ${scheduleHtml}

                      <!-- Pricing Summary -->
                      <table role="presentation" style="width: 100%; margin: 20px 0; background-color: #f9fafb; border: 2px solid #e5e7eb; border-radius: 8px;">
                        <tr>
                          <td style="padding: 20px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                              <span style="color: #374151; font-size: 16px;">Total Sessions:</span>
                              <span style="color: #374151; font-size: 16px; font-weight: bold;">${totalSessions}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                              <span style="color: #374151; font-size: 16px;">Valid for:</span>
                              <span style="color: #374151; font-size: 16px; font-weight: bold;">${validityDays} days</span>
                            </div>
                            <div style="border-top: 2px solid #e5e7eb; margin: 15px 0; padding-top: 15px;">
                              <span style="color: #111827; font-size: 20px; font-weight: bold;">Total Investment:</span>
                              <span style="color: #111827; font-size: 24px; font-weight: bold; float: right;">KES ${totalPrice.toLocaleString()}</span>
                            </div>
                          </td>
                        </tr>
                      </table>

                      <!-- Payment Options -->
                      <h3 style="margin: 30px 0 15px 0; color: #111827; font-size: 18px;">
                        💳 Payment Options
                      </h3>
                      
                      <!-- Option 1: Full Payment -->
                      <table role="presentation" style="width: 100%; margin: 0 0 15px 0; background-color: #f0fdf4; border: 2px solid #22c55e; border-radius: 8px;">
                        <tr>
                          <td style="padding: 20px;">
                            <h4 style="margin: 0 0 10px 0; color: #166534; font-size: 16px;">Option 1: Full Payment</h4>
                            <p style="margin: 0 0 10px 0; color: #374151;">Pay the full amount upfront and get started immediately!</p>
                            <p style="margin: 0; font-size: 24px; font-weight: bold; color: #166534;">KES ${totalPrice.toLocaleString()}</p>
                          </td>
                        </tr>
                      </table>

                      <!-- Option 2: Deposit -->
                      <table role="presentation" style="width: 100%; margin: 0 0 20px 0; background-color: #eff6ff; border: 2px solid #3b82f6; border-radius: 8px;">
                        <tr>
                          <td style="padding: 20px;">
                            <h4 style="margin: 0 0 10px 0; color: #1d4ed8; font-size: 16px;">Option 2: 30% Deposit to Start</h4>
                            <p style="margin: 0 0 10px 0; color: #374151;">Pay 30% now to secure your spot and start lessons. Pay the balance before sessions complete.</p>
                            <p style="margin: 0; font-size: 24px; font-weight: bold; color: #1d4ed8;">KES ${calculatedDeposit.toLocaleString()}</p>
                            <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Balance: KES ${(totalPrice - calculatedDeposit).toLocaleString()}</p>
                          </td>
                        </tr>
                      </table>

                      <!-- CTA Buttons -->
                      <table role="presentation" style="width: 100%; margin: 30px 0;">
                        <tr>
                          <td align="center">
                            ${paymentLink ? `
                              <a href="${paymentLink}" style="display: inline-block; padding: 18px 48px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 18px; box-shadow: 0 4px 6px rgba(34, 197, 94, 0.3); margin-bottom: 12px;">
                                Pay Now via M-Pesa/Card
                              </a>
                            ` : `
                              <a href="${planUrl}" style="display: inline-block; padding: 18px 48px; background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 18px; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);">
                                View Plan & Make Payment
                              </a>
                            `}
                          </td>
                        </tr>
                      </table>

                      <!-- Bank Transfer Option -->
                      <table role="presentation" style="width: 100%; margin: 20px 0; background-color: #fefce8; border: 2px solid #eab308; border-radius: 8px;">
                        <tr>
                          <td style="padding: 20px;">
                            <h4 style="margin: 0 0 15px 0; color: #854d0e; font-size: 16px;">🏦 Pay via Bank Transfer / Paybill</h4>
                            <table role="presentation" style="width: 100%;">
                              <tr>
                                <td style="padding: 5px 0; color: #374151; font-weight: 600;">Bank:</td>
                                <td style="padding: 5px 0; color: #374151;">NCBA</td>
                              </tr>
                              <tr>
                                <td style="padding: 5px 0; color: #374151; font-weight: 600;">Paybill Number:</td>
                                <td style="padding: 5px 0; color: #374151; font-weight: bold; font-size: 18px;">880100</td>
                              </tr>
                              <tr>
                                <td style="padding: 5px 0; color: #374151; font-weight: 600;">Account Number:</td>
                                <td style="padding: 5px 0; color: #374151; font-weight: bold; font-size: 18px;">1006114657</td>
                              </tr>
                            </table>
                            <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 13px;">
                              ✓ After payment, send confirmation to <strong>+254 728 895 050</strong> or reply to this email
                            </p>
                          </td>
                        </tr>
                      </table>

                      <p style="margin: 30px 0 10px 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                        <strong>Next Steps:</strong>
                      </p>
                      <ul style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 14px; line-height: 1.8;">
                        <li>Review the learning plan details above</li>
                        <li>Choose your preferred payment option</li>
                        <li>Make payment via M-Pesa, Card, or Bank Transfer</li>
                        <li>${tutorName || 'Your tutor'} will reach out to confirm the first session</li>
                      </ul>

                      <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                        Questions? Reply to this email or call us at <strong>+254 728 895 050</strong>
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px; background: linear-gradient(135deg, #1f2937 0%, #374151 100%); text-align: center;">
                      <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 16px; font-weight: bold;">
                        Lana Tutors
                      </p>
                      <p style="margin: 0 0 15px 0; color: rgba(255,255,255,0.8); font-size: 14px;">
                        Empowering Students Through Personalized Learning
                      </p>
                      <p style="margin: 0; color: rgba(255,255,255,0.6); font-size: 12px;">
                        📞 +254 728 895 050 | 📧 info@lanatutors.africa
                      </p>
                      <p style="margin: 15px 0 0 0; color: rgba(255,255,255,0.5); font-size: 11px;">
                        © ${new Date().getFullYear()} Lana Tutors. All rights reserved.
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

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Lana Tutors <info@lanatutors.africa>",
        to: [parentEmail],
        subject: `📚 Custom Learning Plan for ${studentName} - Multiple Payment Options Available`,
        html,
      }),
    });

    const emailData = await emailResponse.json();

    console.log("Learning plan email sent successfully:", emailData);

    return new Response(JSON.stringify(emailData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-learning-plan-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
