import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    const profileUrl = `https://lanatutors.africa/${profileSlug}`;

    const emailResponse = await resend.emails.send({
      from: "Lana Tutors <noreply@lanatutors.africa>",
      to: [email],
      subject: "Profile Submitted Successfully - Lana Tutors",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Lana Tutors</h1>
            </div>
            
            <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; background: #10b981; color: white; width: 60px; height: 60px; border-radius: 50%; line-height: 60px; font-size: 30px;">✓</div>
              </div>
              
              <h2 style="color: #1f2937; margin-top: 0;">Profile Submitted Successfully!</h2>
              
              <p style="font-size: 16px; color: #4b5563;">Hi ${tutorName},</p>
              
              <p style="font-size: 16px; color: #4b5563;">
                Thank you for submitting your tutor profile! We're excited to have you join the Lana Tutors community.
              </p>
              
              <div style="background: #f3f4f6; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0; border-radius: 4px;">
                <h3 style="margin-top: 0; color: #1f2937; font-size: 18px;">Your Shareable Profile URL</h3>
                <p style="margin: 10px 0; color: #4b5563;">Once approved, your profile will be available at:</p>
                <a href="${profileUrl}" style="color: #667eea; text-decoration: none; font-weight: 600; word-break: break-all;">${profileUrl}</a>
              </div>
              
              <h3 style="color: #1f2937; margin-top: 30px;">What happens next?</h3>
              <ol style="color: #4b5563; padding-left: 20px;">
                <li style="margin-bottom: 10px;">Our team will review your profile and credentials within 24-48 hours</li>
                <li style="margin-bottom: 10px;">You'll receive an email notification once your profile is approved</li>
                <li style="margin-bottom: 10px;">Your profile goes live and students can find and book you</li>
                <li style="margin-bottom: 10px;">You can start sharing your unique URL with students!</li>
              </ol>
              
              <div style="margin-top: 30px; padding: 20px; background: #fef3c7; border-radius: 8px; border: 1px solid #fbbf24;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>📝 Note:</strong> Once your profile is approved, you'll be able to access your tutor dashboard and start managing your bookings.
                </p>
              </div>
              
              <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e5e7eb; text-align: center;">
                <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">
                  Need help? Contact us at <a href="mailto:support@lanatutors.africa" style="color: #667eea; text-decoration: none;">support@lanatutors.africa</a>
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin-top: 15px;">
                  © 2025 Lana Tutors. All rights reserved.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Submission confirmation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-tutor-submission-confirmation function:", error);
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
