import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnrollmentNotificationRequest {
  tutorEmail: string;
  tutorName: string;
  studentName: string;
  subject: string;
  curriculum: string;
  gradeLevels: string[];
  timeSlot: string;
  programName: string;
  currentEnrollment: number;
  maxStudents: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      tutorEmail,
      tutorName,
      studentName,
      subject,
      curriculum,
      gradeLevels,
      timeSlot,
      programName,
      currentEnrollment,
      maxStudents,
    }: EnrollmentNotificationRequest = await req.json();

    console.log("Sending enrollment notification to tutor:", tutorEmail);

    const spotsRemaining = maxStudents - currentEnrollment;
    const fillPercentage = Math.round((currentEnrollment / maxStudents) * 100);

    const emailResponse = await resend.emails.send({
      from: "LANA Tutors <info@lanatutors.africa>",
      to: [tutorEmail],
      subject: `New Student Enrolled: ${studentName} - ${subject} (${programName})`,
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
              <td style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 32px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">New Student Enrolled! 🎓</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">${programName}</p>
              </td>
            </tr>
            
            <!-- Content -->
            <tr>
              <td style="padding: 32px;">
                <h2 style="color: #1a1a2e; margin: 0 0 16px 0; font-size: 20px;">Hello ${tutorName}!</h2>
                
                <p style="color: #4a4a68; line-height: 1.6; margin: 0 0 24px 0;">
                  A new student has enrolled in your <strong>${subject}</strong> class. Here are the details:
                </p>
                
                <!-- Student Info Card -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0fdf4; border-radius: 12px; margin-bottom: 24px; border-left: 4px solid #22c55e;">
                  <tr>
                    <td style="padding: 20px;">
                      <p style="color: #166534; font-size: 18px; font-weight: 600; margin: 0;">
                        ${studentName}
                      </p>
                      <p style="color: #4a4a68; font-size: 14px; margin: 8px 0 0 0;">
                        has joined your ${curriculum} ${gradeLevels.join(", ")} class
                      </p>
                    </td>
                  </tr>
                </table>
                
                <!-- Class Details -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f7ff; border-radius: 12px; margin-bottom: 24px;">
                  <tr>
                    <td style="padding: 24px;">
                      <h3 style="color: #1a1a2e; margin: 0 0 16px 0; font-size: 16px;">Class Details</h3>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="padding-bottom: 8px;">
                            <span style="color: #6b6b8a; font-size: 13px;">Subject:</span>
                            <span style="color: #1a1a2e; font-size: 14px; font-weight: 500; margin-left: 8px;">${subject}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 8px;">
                            <span style="color: #6b6b8a; font-size: 13px;">Curriculum:</span>
                            <span style="color: #1a1a2e; font-size: 14px; font-weight: 500; margin-left: 8px;">${curriculum}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 8px;">
                            <span style="color: #6b6b8a; font-size: 13px;">Time Slot:</span>
                            <span style="color: #1a1a2e; font-size: 14px; font-weight: 500; margin-left: 8px;">${timeSlot}</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                
                <!-- Enrollment Status -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${fillPercentage >= 90 ? '#fef2f2' : fillPercentage >= 70 ? '#fffbeb' : '#f0fdf4'}; border-radius: 12px; margin-bottom: 24px;">
                  <tr>
                    <td style="padding: 20px; text-align: center;">
                      <p style="color: #6b6b8a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px 0;">Class Enrollment</p>
                      <p style="color: #1a1a2e; font-size: 28px; font-weight: 700; margin: 0;">
                        ${currentEnrollment} / ${maxStudents}
                      </p>
                      <p style="color: ${fillPercentage >= 90 ? '#dc2626' : fillPercentage >= 70 ? '#d97706' : '#16a34a'}; font-size: 14px; margin: 8px 0 0 0;">
                        ${spotsRemaining === 0 ? 'Class is now full!' : `${spotsRemaining} spot${spotsRemaining === 1 ? '' : 's'} remaining`}
                      </p>
                    </td>
                  </tr>
                </table>
                
                <p style="color: #4a4a68; line-height: 1.6; margin: 0 0 16px 0;">
                  View your complete student roster and class schedule on your <a href="https://lanatutors.africa/tutor/dashboard" style="color: #9b87f5; text-decoration: none; font-weight: 500;">tutor dashboard</a>.
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

    console.log("Enrollment notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending enrollment notification email:", error);
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
