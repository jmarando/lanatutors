import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { checkRateLimit, getRateLimitIdentifier } from "../_shared/rate-limiter.ts";

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

  // Rate limiting: 5 requests per IP per minute
  const identifier = getRateLimitIdentifier(req);
  if (!checkRateLimit(identifier)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      { 
        status: 429, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }

  try {
    const { email, parentName, studentName, consultationDate, consultationTime, meetingLink }: BookingConfirmationRequest = await req.json();

    const formattedDate = new Date(consultationDate).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Parse the time properly (handle 12-hour format)
    const parseTime = (timeStr: string) => {
      const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!match) return { hours: 9, minutes: 0 };
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const isPM = match[3].toUpperCase() === 'PM';
      if (isPM && hours !== 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
      return { hours, minutes };
    };

    const { hours, minutes } = parseTime(consultationTime);
    const startDateTime = new Date(consultationDate);
    startDateTime.setHours(hours, minutes, 0, 0);
    const endDateTime = new Date(startDateTime.getTime() + 30 * 60000); // 30 minutes later

    // Format for Google Calendar URL (YYYYMMDDTHHmmssZ format)
    const formatGoogleDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const eventTitle = encodeURIComponent(`Free Consultation with Lana Tutors - ${studentName}`);
    const eventDescription = encodeURIComponent(`Your free consultation session with Lana Tutors to discuss ${studentName}'s learning needs.\n\nJoin here: ${meetingLink}`);
    const eventLocation = encodeURIComponent(meetingLink);

    // Google Calendar link
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${formatGoogleDate(startDateTime)}/${formatGoogleDate(endDateTime)}&details=${eventDescription}&location=${eventLocation}`;

    // Outlook Calendar link
    const formatOutlookDate = (date: Date) => date.toISOString();
    const outlookCalendarUrl = `https://outlook.live.com/calendar/0/action/compose?subject=${eventTitle}&startdt=${formatOutlookDate(startDateTime)}&enddt=${formatOutlookDate(endDateTime)}&body=${eventDescription}&location=${eventLocation}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: linear-gradient(135deg, #ED3F27 0%, #c73420 100%); padding: 40px 20px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
          .content { padding: 40px 30px; }
          .banner { background: linear-gradient(135deg, #F1EDEA 0%, #ffffff 100%); padding: 30px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #1D9DB8; }
          .banner h2 { color: #1A1A1A; margin: 0 0 10px 0; font-size: 22px; }
          .banner p { color: #737373; margin: 5px 0; line-height: 1.6; }
          .detail-box { background: #F1EDEA; padding: 25px; border-radius: 12px; margin: 25px 0; }
          .detail-row { display: flex; padding: 12px 0; border-bottom: 1px solid #e0e0e0; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { font-weight: 600; color: #1A1A1A; min-width: 120px; }
          .detail-value { color: #737373; }
          .button { display: inline-block; background: linear-gradient(135deg, #ED3F27 0%, #c73420 100%); color: #ffffff !important; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 5px; box-shadow: 0 4px 12px rgba(237, 63, 39, 0.3); }
          .button-secondary { background: linear-gradient(135deg, #1D9DB8 0%, #178ca3 100%); color: #ffffff !important; box-shadow: 0 4px 12px rgba(29, 157, 184, 0.3); }
          .info-box { background: #E8F7FA; border-left: 4px solid #1D9DB8; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .info-box h3 { color: #1D9DB8; margin: 0 0 15px 0; font-size: 18px; }
          .info-box ul { margin: 0; padding-left: 20px; color: #1A1A1A; line-height: 1.8; }
          .reminder-box { background: #FFF8E6; border-left: 4px solid #F59E0B; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { background: #1A1A1A; color: #ffffff; padding: 30px; text-align: center; }
          .footer a { color: #1D9DB8; text-decoration: none; }
          @media only screen and (max-width: 600px) {
            .content { padding: 20px 15px; }
            .button { display: block; margin: 10px 0; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 Consultation Confirmed!</h1>
          </div>
          
          <div class="content">
            <div class="banner">
              <h2>Hi ${parentName},</h2>
              <p>Great news! Your free consultation for <strong>${studentName}</strong> has been successfully scheduled with Lana Tutors.</p>
            </div>

            <div class="detail-box">
              <h3 style="color: #1A1A1A; margin-top: 0;">📅 Consultation Details</h3>
              <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${formattedDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span class="detail-value">${consultationTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Duration:</span>
                <span class="detail-value">30 minutes</span>
              </div>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${meetingLink}" class="button">📹 Join Meeting</a>
            </div>

            <div style="text-align: center; margin: 20px 0; padding: 20px; background: #F9FAFB; border-radius: 8px;">
              <p style="color: #1A1A1A; margin: 0 0 15px 0; font-weight: 600;">📅 Add to Calendar</p>
              <a href="${googleCalendarUrl}" target="_blank" style="display: inline-block; background: #4285F4; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-size: 14px; margin: 5px;">Google Calendar</a>
              <a href="${outlookCalendarUrl}" target="_blank" style="display: inline-block; background: #0078D4; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-size: 14px; margin: 5px;">Outlook</a>
            </div>
            
            <div class="info-box">
              <h3>💡 What to Expect During Your Consultation</h3>
              <ul>
                <li><strong>Meet Your Expert:</strong> You'll chat with a Lana Tutors curriculum specialist who understands your child's learning system</li>
                <li><strong>Discuss Learning Needs:</strong> Share ${studentName}'s academic goals, challenges, and subjects where they need support</li>
                <li><strong>Personalized Recommendations:</strong> Get expert advice on the best tutoring approach, subject combinations, and tutor matches</li>
                <li><strong>Ask Questions:</strong> Learn about our tutoring methods, pricing packages, and how Lana Tutors can help ${studentName} excel</li>
                <li><strong>Next Steps:</strong> Receive a customized learning plan and immediate support to get started</li>
              </ul>
            </div>

            <div class="reminder-box">
              <p style="margin: 0; color: #1A1A1A;"><strong>🔔 Reminders</strong></p>
              <p style="margin: 10px 0 0 0; color: #737373;">We'll send you email reminders:</p>
              <ul style="margin: 10px 0 0 20px; color: #737373;">
                <li>1 day before your consultation</li>
                <li>1 hour before your consultation</li>
              </ul>
            </div>

            <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h3 style="color: #1A1A1A; margin-top: 0;">📝 Prepare for Your Session</h3>
              <p style="color: #737373; margin: 5px 0;">To make the most of your consultation, please have ready:</p>
              <ul style="color: #737373; line-height: 1.8;">
                <li>List of subjects ${studentName} needs help with</li>
                <li>Current academic challenges or concerns</li>
                <li>Your child's learning goals and aspirations</li>
                <li>Any questions about our tutoring services</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="mailto:info@lanatutors.africa?subject=Reschedule Consultation - ${studentName}" class="button button-secondary">📅 Need to Reschedule?</a>
            </div>

            <p style="color: #737373; text-align: center; font-size: 14px; margin: 30px 0;">
              If you need to reschedule or have any questions, simply reply to this email or contact us at 
              <a href="mailto:info@lanatutors.africa" style="color: #1D9DB8;">info@lanatutors.africa</a>
            </p>

            <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 2px solid #F1EDEA;">
              <p style="color: #1A1A1A; font-size: 16px; margin: 0;">Looking forward to meeting you!</p>
            </div>
          </div>

          <div class="footer">
            <p style="margin: 0 0 10px 0; font-size: 16px;">The Lana Team</p>
            <p style="margin: 0; font-size: 14px; color: #B0B0B0;">Empowering Kenyan Students Through Quality Education</p>
            <p style="margin: 20px 0 0 0;">
              <a href="https://learnwithlana.com" style="color: #1D9DB8;">www.learnwithlana.com</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log("Attempting to send email to:", email);
    console.log("Using API key:", RESEND_API_KEY ? "API key is set" : "API key is MISSING");
    
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Lana Tutors <info@lanatutors.africa>",
        to: [email],
        subject: "Your Free Consultation is Confirmed! 📚",
        html: emailHtml,
      }),
    });

    const emailData = await emailResponse.json();
    
    console.log("Resend API response status:", emailResponse.status);
    console.log("Resend API response:", JSON.stringify(emailData));
    
    if (!emailResponse.ok) {
      console.error("Email sending failed with status:", emailResponse.status);
      console.error("Error details:", emailData);
      throw new Error(emailData.message || `Failed to send email: ${JSON.stringify(emailData)}`);
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
