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
                        📚 Custom Learning Plan Ready!
                      </h1>
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
                              <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #374151; white-space: pre-wrap;">
${personalMessage}
                              </p>
                            </td>
                          </tr>
                        </table>
                      ` : `
                        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                          Great news! Your tutor has created a personalized learning plan for <strong>${studentName}</strong>.
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

                      <!-- Summary -->
                      <table role="presentation" style="width: 100%; margin: 20px 0; background-color: #f0fdf4; border: 2px solid #22c55e; border-radius: 8px;">
                        <tr>
                          <td style="padding: 20px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                              <span style="color: #166534; font-size: 16px;">Total Sessions:</span>
                              <span style="color: #166534; font-size: 16px; font-weight: bold;">${totalSessions}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                              <span style="color: #166534; font-size: 16px;">Valid for:</span>
                              <span style="color: #166534; font-size: 16px; font-weight: bold;">${validityDays} days</span>
                            </div>
                            <div style="border-top: 2px solid #22c55e; margin: 15px 0; padding-top: 15px; display: flex; justify-content: space-between;">
                              <span style="color: #166534; font-size: 20px; font-weight: bold;">Total Investment:</span>
                              <span style="color: #166534; font-size: 24px; font-weight: bold;">KES ${totalPrice.toLocaleString()}</span>
                            </div>
                          </td>
                        </tr>
                      </table>

                      <!-- CTA Button -->
                      <table role="presentation" style="width: 100%; margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${planUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);">
                              View Plan & Proceed to Payment
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="margin: 30px 0 10px 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                        <strong>Next Steps:</strong>
                      </p>
                      <ul style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 14px; line-height: 1.8;">
                        <li>Review the learning plan details above</li>
                        <li>Click the button to view full plan and payment options</li>
                        <li>Complete payment to secure the sessions</li>
                        <li>Your tutor will reach out to schedule the first session</li>
                      </ul>

                      <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                        Questions? Reply to this email or contact us at <a href="mailto:info@lanatutors.africa" style="color: #dc2626; text-decoration: none;">info@lanatutors.africa</a>
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px; background-color: #f9fafb; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                        <strong>LANA Tutors</strong><br>
                        Empowering Students Through Personalized Learning
                      </p>
                      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                        © ${new Date().getFullYear()} LANA Tutors. All rights reserved.
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
        from: "LANA Tutors <info@lanatutors.africa>",
        to: [parentEmail],
        subject: `📚 Custom Learning Plan for ${studentName}`,
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
