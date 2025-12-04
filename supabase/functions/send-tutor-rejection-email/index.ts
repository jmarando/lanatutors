import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RejectionEmailRequest {
  tutorName: string;
  email: string;
  rejectionReason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tutorName, email, rejectionReason }: RejectionEmailRequest = await req.json();

    console.log("Sending rejection email to:", email);

    const emailResponse = await resend.emails.send({
      from: "Lana Tutors <info@lanatutors.africa>",
      to: [email],
      subject: "Update on Your Lana Tutors Application",
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
              <h2 style="color: #1f2937; margin-top: 0;">Application Update</h2>
              
              <p style="font-size: 16px; color: #4b5563;">Dear ${tutorName},</p>
              
              <p style="font-size: 16px; color: #4b5563;">
                Thank you for your interest in joining Lana Tutors and for taking the time to complete the application process.
              </p>
              
              <p style="font-size: 16px; color: #4b5563;">
                After careful review of your application, we regret to inform you that we are unable to move forward with your application at this time.
              </p>
              
              ${rejectionReason ? `
              <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 25px 0; border-radius: 4px;">
                <h3 style="margin-top: 0; color: #991b1b; font-size: 16px;">Feedback</h3>
                <p style="margin: 0; color: #7f1d1d; font-size: 15px;">${rejectionReason}</p>
              </div>
              ` : ''}
              
              <div style="background: #f3f4f6; padding: 20px; margin: 25px 0; border-radius: 4px;">
                <h3 style="margin-top: 0; color: #1f2937; font-size: 18px;">What This Means</h3>
                <p style="margin: 10px 0 0; color: #4b5563;">
                  We receive a high volume of applications from qualified tutors, and while your credentials are impressive, 
                  we can only accept a limited number of tutors at this time to maintain our quality standards.
                </p>
              </div>
              
              <h3 style="color: #1f2937; margin-top: 30px;">Future Opportunities</h3>
              <p style="color: #4b5563; font-size: 16px;">
                We encourage you to reapply in the future as our needs change. In the meantime, we recommend:
              </p>
              <ul style="color: #4b5563; padding-left: 20px;">
                <li style="margin-bottom: 10px;">Gaining additional teaching experience</li>
                <li style="margin-bottom: 10px;">Pursuing professional development opportunities</li>
                <li style="margin-bottom: 10px;">Obtaining relevant certifications in your subject areas</li>
              </ul>
              
              <p style="font-size: 16px; color: #4b5563; margin-top: 30px;">
                We appreciate your interest in Lana Tutors and wish you the very best in your teaching career.
              </p>
              
              <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">
                  If you have questions, contact us at <a href="mailto:support@lanatutors.africa" style="color: #667eea; text-decoration: none;">support@lanatutors.africa</a>
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

    console.log("Rejection email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-tutor-rejection-email function:", error);
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
