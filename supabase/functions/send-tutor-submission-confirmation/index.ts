import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubmissionConfirmationRequest {
  tutorName: string;
  email: string;
  profileSlug: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tutorName, email, profileSlug }: SubmissionConfirmationRequest = await req.json();
    
    console.log("Sending tutor submission confirmation email to:", email);

    const profileUrl = `https://lanatutors.africa/tutors/${profileSlug}`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Lana Tutors <noreply@lanatutors.africa>",
        to: [email],
        subject: `Thank You ${tutorName} - Profile Submitted Successfully!`,
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
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">✅ Profile Submitted!</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">Dear ${tutorName},</p>
                      
                      <p style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">Thank you for submitting your tutor profile! We're excited to have you join the Lana Tutors community of elite educators.</p>
                      
                      <!-- Success Box -->
                      <table role="presentation" style="width: 100%; margin: 30px 0; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 8px;">
                        <tr>
                          <td style="padding: 24px; border-left: 4px solid #22c55e;">
                            <h2 style="color: #16a34a; margin: 0 0 12px; font-size: 20px;">✅ Submission Received</h2>
                            <p style="margin: 0; color: #666666; font-size: 15px; line-height: 1.6;">Your profile has been successfully submitted and is now under review by our team.</p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Your Profile URL Box -->
                      <table role="presentation" style="width: 100%; margin: 30px 0; background-color: #f9fafb; border-radius: 8px;">
                        <tr>
                          <td style="padding: 24px;">
                            <h3 style="color: #333333; margin: 0 0 12px; font-size: 18px;">🔗 Your Profile URL</h3>
                            <p style="margin: 0 0 12px; color: #666666; font-size: 15px;">Once approved, your profile will be live at:</p>
                            <a href="${profileUrl}" style="color: #ed2644; text-decoration: none; font-weight: 600; word-break: break-all; font-size: 15px;">${profileUrl}</a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- What Happens Next -->
                      <h2 style="color: #ed2644; margin: 30px 0 20px; font-size: 22px;">📋 What Happens Next?</h2>
                      
                      <ol style="margin: 0 0 30px; padding-left: 24px; color: #666666; font-size: 15px; line-height: 1.8;">
                        <li style="margin-bottom: 12px;"><strong>Review Process:</strong> Our team will carefully review your profile and credentials within 24-48 hours</li>
                        <li style="margin-bottom: 12px;"><strong>Approval Notification:</strong> You'll receive an email once your profile is approved and goes live</li>
                        <li style="margin-bottom: 12px;"><strong>Profile Goes Live:</strong> Students can find and book sessions with you</li>
                        <li style="margin-bottom: 12px;"><strong>Set Your Hours:</strong> Access your Tutor Hub to set your availability and start receiving bookings</li>
                        <li style="margin-bottom: 12px;"><strong>Start Teaching:</strong> Welcome your first students and begin your tutoring journey!</li>
                      </ol>
                      
                      <!-- Timeline Box -->
                      <table role="presentation" style="width: 100%; margin: 30px 0; background: linear-gradient(135deg, #fef2f2 0%, #ffe5e8 100%); border-radius: 8px;">
                        <tr>
                          <td style="padding: 24px; border-left: 4px solid #ed2644;">
                            <h3 style="color: #ed2644; margin: 0 0 12px; font-size: 18px;">⏰ Expected Timeline</h3>
                            <p style="margin: 0; color: #666666; font-size: 15px; line-height: 1.6;">
                              <strong>Review:</strong> 24-48 hours<br>
                              <strong>Approval Email:</strong> Once approved<br>
                              <strong>Profile Live:</strong> Immediately after approval
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Preparation Tips -->
                      <h2 style="color: #ed2644; margin: 30px 0 20px; font-size: 22px;">💡 Get Ready to Teach</h2>
                      
                      <p style="margin: 0 0 15px; color: #666666; font-size: 15px; line-height: 1.6;">While waiting for approval, you can:</p>
                      
                      <ul style="margin: 0 0 30px; padding-left: 24px; color: #666666; font-size: 15px; line-height: 1.8;">
                        <li style="margin-bottom: 8px;">Plan your weekly teaching schedule</li>
                        <li style="margin-bottom: 8px;">Prepare lesson materials for your subjects</li>
                        <li style="margin-bottom: 8px;">Think about your teaching approach and methodology</li>
                        <li style="margin-bottom: 8px;">Share your upcoming profile URL with interested students</li>
                      </ul>
                      
                      <!-- Support Section -->
                      <table role="presentation" style="width: 100%; margin: 30px 0; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 8px;">
                        <tr>
                          <td style="padding: 24px; border-left: 4px solid #3b82f6;">
                            <h3 style="color: #1e40af; margin: 0 0 12px; font-size: 18px;">Need Help?</h3>
                            <p style="margin: 0; color: #666666; font-size: 15px; line-height: 1.6;">
                              If you have any questions about your submission or the review process, feel free to reach out to us at 
                              <a href="mailto:info@lanatutors.africa" style="color: #ed2644; text-decoration: none; font-weight: bold;">info@lanatutors.africa</a>
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 30px 0 0; color: #333333; font-size: 16px; line-height: 1.6;">
                        We're thrilled to have you on board and look forward to approving your profile soon!
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
    console.log("Submission confirmation email sent successfully:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-tutor-submission-confirmation function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
