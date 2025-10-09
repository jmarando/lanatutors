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
      meetingLink 
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
          <h1>Your Tutoring Session is Confirmed!</h1>
          <p>Hi ${studentName},</p>
          <p>Your tutoring session has been successfully booked.</p>
          
          <h2>Session Details:</h2>
          <ul>
            <li><strong>Subject:</strong> ${subject}</li>
            <li><strong>Tutor:</strong> ${tutorName}</li>
            <li><strong>Date & Time:</strong> ${formattedStart} - ${formattedEnd}</li>
            ${meetingLink ? `<li><strong>Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></li>` : ''}
          </ul>
          
          <p>We look forward to your session!</p>
          <p>Best regards,<br>The TutorMatch Team</p>
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
