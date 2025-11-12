import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReminderRequest {
  studentEmail: string;
  studentName: string;
  tutorName: string;
  subject: string;
  startTime: string;
  meetingLink: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      studentEmail, 
      studentName, 
      tutorName, 
      subject, 
      startTime,
      meetingLink 
    }: ReminderRequest = await req.json();

    const sessionDate = new Date(startTime);
    const formattedDate = sessionDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const formattedTime = sessionDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: "Lana Tutors <noreply@lanatutors.africa>",
        to: [studentEmail],
        subject: `Reminder: Upcoming Session with ${tutorName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a202c;">Session Reminder</h1>
            
            <p>Hi ${studentName},</p>
            
            <p>This is a friendly reminder about your upcoming tutoring session:</p>
            
            <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #2d3748; margin-top: 0;">Session Details</h2>
              <p><strong>Subject:</strong> ${subject}</p>
              <p><strong>Tutor:</strong> ${tutorName}</p>
              <p><strong>Date:</strong> ${formattedDate}</p>
              <p><strong>Time:</strong> ${formattedTime}</p>
            </div>
            
            ${meetingLink ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${meetingLink}" 
                 style="background-color: #3182ce; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Join Session
              </a>
            </div>
            ` : ''}
            
            <p style="color: #718096; font-size: 14px;">
              Please make sure you're ready 5 minutes before the session starts.
              If you need to reschedule, please contact your tutor at least 24 hours in advance.
            </p>
            
            <p style="margin-top: 30px;">Best regards,<br>The Lana Tutors Team</p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const data = await emailResponse.json();
    console.log("Reminder email sent successfully:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-booking-reminder function:", error);
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