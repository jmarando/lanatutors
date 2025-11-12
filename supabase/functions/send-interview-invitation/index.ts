import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InterviewInvitationRequest {
  email: string;
  fullName: string;
  meetLink: string;
  interviewDate: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, meetLink, interviewDate }: InterviewInvitationRequest = await req.json();
    
    console.log("Sending interview invitation");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Lana Tutors <noreply@lanatutors.africa>",
        to: [email],
        subject: `Great News ${fullName} - Interview Invitation!`,
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
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🎉 You've Passed Initial Vetting!</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                     <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">Dear ${fullName},</p>
                      
                      <p style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">We're pleased to inform you that you've successfully passed the initial vetting stage of our application process!</p>
                      
                      <!-- Next Step Box -->
                      <table role="presentation" style="width: 100%; margin: 30px 0; background: linear-gradient(135deg, #fef2f2 0%, #ffe5e8 100%); border-radius: 8px;">
                        <tr>
                          <td style="padding: 24px; border-left: 4px solid #ed2644;">
                            <h2 style="color: #ed2644; margin: 0 0 12px; font-size: 20px;">📅 Next Step: Expert Conversation</h2>
                            <p style="margin: 0; color: #666666; font-size: 15px; line-height: 1.6;">You're invited to a 30-minute video conversation with a Lana Tutors Expert to discuss your teaching philosophy and experience.</p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Interview Details -->
                      <h2 style="color: #ed2644; margin: 30px 0 20px; font-size: 22px;">Interview Details</h2>
                      
                      <table role="presentation" style="width: 100%; margin: 20px 0; background-color: #fffbeb; border-radius: 8px; border-left: 4px solid #f59e0b;">
                        <tr>
                          <td style="padding: 20px;">
                            <p style="margin: 0 0 12px; color: #333333; font-size: 15px;"><strong style="color: #ed2644;">📆 Date & Time:</strong> ${new Date(interviewDate).toLocaleString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'Africa/Nairobi'
                            })} EAT</p>
                            <p style="margin: 0 0 12px; color: #333333; font-size: 15px;"><strong style="color: #ed2644;">⏱️ Duration:</strong> 30 minutes</p>
                            <p style="margin: 0; color: #333333; font-size: 15px;"><strong style="color: #ed2644;">💻 Platform:</strong> Google Meet</p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- CTA Button -->
                      <table role="presentation" style="width: 100%; margin: 40px 0;">
                        <tr>
                          <td align="center">
                            <a href="${meetLink}" style="display: inline-block; background-color: #ed2644; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(237, 38, 68, 0.3);">
                              Join Video Interview
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Preparation Tips -->
                      <h2 style="color: #ed2644; margin: 30px 0 20px; font-size: 20px;">How to Prepare</h2>
                      
                      <ul style="margin: 0 0 30px; padding-left: 24px; color: #666666; font-size: 15px; line-height: 1.8;">
                        <li style="margin-bottom: 8px;"><strong>Test your equipment</strong> - Ensure your camera and microphone work properly</li>
                        <li style="margin-bottom: 8px;"><strong>Find a quiet space</strong> - Choose a location with minimal background noise</li>
                        <li style="margin-bottom: 8px;"><strong>Review your application</strong> - Be ready to discuss your teaching experience and methods</li>
                        <li style="margin-bottom: 8px;"><strong>Prepare questions</strong> - Feel free to ask about the platform, students, and expectations</li>
                        <li><strong>Be yourself</strong> - We want to see your authentic teaching personality</li>
                      </ul>
                      
                      <!-- What We'll Discuss -->
                      <h2 style="color: #ed2644; margin: 30px 0 20px; font-size: 20px;">What We'll Discuss</h2>
                      
                      <ul style="margin: 0 0 30px; padding-left: 24px; color: #666666; font-size: 15px; line-height: 1.8;">
                        <li style="margin-bottom: 8px;">Your teaching philosophy and approach</li>
                        <li style="margin-bottom: 8px;">Experience with different curricula (CBC, IGCSE, etc.)</li>
                        <li style="margin-bottom: 8px;">How you handle challenging students</li>
                        <li style="margin-bottom: 8px;">Your availability and preferred teaching mode</li>
                        <li>Questions about the Lana Tutors platform</li>
                      </ul>
                      
                      <!-- Pro Tip -->
                      <table role="presentation" style="width: 100%; margin: 30px 0; background: linear-gradient(135deg, #fef2f2 0%, #ffe5e8 100%); border-radius: 8px;">
                        <tr>
                          <td style="padding: 20px; border-left: 4px solid #ed2644;">
                            <p style="margin: 0; color: #666666; font-size: 15px; line-height: 1.6;"><strong style="color: #ed2644;">💡 Pro Tip:</strong> Have examples ready of successful teaching moments or student transformations. We love hearing real stories!</p>
                          </td>
                        </tr>
                      </table>
                      
                      <h2 style="color: #ed2644; margin: 30px 0 15px; font-size: 20px;">Need to Reschedule?</h2>
                      <p style="margin: 0 0 30px; color: #666666; font-size: 15px; line-height: 1.6;">If the scheduled time doesn't work for you, please reply to this email as soon as possible so we can arrange an alternative time.</p>
                      
                      <p style="margin: 30px 0 10px; color: #666666; font-size: 15px; line-height: 1.6;">We're excited to meet you and learn more about your teaching journey!</p>
                      
                      <p style="margin: 30px 0 5px; color: #666666; font-size: 15px; line-height: 1.6;">Best regards,<br><strong style="color: #333333;">The Lana Tutors Team</strong></p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f9f9f9; border-radius: 0 0 8px 8px; text-align: center;">
                      <p style="margin: 0 0 10px; font-size: 13px; color: #666666;">
                        Interview Link: <a href="${meetLink}" style="color: #ed2644; text-decoration: none;">${meetLink}</a>
                      </p>
                      <p style="margin: 0; font-size: 12px; color: #999999; line-height: 1.6;">
                        This is an automated message. For questions, contact info@lanatutors.africa
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
    console.log("Interview invitation sent successfully");

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-interview-invitation function:", error);
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
