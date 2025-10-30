import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalEmailRequest {
  email: string;
  fullName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName }: ApprovalEmailRequest = await req.json();
    
    console.log("Sending tutor approval email to:", email);

    // TEMPORARY: Send to verified test email for testing
    // TODO: Change back to applicant's email when domain is verified
    const recipient = "justin@glab.africa";

    const signupUrl = `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?type=signup&redirect_to=https://elimuconnect.lovable.app/tutor-profile-setup`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Lana Tutors <onboarding@resend.dev>",
        to: [recipient],
        subject: `Congratulations ${fullName} - You're Approved!`,
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
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🎉 Congratulations! You're Approved!</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">Dear ${fullName},</p>
                      
                      <div style="background-color: #fef2f2; border-left: 4px solid #ed2644; padding: 16px; margin: 20px 0;">
                        <p style="margin: 0; color: #666666; font-size: 14px;"><strong>Testing Mode:</strong> This email was sent to justin@glab.africa. Applicant email: ${email}</p>
                      </div>
                      
                      <p style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">We're thrilled to inform you that you've successfully passed our vetting process and expert conversation! Welcome to the Lana Tutors family of elite tutors.</p>
                      
                      <!-- Success Box -->
                      <table role="presentation" style="width: 100%; margin: 30px 0; background: linear-gradient(135deg, #fef2f2 0%, #ffe5e8 100%); border-radius: 8px;">
                        <tr>
                          <td style="padding: 24px; border-left: 4px solid #ed2644;">
                            <h2 style="color: #ed2644; margin: 0 0 12px; font-size: 20px;">🎉 What This Means</h2>
                            <p style="margin: 0; color: #666666; font-size: 15px; line-height: 1.6;">You are now officially an approved Lana Tutors tutor! You're joining Kenya's leading tutoring platform where quality education meets passionate educators.</p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Next Steps -->
                      <h2 style="color: #ed2644; margin: 30px 0 20px; font-size: 22px;">Next Steps - Complete Your Profile</h2>
                      
                      <p style="margin: 0 0 20px; color: #666666; font-size: 15px; line-height: 1.6;">To start teaching and earning, you need to complete your tutor profile. This includes:</p>
                      
                      <ol style="margin: 0 0 30px; padding-left: 24px; color: #666666; font-size: 15px; line-height: 1.8;">
                        <li style="margin-bottom: 8px;"><strong>Create Your Account</strong> - Set up your login credentials</li>
                        <li style="margin-bottom: 8px;"><strong>Personal Information</strong> - Add your bio and teaching philosophy</li>
                        <li style="margin-bottom: 8px;"><strong>Professional Details</strong> - Upload your teaching video and qualifications</li>
                        <li style="margin-bottom: 8px;"><strong>Teaching Preferences</strong> - Set your subjects, rates, and availability</li>
                        <li><strong>Profile Review</strong> - Our team will do a final review</li>
                      </ol>
                      
                      <!-- CTA Button -->
                      <table role="presentation" style="width: 100%; margin: 40px 0;">
                        <tr>
                          <td align="center">
                            <a href="https://elimuconnect.lovable.app/tutor-profile-setup" style="display: inline-block; background-color: #ed2644; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(237, 38, 68, 0.3);">
                              Complete Your Profile Now
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Important Info -->
                      <h2 style="color: #ed2644; margin: 30px 0 20px; font-size: 20px;">Important Information</h2>
                      
                      <table role="presentation" style="width: 100%; margin: 20px 0; background-color: #fffbeb; border-radius: 8px; border-left: 4px solid #f59e0b;">
                        <tr>
                          <td style="padding: 20px;">
                            <h3 style="color: #92400e; margin: 0 0 10px; font-size: 16px;">⏱️ Complete Within 7 Days</h3>
                            <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">Please complete your profile setup within 7 days to maintain your approved status. This ensures we can start connecting you with students as soon as possible.</p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Earnings -->
                      <h2 style="color: #ed2644; margin: 30px 0 15px; font-size: 20px;">What You'll Earn</h2>
                      <ul style="margin: 0 0 30px; padding-left: 24px; color: #666666; font-size: 15px; line-height: 1.8;">
                        <li style="margin-bottom: 8px;">Set your own hourly rate (KES 2,000 - 6,000)</li>
                        <li style="margin-bottom: 8px;">Earn 70% of your set rate (we retain 30% service fee)</li>
                        <li style="margin-bottom: 8px;">Example: KES 3,000/hr rate = KES 2,100/hr earnings</li>
                        <li>Weekly payouts directly to your M-Pesa</li>
                      </ul>
                      
                      <h2 style="color: #ed2644; margin: 30px 0 15px; font-size: 20px;">Need Help?</h2>
                      <p style="margin: 0 0 30px; color: #666666; font-size: 15px; line-height: 1.6;">If you have any questions while setting up your profile, our team is here to help at <a href="mailto:info@learnwithlana.com" style="color: #ed2644; text-decoration: none;">info@learnwithlana.com</a>.</p>
                      
                      <p style="margin: 30px 0 10px; color: #666666; font-size: 15px; line-height: 1.6;">We're excited to have you on board and can't wait to see you make an impact on students' lives!</p>
                      
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

    console.log("Approval email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-tutor-approval-email function:", error);
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
