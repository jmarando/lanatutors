import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  paymentOption?: "full" | "deposit";
  depositAmount?: number;
  paymentLink?: string;
  tutorName?: string;
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
      paymentOption = "full",
      depositAmount,
      paymentLink,
      tutorName,
    }: LearningPlanEmailRequest = await req.json();

    const appUrl = req.headers.get("origin") || "https://lanatutors.africa";
    const planUrl = `${appUrl}/learning-plan/${planId}`;

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

    // Payment section based on option
    const isDeposit = paymentOption === "deposit" && depositAmount;
    const amountDue = isDeposit ? depositAmount : totalPrice;
    
    const paymentSectionHtml = isDeposit ? `
      <table role="presentation" style="width: 100%; margin: 20px 0; background-color: #eff6ff; border: 2px solid #3b82f6; border-radius: 8px;">
        <tr>
          <td style="padding: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #1d4ed8; font-size: 18px;">💰 Flexible Payment Option</h3>
            <table role="presentation" style="width: 100%;">
              <tr>
                <td style="padding: 5px 0; color: #374151;">Total Investment:</td>
                <td style="padding: 5px 0; text-align: right; color: #374151;">KES ${totalPrice.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #1d4ed8; font-weight: bold;">30% Deposit to Get Started:</td>
                <td style="padding: 5px 0; text-align: right; color: #1d4ed8; font-weight: bold; font-size: 20px;">KES ${depositAmount.toLocaleString()}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding-top: 10px; color: #6b7280; font-size: 14px;">
                  ✓ Pay 30% now to secure your spot and start lessons<br>
                  ✓ Balance due before sessions complete
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    ` : `
      <table role="presentation" style="width: 100%; margin: 20px 0; background-color: #f0fdf4; border: 2px solid #22c55e; border-radius: 8px;">
        <tr>
          <td style="padding: 20px;">
            <div style="margin-bottom: 10px;">
              <span style="color: #166534; font-size: 16px;">Total Sessions:</span>
              <span style="color: #166534; font-size: 16px; font-weight: bold; float: right;">${totalSessions}</span>
            </div>
            <div style="margin-bottom: 10px;">
              <span style="color: #166534; font-size: 16px;">Valid for:</span>
              <span style="color: #166534; font-size: 16px; font-weight: bold; float: right;">${validityDays} days</span>
            </div>
            <div style="border-top: 2px solid #22c55e; margin: 15px 0; padding-top: 15px;">
              <span style="color: #166534; font-size: 20px; font-weight: bold;">Total Investment:</span>
              <span style="color: #166534; font-size: 24px; font-weight: bold; float: right;">KES ${totalPrice.toLocaleString()}</span>
            </div>
          </td>
        </tr>
      </table>
    `;

    // CTA button - use payment link if available
    const ctaUrl = paymentLink || planUrl;
    const ctaText = paymentLink 
      ? (isDeposit ? `Pay KES ${amountDue.toLocaleString()} Deposit Now` : `Pay KES ${amountDue.toLocaleString()} Now`)
      : "View Plan & Proceed to Payment";

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
                <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                        📚 Custom Learning Plan for ${studentName}
                      </h1>
                      ${tutorName ? `<p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">with ${tutorName}</p>` : ''}
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

                      <!-- Payment Section -->
                      ${paymentSectionHtml}

                      <!-- CTA Button -->
                      <table role="presentation" style="width: 100%; margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${ctaUrl}" style="display: inline-block; padding: 18px 48px; background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 18px; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);">
                              ${ctaText}
                            </a>
                          </td>
                        </tr>
                      </table>

                      ${!paymentLink ? `
                        <p style="margin: 20px 0; text-align: center; font-size: 14px; color: #6b7280;">
                          Or copy this link: <a href="${planUrl}" style="color: #dc2626;">${planUrl}</a>
                        </p>
                      ` : ''}

                      <p style="margin: 30px 0 10px 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                        <strong>Next Steps:</strong>
                      </p>
                      <ul style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 14px; line-height: 1.8;">
                        <li>Review the learning plan details above</li>
                        <li>Click the button to ${paymentLink ? 'make payment securely via M-Pesa or Card' : 'view full plan and payment options'}</li>
                        ${isDeposit ? '<li>Pay the remaining balance before your sessions are complete</li>' : ''}
                        <li>${tutorName || 'Your tutor'} will reach out to schedule the first session</li>
                      </ul>

                      <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                        Questions? Reply to this email or call us at <strong>+254 728 895 050</strong>
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px; background-color: #f9fafb; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                        <strong>Lana Tutors</strong><br>
                        Empowering Students Through Personalized Learning
                      </p>
                      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
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
        subject: `📚 Custom Learning Plan for ${studentName}${isDeposit ? ' - Pay 30% to Start!' : ''}`,
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
