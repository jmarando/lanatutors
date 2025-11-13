import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProfileLiveEmailRequest {
  email: string;
  fullName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName }: ProfileLiveEmailRequest = await req.json();
    
    console.log("Sending profile live notification email to:", email);

    const tutorHubUrl = `${Deno.env.get('VITE_SUPABASE_URL')?.replace('iccemuiqcdumgxiwxzdq.supabase.co', 'lanatutors.africa')}/tutor-dashboard`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Lana Tutors <noreply@lanatutors.africa>",
        to: [email],
        subject: `🎉 ${fullName}, Your Profile is Now Live!`,
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
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🎉 Your Profile is Live!</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">Dear ${fullName},</p>
                      
                      <p style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">Great news! Your tutor profile has been approved and is now <strong>live on Lana Tutors</strong>. Students can now find and book sessions with you!</p>
                      
                      <!-- Success Box -->
                      <table role="presentation" style="width: 100%; margin: 30px 0; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 8px;">
                        <tr>
                          <td style="padding: 24px; border-left: 4px solid #22c55e;">
                            <h2 style="color: #16a34a; margin: 0 0 12px; font-size: 20px;">✅ What's Next</h2>
                            <p style="margin: 0; color: #666666; font-size: 15px; line-height: 1.6;">You're all set to start teaching! Now it's time to set your availability and welcome your first students.</p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Action Steps -->
                      <h2 style="color: #ed2644; margin: 30px 0 20px; font-size: 22px;">📅 Set Your Availability</h2>
                      
                      <p style="margin: 0 0 20px; color: #666666; font-size: 15px; line-height: 1.6;">To start receiving bookings, you need to:</p>
                      
                      <ol style="margin: 0 0 30px; padding-left: 24px; color: #666666; font-size: 15px; line-height: 1.8;">
                        <li style="margin-bottom: 8px;">Log in to your <strong>Tutor Hub</strong></li>
                        <li style="margin-bottom: 8px;">Set your available time slots</li>
                        <li style="margin-bottom: 8px;">Wait for student bookings to come in!</li>
                      </ol>
                      
                      <!-- CTA Button -->
                      <table role="presentation" style="width: 100%; margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${tutorHubUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #ed2644 0%, #c91d39 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(237, 38, 68, 0.3);">
                              Access Tutor Hub →
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Features Box -->
                      <table role="presentation" style="width: 100%; margin: 30px 0; background-color: #fafafa; border-radius: 8px;">
                        <tr>
                          <td style="padding: 24px;">
                            <h3 style="color: #333333; margin: 0 0 16px; font-size: 18px;">In Your Tutor Hub, You Can:</h3>
                            <ul style="margin: 0; padding-left: 24px; color: #666666; font-size: 15px; line-height: 1.8;">
                              <li style="margin-bottom: 8px;">📅 Manage your availability calendar</li>
                              <li style="margin-bottom: 8px;">👥 View and manage student bookings</li>
                              <li style="margin-bottom: 8px;">💰 Track your earnings</li>
                              <li style="margin-bottom: 8px;">⭐ Monitor your ratings and reviews</li>
                              <li style="margin-bottom: 8px;">📊 Track student progress</li>
                            </ul>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Tips Section -->
                      <h2 style="color: #ed2644; margin: 30px 0 20px; font-size: 22px;">💡 Pro Tips for Success</h2>
                      
                      <ul style="margin: 0 0 30px; padding-left: 24px; color: #666666; font-size: 15px; line-height: 1.8;">
                        <li style="margin-bottom: 8px;"><strong>Set regular hours:</strong> Students prefer tutors with consistent availability</li>
                        <li style="margin-bottom: 8px;"><strong>Respond quickly:</strong> Fast responses lead to more bookings</li>
                        <li style="margin-bottom: 8px;"><strong>Keep your calendar updated:</strong> Always maintain current availability</li>
                        <li style="margin-bottom: 8px;"><strong>Deliver quality sessions:</strong> Great reviews attract more students</li>
                      </ul>
                      
                      <!-- Support Section -->
                      <table role="presentation" style="width: 100%; margin: 30px 0; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 8px;">
                        <tr>
                          <td style="padding: 24px; border-left: 4px solid #3b82f6;">
                            <h3 style="color: #1e40af; margin: 0 0 12px; font-size: 18px;">Need Help?</h3>
                            <p style="margin: 0; color: #666666; font-size: 15px; line-height: 1.6;">
                              If you have any questions or need assistance, we're here to help! Contact us at 
                              <a href="mailto:info@lanatutors.africa" style="color: #ed2644; text-decoration: none; font-weight: bold;">info@lanatutors.africa</a>
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 30px 0 0; color: #333333; font-size: 16px; line-height: 1.6;">
                        Welcome to the team! We're excited to have you on board and can't wait to see the positive impact you'll make on your students' lives.
                      </p>
                      
                      <p style="margin: 20px 0 0; color: #333333; font-size: 16px; line-height: 1.6;">
                        Best regards,<br>
                        <strong>The Lana Tutors Team</strong>
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                      <p style="margin: 0; color: #9ca3af; font-size: 13px; line-height: 1.6;">
                        © 2025 Lana Tutors. All rights reserved.<br>
                        <a href="https://lanatutors.africa" style="color: #ed2644; text-decoration: none;">lanatutors.africa</a>
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

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend API error:", error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const data = await response.json();
    console.log("Profile live email sent successfully:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-profile-live-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
