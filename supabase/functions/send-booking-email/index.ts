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

    console.log("Sending booking confirmation emails...");

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

    // Email to student
    const studentEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "TutorMatch <onboarding@resend.dev>",
        to: [studentEmail],
        subject: `Booking Confirmed: ${subject} with ${tutorName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #16a34a;">✓ Your Tutoring Session is Confirmed!</h1>
            <p>Hi ${studentName},</p>
            <p>Great news! Your tutoring session has been successfully booked and confirmed.</p>
            
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0;">Session Details</h2>
              <ul style="list-style: none; padding: 0;">
                <li style="padding: 5px 0;"><strong>Subject:</strong> ${subject}</li>
                <li style="padding: 5px 0;"><strong>Tutor:</strong> ${tutorName}</li>
                <li style="padding: 5px 0;"><strong>Date & Time:</strong> ${formattedStart} - ${formattedEnd}</li>
                <li style="padding: 5px 0;"><strong>Class Type:</strong> ${classType === 'online' ? 'Online' : 'Physical'}</li>
              </ul>
            </div>

            <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0;">Payment Summary</h2>
              <ul style="list-style: none; padding: 0;">
                <li style="padding: 5px 0;"><strong>Total Amount:</strong> KES ${totalAmount.toFixed(0)}</li>
                <li style="padding: 5px 0; color: #16a34a;"><strong>✓ Deposit Paid:</strong> KES ${depositPaid.toFixed(0)}</li>
                ${balanceDue > 0 ? `<li style="padding: 5px 0; color: #dc2626;"><strong>Balance Due:</strong> KES ${balanceDue.toFixed(0)}</li>` : ''}
              </ul>
              ${balanceDue > 0 ? `
                <p style="margin: 10px 0; padding: 10px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">
                  <strong>Important:</strong> Please pay the remaining balance of KES ${balanceDue.toFixed(0)} before the session. 
                  You can pay via M-Pesa or visit your dashboard to complete the payment.
                </p>
              ` : `
                <p style="margin: 10px 0; padding: 10px; background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 4px;">
                  <strong>Fully Paid!</strong> Your session is fully paid. See you there!
                </p>
              `}
            </div>

            ${classType === 'online' && meetingLink ? `
              <div style="background-color: #ede9fe; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="margin-top: 0;">How to Join Your Online Session</h2>
                <ol style="padding-left: 20px;">
                  <li style="padding: 5px 0;">Visit your Student Dashboard</li>
                  <li style="padding: 5px 0;">Find your session in "Upcoming Sessions"</li>
                  <li style="padding: 5px 0;">Click the "Join Session" button when it's time</li>
                </ol>
                <p style="margin: 15px 0;">
                  <strong>Meeting Link:</strong><br>
                  <a href="${meetingLink}" style="color: #7c3aed; word-break: break-all;">${meetingLink}</a>
                </p>
                <p style="font-size: 12px; color: #6b7280;">Note: The meeting link will be active 10 minutes before the session starts.</p>
              </div>
            ` : `
              <div style="background-color: #ede9fe; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="margin-top: 0;">Physical Session Location</h2>
                <p>This is a physical session. Your tutor will contact you shortly to confirm the exact meeting location.</p>
                <p>Please check your Student Dashboard for any updates from your tutor.</p>
              </div>
            `}

            <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; font-size: 16px;">Quick Links</h3>
              <p style="margin: 5px 0;">
                📊 <a href="https://your-app-url.com/student-dashboard" style="color: #7c3aed;">View Your Dashboard</a><br>
                💬 <a href="https://your-app-url.com/student-dashboard" style="color: #7c3aed;">Message Your Tutor</a><br>
                📚 <a href="https://your-app-url.com/tutors" style="color: #7c3aed;">Book Another Session</a>
              </p>
            </div>
            
            <p>We look forward to your session! If you have any questions, feel free to reply to this email.</p>
            <p style="color: #6b7280;">Best regards,<br><strong>The TutorMatch Team</strong></p>
          </div>
        `,
      }),
    });

    // Email to tutor
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

    const studentData = await studentEmailResponse.json();
    const tutorData = await tutorEmailResponse.json();

    console.log("Emails sent successfully:", { studentData, tutorData });

    return new Response(
      JSON.stringify({ 
        success: true,
        studentEmailResponse: studentData, 
        tutorEmailResponse: tutorData 
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
