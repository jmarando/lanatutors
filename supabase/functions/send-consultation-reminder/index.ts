import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ConsultationReminder {
  id: string;
  parent_name: string;
  student_name: string;
  email: string;
  consultation_date: string;
  consultation_time: string;
  meeting_link: string;
  reminderType?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the time window we're checking for (24 hours or 1 hour from now)
    const now = new Date();
    const targetTime24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const targetTime1h = new Date(now.getTime() + 60 * 60 * 1000);

    // Query consultations happening in ~24 hours (23-25 hour window)
    const start24h = new Date(targetTime24h.getTime() - 60 * 60 * 1000).toISOString().split('T')[0];
    const end24h = new Date(targetTime24h.getTime() + 60 * 60 * 1000).toISOString().split('T')[0];

    // Query consultations happening in ~1 hour (0.5-1.5 hour window)
    const start1h = new Date(targetTime1h.getTime() - 30 * 60 * 1000).toISOString().split('T')[0];
    const end1h = new Date(targetTime1h.getTime() + 30 * 60 * 1000).toISOString().split('T')[0];

    const { data: consultations24h, error: error24h } = await supabase
      .from("consultation_bookings")
      .select("*")
      .eq("status", "confirmed")
      .gte("consultation_date", start24h)
      .lte("consultation_date", end24h);

    const { data: consultations1h, error: error1h } = await supabase
      .from("consultation_bookings")
      .select("*")
      .eq("status", "confirmed")
      .gte("consultation_date", start1h)
      .lte("consultation_date", end1h);

    if (error24h || error1h) {
      throw new Error(`Database error: ${error24h?.message || error1h?.message}`);
    }

    const reminders: ConsultationReminder[] = [];

    // Process 24-hour reminders
    if (consultations24h) {
      for (const consultation of consultations24h) {
        const consultationDateTime = new Date(`${consultation.consultation_date}T${consultation.consultation_time}`);
        const timeDiff = consultationDateTime.getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        // Send if between 23-25 hours away
        if (hoursDiff >= 23 && hoursDiff <= 25 && consultation.email) {
          reminders.push({
            ...consultation,
            reminderType: "24h",
          });
        }
      }
    }

    // Process 1-hour reminders
    if (consultations1h) {
      for (const consultation of consultations1h) {
        const consultationDateTime = new Date(`${consultation.consultation_date}T${consultation.consultation_time}`);
        const timeDiff = consultationDateTime.getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        // Send if between 0.75-1.25 hours away
        if (hoursDiff >= 0.75 && hoursDiff <= 1.25 && consultation.email) {
          reminders.push({
            ...consultation,
            reminderType: "1h",
          });
        }
      }
    }

    console.log(`Found ${reminders.length} reminders to send`);

    // Send reminder emails
    const emailResults = [];
    for (const reminder of reminders) {
      try {
        const consultationDate = new Date(reminder.consultation_date);
        const formattedDate = consultationDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        const timeUntil = reminder.reminderType === "24h" ? "24 hours" : "1 hour";

        // Parse the time properly (handle 12-hour format)
        const parseTime = (timeStr: string) => {
          const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
          if (!match) return { hours: 9, minutes: 0 };
          let hours = parseInt(match[1]);
          const minutes = parseInt(match[2]);
          const isPM = match[3]?.toUpperCase() === 'PM';
          if (isPM && hours !== 12) hours += 12;
          if (!isPM && hours === 12) hours = 0;
          return { hours, minutes };
        };

        const { hours, minutes } = parseTime(reminder.consultation_time);
        const startDateTime = new Date(reminder.consultation_date);
        startDateTime.setHours(hours, minutes, 0, 0);
        const endDateTime = new Date(startDateTime.getTime() + 30 * 60000);

        // Format for Google Calendar URL
        const formatGoogleDate = (date: Date) => {
          return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        const eventTitle = encodeURIComponent(`Free Consultation with Lana Tutors - ${reminder.student_name}`);
        const eventDescription = encodeURIComponent(`Your free consultation session with Lana Tutors.\n\nJoin here: ${reminder.meeting_link || ''}`);
        const eventLocation = encodeURIComponent(reminder.meeting_link || '');

        const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${formatGoogleDate(startDateTime)}/${formatGoogleDate(endDateTime)}&details=${eventDescription}&location=${eventLocation}`;
        const outlookCalendarUrl = `https://outlook.live.com/calendar/0/action/compose?subject=${eventTitle}&startdt=${startDateTime.toISOString()}&enddt=${endDateTime.toISOString()}&body=${eventDescription}&location=${eventLocation}`;

        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: "Lana Tutors <info@lanatutors.africa>",
            to: [reminder.email],
            subject: `Reminder: Consultation in ${timeUntil} - ${reminder.student_name}`,
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
                  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
                    <tr>
                      <td style="padding: 40px 20px;">
                        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                          <!-- Header -->
                          <tr>
                            <td style="background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">⏰ Consultation Reminder</h1>
                            </td>
                          </tr>
                          
                          <!-- Content -->
                          <tr>
                            <td style="padding: 40px 30px;">
                              <p style="margin: 0 0 20px 0; color: #1A1A1A; font-size: 16px; line-height: 1.5;">
                                Hi ${reminder.parent_name},
                              </p>
                              
                              <p style="margin: 0 0 30px 0; color: #1A1A1A; font-size: 16px; line-height: 1.5;">
                                This is a friendly reminder that your consultation for <strong>${reminder.student_name}</strong> is coming up in <strong>${timeUntil}</strong>.
                              </p>
                              
                              <!-- Details Box -->
                              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #FFF8F5; border-left: 4px solid #FF6B35; border-radius: 4px; margin-bottom: 30px;">
                                <tr>
                                  <td style="padding: 20px;">
                                    <p style="margin: 0 0 10px 0; color: #1A1A1A; font-size: 14px;">
                                      <strong style="color: #FF6B35;">📅 Date:</strong> ${formattedDate}
                                    </p>
                                    <p style="margin: 0 0 10px 0; color: #1A1A1A; font-size: 14px;">
                                      <strong style="color: #FF6B35;">🕐 Time:</strong> ${reminder.consultation_time}
                                    </p>
                                    <p style="margin: 0; color: #1A1A1A; font-size: 14px;">
                                      <strong style="color: #FF6B35;">⏱️ Duration:</strong> 30 minutes
                                    </p>
                                  </td>
                                </tr>
                              </table>
                              
                              ${reminder.meeting_link ? `
                              <!-- CTA Button -->
                              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                                <tr>
                                  <td style="text-align: center;">
                                    <a href="${reminder.meeting_link}" 
                                       style="display: inline-block; background-color: #FF6B35; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                                      Join Consultation
                                    </a>
                                  </td>
                                </tr>
                              </table>
                              ` : ''}

                              <!-- Add to Calendar -->
                              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9f9f9; border-radius: 8px; margin-bottom: 30px;">
                                <tr>
                                  <td style="padding: 20px; text-align: center;">
                                    <p style="margin: 0 0 15px 0; color: #1A1A1A; font-size: 14px; font-weight: bold;">📅 Add to Calendar</p>
                                    <a href="${googleCalendarUrl}" target="_blank" style="display: inline-block; background-color: #4285F4; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; margin: 5px;">Google Calendar</a>
                                    <a href="${outlookCalendarUrl}" target="_blank" style="display: inline-block; background-color: #0078D4; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; margin: 5px;">Outlook</a>
                                  </td>
                                </tr>
                              </table>
                              
                              <p style="margin: 0 0 10px 0; color: #737373; font-size: 14px; line-height: 1.5;">
                                <strong>Preparation Tips:</strong>
                              </p>
                              <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #737373; font-size: 14px; line-height: 1.8;">
                                <li>Have your questions ready</li>
                                <li>List subjects ${reminder.student_name} needs help with</li>
                                <li>Note any specific challenges or concerns</li>
                              </ul>
                              
                              <p style="margin: 0; color: #737373; font-size: 14px; line-height: 1.5;">
                                Need to reschedule? Please contact us at <a href="mailto:info@lanatutors.africa" style="color: #FF6B35; text-decoration: none;">info@lanatutors.africa</a>
                              </p>
                            </td>
                          </tr>
                          
                          <!-- Footer -->
                          <tr>
                            <td style="padding: 20px 30px; background-color: #f9f9f9; border-radius: 0 0 8px 8px; text-align: center;">
                              <p style="margin: 0; color: #737373; font-size: 12px;">
                                Best regards,<br>
                                <strong>The Lana Tutors Team</strong>
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
              </html>
            `,
          }),
        });

        if (!emailResponse.ok) {
          const error = await emailResponse.text();
          console.error(`Failed to send reminder to ${reminder.email}:`, error);
          emailResults.push({ email: reminder.email, success: false, error });
        } else {
          const data = await emailResponse.json();
          console.log(`Reminder sent successfully to ${reminder.email}`);
          emailResults.push({ email: reminder.email, success: true, data });
        }
      } catch (error: any) {
        console.error(`Error sending reminder to ${reminder.email}:`, error);
        emailResults.push({ email: reminder.email, success: false, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${reminders.length} reminders`,
        results: emailResults,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-consultation-reminder function:", error);
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
