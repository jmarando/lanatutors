import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingEmailRequest {
  studentEmail: string;
  studentName: string;
  tutorEmail: string;
  tutorName: string;
  subject: string;
  startTime: string;
  endTime: string;
  meetingLink?: string;
  depositPaid: number;
  balanceDue: number;
  totalAmount: number;
  classType: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      studentEmail, 
      studentName, 
      tutorEmail, 
      tutorName, 
      subject, 
      startTime, 
      endTime,
      meetingLink,
      depositPaid,
      balanceDue,
      totalAmount,
      classType
    }: BookingEmailRequest = await req.json();

    console.log("Sending booking confirmation emails to:", studentEmail, "and", tutorEmail);

    const formattedStart = new Date(startTime).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const formattedEnd = new Date(endTime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Professional email template with inline styles
    const studentEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%); border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      ✓ Booking Confirmed!
                    </h1>
                  </td>
                </tr>
                
                <!-- Body -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 20px; font-size: 16px; line-height: 24px; color: #374151;">
                      Hi <strong>${studentName}</strong>,
                    </p>
                    <p style="margin: 0 0 30px; font-size: 16px; line-height: 24px; color: #374151;">
                      Great news! Your tutoring session has been successfully booked and confirmed. We're excited to support your learning journey! 🎓
                    </p>
                    
                    <!-- Session Details Card -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f0f9ff; border-radius: 8px; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 24px;">
                          <h2 style="margin: 0 0 16px; font-size: 18px; color: #0369a1; font-weight: 600;">
                            📚 Session Details
                          </h2>
                          <table role="presentation" style="width: 100%; border-collapse: collapse;">
                            <tr>
                              <td style="padding: 6px 0; font-size: 14px; color: #6b7280; width: 120px;">Subject:</td>
                              <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 500;">${subject}</td>
                            </tr>
                            <tr>
                              <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">Tutor:</td>
                              <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 500;">${tutorName}</td>
                            </tr>
                            <tr>
                              <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">Date & Time:</td>
                              <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 500;">${formattedStart}</td>
                            </tr>
                            <tr>
                              <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">Duration:</td>
                              <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 500;">Until ${formattedEnd}</td>
                            </tr>
                            <tr>
                              <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">Class Type:</td>
                              <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 500;">${classType === 'online' ? '💻 Online' : '📍 Physical'}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Payment Summary Card -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fef3c7; border-radius: 8px; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 24px;">
                          <h2 style="margin: 0 0 16px; font-size: 18px; color: #92400e; font-weight: 600;">
                            💰 Payment Summary
                          </h2>
                          <table role="presentation" style="width: 100%; border-collapse: collapse;">
                            <tr>
                              <td style="padding: 6px 0; font-size: 14px; color: #78350f;">Total Amount:</td>
                              <td style="padding: 6px 0; font-size: 16px; color: #111827; font-weight: 600; text-align: right;">KES ${totalAmount.toFixed(0)}</td>
                            </tr>
                            <tr>
                              <td style="padding: 6px 0; font-size: 14px; color: #16a34a;">✓ Deposit Paid:</td>
                              <td style="padding: 6px 0; font-size: 14px; color: #16a34a; font-weight: 600; text-align: right;">KES ${depositPaid.toFixed(0)}</td>
                            </tr>
                            ${balanceDue > 0 ? `
                            <tr>
                              <td style="padding: 6px 0; font-size: 14px; color: #dc2626;">Balance Due:</td>
                              <td style="padding: 6px 0; font-size: 16px; color: #dc2626; font-weight: 600; text-align: right;">KES ${balanceDue.toFixed(0)}</td>
                            </tr>
                            ` : ''}
                          </table>
                          
                          ${balanceDue > 0 ? `
                          <div style="margin-top: 16px; padding: 12px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">
                            <p style="margin: 0; font-size: 13px; color: #991b1b; line-height: 20px;">
                              <strong>⚠️ Important:</strong> Please pay the remaining balance of <strong>KES ${balanceDue.toFixed(0)}</strong> before the session. Visit your Student Dashboard to complete payment.
                            </p>
                          </div>
                          ` : `
                          <div style="margin-top: 16px; padding: 12px; background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 4px;">
                            <p style="margin: 0; font-size: 13px; color: #14532d; line-height: 20px;">
                              <strong>✓ Fully Paid!</strong> Your session is completely paid for. See you there!
                            </p>
                          </div>
                          `}
                        </td>
                      </tr>
                    </table>

                    ${classType === 'online' && meetingLink ? `
                    <!-- Join Instructions Card -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #ede9fe; border-radius: 8px; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 24px;">
                          <h2 style="margin: 0 0 16px; font-size: 18px; color: #5b21b6; font-weight: 600;">
                            🎥 How to Join Your Online Session
                          </h2>
                          <ol style="margin: 0; padding-left: 20px; color: #4c1d95;">
                            <li style="margin-bottom: 8px; font-size: 14px;">Visit your <strong>Student Dashboard</strong></li>
                            <li style="margin-bottom: 8px; font-size: 14px;">Find your session in <strong>"Upcoming Sessions"</strong></li>
                            <li style="margin-bottom: 8px; font-size: 14px;">Click <strong>"Join Session"</strong> when it's time</li>
                          </ol>
                          <div style="margin-top: 16px; padding: 12px; background-color: #ffffff; border-radius: 6px;">
                            <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280; font-weight: 600;">MEETING LINK:</p>
                            <a href="${meetingLink}" style="color: #7c3aed; word-break: break-all; font-size: 13px; text-decoration: underline;">${meetingLink}</a>
                          </div>
                          <p style="margin: 12px 0 0; font-size: 12px; color: #6b7280;">
                            💡 The meeting link will be active 10 minutes before your session starts.
                          </p>
                        </td>
                      </tr>
                    </table>
                    ` : `
                    <!-- Physical Session Card -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #ede9fe; border-radius: 8px; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 24px;">
                          <h2 style="margin: 0 0 12px; font-size: 18px; color: #5b21b6; font-weight: 600;">
                            📍 Physical Session Location
                          </h2>
                          <p style="margin: 0 0 12px; font-size: 14px; color: #4c1d95; line-height: 22px;">
                            This is a physical session. Your tutor will contact you shortly to confirm the exact meeting location.
                          </p>
                          <p style="margin: 0; font-size: 14px; color: #6b7280;">
                            Please check your Student Dashboard for any updates from your tutor.
                          </p>
                        </td>
                      </tr>
                    </table>
                    `}

                    <!-- Quick Links -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; margin-bottom: 30px;">
                      <tr>
                        <td style="padding: 20px;">
                          <h3 style="margin: 0 0 12px; font-size: 16px; color: #111827; font-weight: 600;">
                            🔗 Quick Links
                          </h3>
                          <p style="margin: 0; font-size: 14px; line-height: 28px;">
                            📊 <a href="https://your-app-url.com/student-dashboard" style="color: #0ea5e9; text-decoration: none; font-weight: 500;">View Your Dashboard</a><br>
                            💬 <a href="https://your-app-url.com/student-dashboard" style="color: #0ea5e9; text-decoration: none; font-weight: 500;">Message Your Tutor</a><br>
                            📚 <a href="https://your-app-url.com/tutors" style="color: #0ea5e9; text-decoration: none; font-weight: 500;">Book Another Session</a>
                          </p>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 10px; font-size: 16px; line-height: 24px; color: #374151;">
                      We're looking forward to your session! If you have any questions, feel free to reply to this email.
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #6b7280;">
                      Best regards,<br>
                      <strong>The TutorMatch Team</strong>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 18px;">
                      © 2025 TutorMatch. All rights reserved.<br>
                      This is an automated message. Please do not reply to this email.
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

    // Email to student using Resend API directly
    const studentEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "TutorMatch <onboarding@resend.dev>",
        to: [studentEmail],
        subject: `✓ Booking Confirmed: ${subject} with ${tutorName}`,
        html: studentEmailHtml,
      }),
    });

    const studentEmailData = await studentEmailResponse.json();

    if (!studentEmailResponse.ok) {
      console.error("Error sending student email:", studentEmailData);
      throw new Error(studentEmailData.message || "Failed to send student email");
    }

    console.log("Student email sent successfully:", studentEmailData);

    // Simple tutor notification email
    const tutorEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "TutorMatch <onboarding@resend.dev>",
        to: [tutorEmail],
        subject: `New Booking: ${subject} with ${studentName}`,
        html: `
          <h1>You Have a New Booking!</h1>
          <p>Hi ${tutorName},</p>
          <p>A student has booked a session with you.</p>
          
          <h2>Session Details:</h2>
          <ul>
            <li><strong>Subject:</strong> ${subject}</li>
            <li><strong>Student:</strong> ${studentName}</li>
            <li><strong>Date & Time:</strong> ${formattedStart} - ${formattedEnd}</li>
            ${meetingLink ? `<li><strong>Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></li>` : ''}
          </ul>
          
          <p>Please prepare for the session accordingly.</p>
          <p>Best regards,<br>The TutorMatch Team</p>
        `,
      }),
    });

    const tutorEmailData = await tutorEmailResponse.json();

    if (!tutorEmailResponse.ok) {
      console.error("Error sending tutor email:", tutorEmailData);
    }

    console.log("Tutor email sent successfully:", tutorEmailData);

    return new Response(
      JSON.stringify({ 
        success: true,
        studentEmailResponse: studentEmailData, 
        tutorEmailResponse: tutorEmailData 
      }), 
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending booking emails:", error);
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
