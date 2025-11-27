import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingEmailRequest {
  bookingId: string;
  meetingLink?: string;
  classroomLink?: string;
  recipientType?: 'student' | 'tutor' | 'both';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, meetingLink, classroomLink, recipientType = 'both' }: BookingEmailRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch core booking record
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) throw bookingError || new Error('Booking not found');

    // Fetch related records individually (no FK relationships required)
    const { data: studentProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', booking.student_id)
      .maybeSingle();

    // Get student email from auth.users
    const { data: studentAuth } = await supabase.auth.admin.getUserById(booking.student_id);
    const studentEmail = studentAuth?.user?.email;

    const { data: tutorProfile } = await supabase
      .from('tutor_profiles')
      .select('email')
      .eq('user_id', booking.tutor_id)
      .maybeSingle();

    const { data: slot } = await supabase
      .from('tutor_availability')
      .select('start_time, end_time')
      .eq('id', booking.availability_slot_id)
      .maybeSingle();

    const finalMeetingLink = meetingLink || booking.meeting_link || 'Will be shared soon';

    const startTime = slot ? new Date(slot.start_time) : new Date();
    const formattedDate = startTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = startTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Nairobi'
    });

    // Send to student
    if (recipientType === 'student' || recipientType === 'both') {
      console.log(`Attempting to send email to student: ${studentEmail}`);
      
      if (!studentEmail) {
        console.error('Student email not found - cannot send confirmation');
        throw new Error('Student email not found');
      }
      
      if (!RESEND_API_KEY) {
        console.error('RESEND_API_KEY not configured');
        throw new Error('RESEND_API_KEY not configured');
      }
      
      const studentEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; max-width: 600px;">
                  
                  <!-- Header -->
                  <tr>
                    <td align="center" style="background-color: #D95436; padding: 40px 30px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td align="center" style="font-size: 32px; color: #ffffff; padding-bottom: 8px;">✓</td>
                        </tr>
                        <tr>
                          <td align="center" style="font-size: 32px; font-weight: 600; color: #ffffff; letter-spacing: -0.5px;">Booking Confirmed!</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 30px;">
                      
                      <!-- Greeting -->
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td style="padding-bottom: 8px; font-size: 18px; font-weight: 600; color: #1a1a1a;">Hi ${studentProfile?.full_name || 'Parent'},</td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 20px; font-size: 15px; line-height: 1.6; color: #4a4a4a;">Great news! Your tutoring session has been successfully booked and confirmed. We're excited to support your learning journey! 🎓</td>
                        </tr>
                      </table>
                      
                      <!-- Session Details -->
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FFF5F5; border-radius: 12px; margin: 24px 0;">
                        <tr>
                          <td style="padding: 24px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                              <tr>
                                <td style="padding-bottom: 16px; font-size: 18px; font-weight: 600; color: #D95436;">📚 Session Details</td>
                              </tr>
                              <tr>
                                <td>
                                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                    <tr>
                                      <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #666666; width: 40%;">Subject:</td>
                                      <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${booking.subject}</td>
                                    </tr>
                                    <tr>
                                      <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #666666;">Tutor:</td>
                                      <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">Calvins Onuko</td>
                                    </tr>
                                    <tr>
                                      <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #666666;">Date & Time:</td>
                                      <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${formattedDate} at ${formattedTime}</td>
                                    </tr>
                                    <tr>
                                      <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #666666;">Duration:</td>
                                      <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">1 hour</td>
                                    </tr>
                                    <tr>
                                      <td style="padding: 10px 0; font-size: 14px; color: #666666;">Class Type:</td>
                                      <td style="padding: 10px 0; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${booking.class_type === 'physical' ? '📍 Physical' : '💻 Online'}</td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Payment Summary -->
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FFFBEB; border-radius: 12px; margin: 24px 0;">
                        <tr>
                          <td style="padding: 24px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                              <tr>
                                <td style="padding-bottom: 16px; font-size: 18px; font-weight: 600; color: #D97706;">💰 Payment Summary</td>
                              </tr>
                              <tr>
                                <td>
                                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                    <tr>
                                      <td style="padding: 10px 0; border-bottom: 1px solid #FDE68A; font-size: 14px; color: #78350f;">Total Amount:</td>
                                      <td style="padding: 10px 0; border-bottom: 1px solid #FDE68A; font-size: 16px; color: #1a1a1a; font-weight: 600; text-align: right;">${booking.currency || 'KES'} ${booking.amount}</td>
                                    </tr>
                                    ${booking.payment_option === 'deposit' && booking.deposit_paid ? `
                                    <tr>
                                      <td style="padding: 10px 0; font-size: 14px; color: #78350f;">✓ Deposit Paid:</td>
                                      <td style="padding: 10px 0; font-size: 14px; color: #15803d; font-weight: 600; text-align: right;">${booking.currency || 'KES'} ${booking.deposit_paid}</td>
                                    </tr>
                                    ${booking.balance_due ? `
                                    <tr>
                                      <td style="padding: 10px 0; font-size: 14px; color: #78350f;">Balance Due:</td>
                                      <td style="padding: 10px 0; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${booking.currency || 'KES'} ${booking.balance_due}</td>
                                    </tr>
                                    ` : ''}
                                    ` : `
                                    <tr>
                                      <td colspan="2" style="padding: 16px; background-color: #D1FAE5; border-radius: 8px; margin-top: 16px;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                          <tr>
                                            <td style="font-size: 14px; color: #065F46; font-weight: 600;">✓ Fully Paid! Your session is completely paid for. See you there!</td>
                                          </tr>
                                        </table>
                                      </td>
                                    </tr>
                                    `}
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      ${booking.class_type === 'online' ? `
                      <!-- Join Button -->
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 32px 0;">
                        <tr>
                          <td align="center">
                            <a href="${finalMeetingLink}" style="display: inline-block; background-color: #D95436; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 10px; font-size: 16px; font-weight: 600;">Join Online Session</a>
                          </td>
                        </tr>
                        <tr>
                          <td align="center" style="padding-top: 12px; font-size: 13px; color: #666666;">Click the button above to join your session at the scheduled time</td>
                        </tr>
                      </table>
                      ${classroomLink ? `
                      <!-- Google Classroom -->
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0;">
                        <tr>
                          <td align="center">
                            <a href="${classroomLink}" style="display: inline-block; background-color: #ffffff; color: #1967D2; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600; border: 2px solid #1967D2;">📚 Access Google Classroom</a>
                          </td>
                        </tr>
                        <tr>
                          <td align="center" style="padding-top: 8px; font-size: 13px; color: #666666;">Your tutor will share materials, assignments, and track your progress here</td>
                        </tr>
                      </table>
                      ` : ''}
                      ` : `
                      <!-- Physical Location -->
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #EDE9FE; border-radius: 12px; margin: 24px 0;">
                        <tr>
                          <td style="padding: 24px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                              <tr>
                                <td style="padding-bottom: 12px; font-size: 18px; font-weight: 600; color: #7C3AED;">📍 Physical Session Location</td>
                              </tr>
                              <tr>
                                <td style="font-size: 14px; line-height: 1.6; color: #5B21B6;">This is a physical session. Your tutor will contact you shortly to confirm the meeting location and any additional details.</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      `}
                      
                      <!-- Reschedule Button -->
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0;">
                        <tr>
                          <td align="center">
                            <a href="mailto:info@lanatutors.africa?subject=Reschedule Request - ${booking.subject} on ${formattedDate}&body=Hi Lana Tutors Team,%0D%0A%0D%0AI would like to reschedule my ${booking.subject} session currently scheduled for ${formattedDate} at ${formattedTime}.%0D%0A%0D%0ABooking ID: ${bookingId}%0D%0A%0D%0APlease let me know available alternative times.%0D%0A%0D%0AThank you!" style="display: inline-block; background-color: #ffffff; color: #D95436; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600; border: 2px solid #D95436;">Need to Reschedule?</a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Help -->
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e5;">
                        <tr>
                          <td style="font-size: 13px; line-height: 1.6; color: #666666;">If you have any questions, please contact us at <a href="mailto:info@lanatutors.africa" style="color: #D95436; text-decoration: none;">info@lanatutors.africa</a></td>
                        </tr>
                      </table>
                      
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9f9f9; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e5e5;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td align="center" style="padding-bottom: 4px; font-size: 14px; font-weight: 600; color: #D95436;">Lana Tutors</td>
                        </tr>
                        <tr>
                          <td align="center" style="font-size: 12px; color: #999999;">Supporting your learning journey, one session at a time.</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const studentEmailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: 'Lana Tutors <info@lanatutors.africa>',
          to: [studentEmail || ''],
          subject: 'Booking Confirmation - Lana Tutors',
          html: studentEmailHtml,
        }),
      });

      if (!studentEmailResponse.ok) {
        const errorText = await studentEmailResponse.text();
        console.error('Resend API error for student email:', errorText);
        throw new Error(`Resend failed: ${errorText}`);
      }

      const studentEmailResult = await studentEmailResponse.json();
      console.log('✓ Student email sent successfully:', studentEmailResult);
    }

    // Send to tutor
    if (recipientType === 'tutor' || recipientType === 'both') {
      console.log(`Attempting to send email to tutor: ${tutorProfile?.email}`);
      
      if (!tutorProfile?.email) {
        console.error('Tutor email not found - cannot send confirmation');
        throw new Error('Tutor email not found');
      }
      
      const tutorEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; max-width: 600px;">
                  
                  <!-- Header -->
                  <tr>
                    <td align="center" style="background-color: #D95436; padding: 40px 30px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td align="center" style="font-size: 32px; color: #ffffff; padding-bottom: 8px;">🔔</td>
                        </tr>
                        <tr>
                          <td align="center" style="font-size: 32px; font-weight: 600; color: #ffffff; letter-spacing: -0.5px;">New Booking!</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 30px;">
                      
                      <!-- Greeting -->
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td style="padding-bottom: 8px; font-size: 18px; font-weight: 600; color: #1a1a1a;">Dear Tutor,</td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 20px; font-size: 15px; line-height: 1.6; color: #4a4a4a;">Great news! You have a new tutoring session booked. Here are the details:</td>
                        </tr>
                      </table>
                      
                      <!-- Session Details -->
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FFF5F5; border-radius: 12px; margin: 24px 0;">
                        <tr>
                          <td style="padding: 24px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                              <tr>
                                <td style="padding-bottom: 16px; font-size: 18px; font-weight: 600; color: #D95436;">📚 Session Details</td>
                              </tr>
                              <tr>
                                <td>
                                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                    <tr>
                                      <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #666666; width: 40%;">Student:</td>
                                      <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${studentProfile?.full_name || 'Student'}</td>
                                    </tr>
                                    <tr>
                                      <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #666666;">Subject:</td>
                                      <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${booking.subject}</td>
                                    </tr>
                                    <tr>
                                      <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #666666;">Date & Time:</td>
                                      <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${formattedDate} at ${formattedTime}</td>
                                    </tr>
                                    <tr>
                                      <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #666666;">Duration:</td>
                                      <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">1 hour</td>
                                    </tr>
                                    <tr>
                                      <td style="padding: 10px 0; font-size: 14px; color: #666666;">Class Type:</td>
                                      <td style="padding: 10px 0; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${booking.class_type === 'physical' ? '📍 Physical' : '💻 Online'}</td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      ${booking.class_type === 'online' ? `
                      <!-- Join Button -->
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 32px 0;">
                        <tr>
                          <td align="center">
                            <a href="${finalMeetingLink}" style="display: inline-block; background-color: #D95436; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 10px; font-size: 16px; font-weight: 600;">Join Online Session</a>
                          </td>
                        </tr>
                        <tr>
                          <td align="center" style="padding-top: 12px; font-size: 13px; color: #666666;">Use this link to start the session at the scheduled time</td>
                        </tr>
                      </table>
                      ${classroomLink ? `
                      <!-- Google Classroom -->
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0;">
                        <tr>
                          <td align="center">
                            <a href="${classroomLink}" style="display: inline-block; background-color: #ffffff; color: #1967D2; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600; border: 2px solid #1967D2;">📚 Manage Classroom</a>
                          </td>
                        </tr>
                        <tr>
                          <td align="center" style="padding-top: 8px; font-size: 13px; color: #666666;">Share materials, create assignments, and track student progress</td>
                        </tr>
                      </table>
                      ` : ''}
                      ` : `
                      <!-- Physical Session Info -->
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #DBEAFE; border-radius: 12px; margin: 24px 0;">
                        <tr>
                          <td style="padding: 20px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                              <tr>
                                <td style="padding-bottom: 8px; font-size: 14px; font-weight: 600; color: #1E40AF;">📍 Physical Session</td>
                              </tr>
                              <tr>
                                <td style="font-size: 13px; line-height: 1.6; color: #1E3A8A;">Please contact the student/parent to confirm the meeting location and any additional details for this in-person session.</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      `}
                      
                      <!-- Preparation Tips -->
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F0FDF4; border-radius: 12px; margin: 24px 0;">
                        <tr>
                          <td style="padding: 20px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                              <tr>
                                <td style="padding-bottom: 12px; font-size: 14px; font-weight: 600; color: #15803D;">💡 Preparation Tips</td>
                              </tr>
                              <tr>
                                <td style="font-size: 13px; line-height: 1.8; color: #166534;">
                                  • Review the subject material before the session<br>
                                  • Test your internet connection and equipment (for online sessions)<br>
                                  • Be ready 5 minutes before the scheduled time<br>
                                  • Bring any teaching materials or resources you'll need
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Help -->
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e5;">
                        <tr>
                          <td style="font-size: 13px; line-height: 1.6; color: #666666;">If you need to reschedule or have any questions, please contact us at <a href="mailto:info@lanatutors.africa" style="color: #D95436; text-decoration: none;">info@lanatutors.africa</a></td>
                        </tr>
                      </table>
                      
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9f9f9; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e5e5;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td align="center" style="padding-bottom: 4px; font-size: 14px; font-weight: 600; color: #D95436;">Lana Tutors</td>
                        </tr>
                        <tr>
                          <td align="center" style="font-size: 12px; color: #999999;">Thank you for being part of our tutoring community!</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const tutorEmailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: 'Lana Tutors <info@lanatutors.africa>',
          to: [tutorProfile?.email || ''],
          subject: 'New Booking - Lana Tutors',
          html: tutorEmailHtml,
        }),
      });

      if (!tutorEmailResponse.ok) {
        const errorText = await tutorEmailResponse.text();
        console.error('Resend API error for tutor email:', errorText);
        throw new Error(`Resend failed: ${errorText}`);
      }

      const tutorEmailResult = await tutorEmailResponse.json();
      console.log('✓ Tutor email sent successfully:', tutorEmailResult);
    }

    return new Response(
      JSON.stringify({ success: true }), 
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
