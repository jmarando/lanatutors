import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TutorAssignmentRequest {
  tutorEmail: string;
  tutorName: string;
  subject: string;
  curriculum: string;
  gradeLevels: string[];
  timeSlot: string;
  programName: string;
  startDate: string;
  endDate: string;
  meetingLink?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      tutorEmail,
      tutorName,
      subject,
      curriculum,
      gradeLevels,
      timeSlot,
      programName,
      startDate,
      endDate,
      meetingLink,
    }: TutorAssignmentRequest = await req.json();

    console.log("Sending tutor assignment notification to:", tutorEmail);

    const emailResponse = await resend.emails.send({
      from: "LANA Tutors <info@lanatutors.africa>",
      to: [tutorEmail],
      subject: `You've Been Assigned to ${programName} - ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg, #9b87f5 0%, #7E69AB 100%); padding: 32px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">LANA Tutors</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">December Holiday Bootcamp</p>
              </td>
            </tr>
            
            <!-- Content -->
            <tr>
              <td style="padding: 32px;">
                <h2 style="color: #1a1a2e; margin: 0 0 16px 0; font-size: 20px;">Hello ${tutorName}! 🎉</h2>
                
                <p style="color: #4a4a68; line-height: 1.6; margin: 0 0 24px 0;">
                  Great news! You've been assigned to teach a class in our <strong>${programName}</strong>. Here are the details:
                </p>
                
                <!-- Class Details Card -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f7ff; border-radius: 12px; margin-bottom: 24px;">
                  <tr>
                    <td style="padding: 24px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="padding-bottom: 12px;">
                            <span style="color: #6b6b8a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Subject</span>
                            <p style="color: #1a1a2e; font-size: 18px; font-weight: 600; margin: 4px 0 0 0;">${subject}</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 12px;">
                            <span style="color: #6b6b8a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Curriculum</span>
                            <p style="color: #1a1a2e; font-size: 16px; margin: 4px 0 0 0;">${curriculum}</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 12px;">
                            <span style="color: #6b6b8a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Grade Levels</span>
                            <p style="color: #1a1a2e; font-size: 16px; margin: 4px 0 0 0;">${gradeLevels.join(", ")}</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 12px;">
                            <span style="color: #6b6b8a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Time Slot</span>
                            <p style="color: #1a1a2e; font-size: 16px; margin: 4px 0 0 0;">${timeSlot}</p>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <span style="color: #6b6b8a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Program Dates</span>
                            <p style="color: #1a1a2e; font-size: 16px; margin: 4px 0 0 0;">${startDate} - ${endDate}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                
                ${meetingLink ? `
                <!-- Meeting Link -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                  <tr>
                    <td style="text-align: center;">
                      <a href="${meetingLink}" style="display: inline-block; background: linear-gradient(135deg, #9b87f5 0%, #7E69AB 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Access Meeting Room</a>
                    </td>
                  </tr>
                </table>
                ` : ''}
                
                <p style="color: #4a4a68; line-height: 1.6; margin: 0 0 16px 0;">
                  Please log in to your <a href="https://lanatutors.africa/tutor/dashboard" style="color: #9b87f5; text-decoration: none; font-weight: 500;">tutor dashboard</a> to view your full bootcamp schedule, student roster, and class materials.
                </p>
                
                <p style="color: #4a4a68; line-height: 1.6; margin: 0;">
                  If you have any questions, please don't hesitate to reach out to us.
                </p>
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="background-color: #f8f7ff; padding: 24px; text-align: center; border-top: 1px solid #e5e5e5;">
                <p style="color: #6b6b8a; font-size: 14px; margin: 0 0 8px 0;">
                  Thank you for being part of the LANA Tutors team!
                </p>
                <p style="color: #9b9bae; font-size: 12px; margin: 0;">
                  © 2024 LANA Tutors. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Tutor assignment email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending tutor assignment email:", error);
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
