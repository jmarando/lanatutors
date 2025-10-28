import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingConfirmationRequest {
  email: string;
  parentName: string;
  studentName: string;
  consultationDate: string;
  consultationTime: string;
  meetingLink: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, parentName, studentName, consultationDate, consultationTime, meetingLink }: BookingConfirmationRequest = await req.json();

    const formattedDate = new Date(consultationDate).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Create calendar event data for .ics file
    const startDateTime = new Date(`${consultationDate}T${consultationTime.replace(' AM', ':00').replace(' PM', ':00')}`);
    const endDateTime = new Date(startDateTime.getTime() + 30 * 60000); // 30 minutes later

    const calendarData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Yehtu Tutors//EN
BEGIN:VEVENT
UID:${crypto.randomUUID()}@yehtu.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${startDateTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTEND:${endDateTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
SUMMARY:Free Consultation with Yehtu Tutors
DESCRIPTION:Your free consultation session with Yehtu Tutors. Join here: ${meetingLink}
LOCATION:${meetingLink}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Consultation Confirmed! ✅</h1>
        
        <p>Hi ${parentName},</p>
        
        <p>Great news! Your free consultation for ${studentName} has been successfully scheduled.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0; color: #1f2937;">Consultation Details</h2>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${consultationTime}</p>
          <p><strong>Duration:</strong> 30 minutes</p>
        </div>
        
        <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e40af;">How to Join</h3>
          <p>Click the button below to join your consultation:</p>
          <a href="${meetingLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">Join Meeting</a>
          <p style="font-size: 14px; color: #6b7280;">Or copy this link: ${meetingLink}</p>
        </div>
        
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>📅 Add to Calendar:</strong></p>
          <p style="margin: 10px 0 0 0; font-size: 14px;">Download the calendar attachment to add this to your calendar</p>
        </div>
        
        <div style="background-color: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>🔔 Reminders:</strong></p>
          <p style="margin: 10px 0 0 0; font-size: 14px;">We'll send you email and WhatsApp reminders:</p>
          <ul style="font-size: 14px; margin: 10px 0 0 20px;">
            <li>1 day before your consultation</li>
            <li>1 hour before your consultation</li>
          </ul>
        </div>
        
        <h3 style="color: #1f2937;">What to Prepare</h3>
        <ul>
          <li>Any questions about your child's learning needs</li>
          <li>Information about subjects they need help with</li>
          <li>Your child's current academic challenges</li>
        </ul>
        
        <p>If you need to reschedule, please contact us at info@yehtu.com</p>
        
        <p>Looking forward to meeting you!</p>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          Best regards,<br>
          The Yehtu Tutors Team<br>
          <a href="https://yehtu.com" style="color: #2563eb;">www.yehtu.com</a>
        </p>
      </div>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ElimuConnect <info@elimuconnect.co.ke>",
        to: [email],
        subject: "Your Free Consultation is Confirmed! 📚",
        html: emailHtml,
      }),
    });

    const emailData = await emailResponse.json();
    
    if (!emailResponse.ok) {
      console.error("Email sending failed:", emailData);
      throw new Error(emailData.message || "Failed to send email");
    }

    console.log("Booking confirmation email sent successfully:", emailData);

    return new Response(JSON.stringify(emailData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-consultation-booking-confirmation:", error);
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
