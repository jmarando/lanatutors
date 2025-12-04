import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AcknowledgmentEmailRequest {
  email: string;
  fullName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName }: AcknowledgmentEmailRequest = await req.json();
    
    console.log("Sending application acknowledgment to:", email);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Lana Tutors <info@lanatutors.africa>",
        to: [email],
        subject: `Application Received - ${fullName}`,
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #ed2644 0%, #c91d39 100%); border-radius: 8px 8px 0 0;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Thank You for Your Application!</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                     <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">Dear ${fullName},</p>
                      
                      <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">We have successfully received your application to become a tutor at Lana Tutors. Thank you for your interest in joining Kenya's leading tutoring platform!</p>
                      
                      <p style="margin: 0 0 30px; color: #666666; font-size: 15px; line-height: 1.6;">We will communicate with you via this email: <strong style="color: #ed2644;">${email}</strong></p>
                      
                      <!-- Vetting Process -->
                      <h2 style="color: #ed2644; margin: 30px 0 20px; font-size: 22px;">What Happens Next?</h2>
                      
                      <p style="margin: 0 0 20px; color: #666666; font-size: 15px; line-height: 1.6;">Our vetting process consists of three simple steps:</p>
                      
                      <!-- Step 1 -->
                      <table role="presentation" style="width: 100%; margin-bottom: 16px; background-color: #fef2f2; border-radius: 8px;">
                        <tr>
                          <td style="padding: 20px; border-left: 4px solid #ed2644;">
                            <table role="presentation">
                              <tr>
                                <td style="width: 48px; vertical-align: top;">
                                  <div style="background-color: #ed2644; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; text-align: center; line-height: 32px; font-weight: bold; font-size: 18px;">1</div>
                                </td>
                                <td style="vertical-align: top;">
                                  <h3 style="color: #ed2644; margin: 0 0 8px; font-size: 16px;">Initial Vetting</h3>
                                  <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">We'll review your credentials within 3-5 business days</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Step 2 -->
                      <table role="presentation" style="width: 100%; margin-bottom: 16px; background-color: #fef2f2; border-radius: 8px;">
                        <tr>
                          <td style="padding: 20px; border-left: 4px solid #ed2644;">
                            <table role="presentation">
                              <tr>
                                <td style="width: 48px; vertical-align: top;">
                                  <div style="background-color: #ed2644; color: white; width: 32px; height: 32px; border-radius: 50%; text-align: center; line-height: 32px; font-weight: bold; font-size: 18px;">2</div>
                                </td>
                                <td style="vertical-align: top;">
                                  <h3 style="color: #ed2644; margin: 0 0 8px; font-size: 16px;">Expert Conversation</h3>
                                  <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">If you pass, we'll schedule a 30-minute video call with you</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Step 3 -->
                      <table role="presentation" style="width: 100%; margin-bottom: 30px; background-color: #fef2f2; border-radius: 8px;">
                        <tr>
                          <td style="padding: 20px; border-left: 4px solid #ed2644;">
                            <table role="presentation">
                              <tr>
                                <td style="width: 48px; vertical-align: top;">
                                  <div style="background-color: #ed2644; color: white; width: 32px; height: 32px; border-radius: 50%; text-align: center; line-height: 32px; font-weight: bold; font-size: 18px;">3</div>
                                </td>
                                <td style="vertical-align: top;">
                                  <h3 style="color: #ed2644; margin: 0 0 8px; font-size: 16px;">Enrollment & Dashboard Access</h3>
                                  <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">Upon approval, complete your profile and start teaching!</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      <h2 style="color: #ed2644; margin: 30px 0 15px; font-size: 20px;">Timeline</h2>
                      <p style="margin: 0 0 30px; color: #666666; font-size: 15px; line-height: 1.6;">You can expect to hear from us within <strong style="color: #ed2644;">3-5 business days</strong> regarding the status of your initial vetting.</p>
                      
                      <p style="margin: 30px 0 10px; color: #666666; font-size: 15px; line-height: 1.6;">If you have any questions in the meantime, please don't hesitate to reach out to us at <a href="mailto:info@lanatutors.africa" style="color: #ed2644; text-decoration: none;">info@lanatutors.africa</a>.</p>
                      
                      <p style="margin: 30px 0 5px; color: #666666; font-size: 15px; line-height: 1.6;">Best regards,<br><strong style="color: #333333;">The Lana Team</strong></p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f9f9f9; border-radius: 0 0 8px 8px; text-align: center;">
                      <p style="margin: 0; font-size: 12px; color: #999999; line-height: 1.6;">
                        This is an automated message. Please do not reply directly to this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      }),
    });

    const emailResponse = await response.json();

    console.log("Acknowledgment email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-application-acknowledgment function:", error);
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
