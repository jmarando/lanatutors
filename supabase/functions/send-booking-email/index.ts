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
  recipientType?: 'student' | 'tutor' | 'both';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, meetingLink, recipientType = 'both' }: BookingEmailRequest = await req.json();

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
      console.log(`Sending email to student: ${studentEmail}`);
      
      const studentEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;">
          <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff;">
            
            <!-- Header -->
            <div style="background-color: #D95436; color: #ffffff; padding: 40px 30px; text-align: center;">
              <div style="font-size: 32px; margin-bottom: 8px;">✓</div>
              <h1 style="margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -0.5px;">Booking Confirmed!</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 0 30px 40px 30px;">
              
              <!-- Greeting -->
              <div style="padding: 30px 0 20px 0;">
                <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">Hi ${studentProfile?.full_name || 'Parent'},</p>
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #4a4a4a;">Great news! Your tutoring session has been successfully booked and confirmed. We're excited to support your learning journey! 🎓</p>
              </div>
              
              <!-- Session Details Section -->
              <div style="background: linear-gradient(135deg, #FFF5F5 0%, #FFE8E8 100%); padding: 24px; border-radius: 12px; margin: 24px 0;">
                <div style="display: flex; align-items: center; margin-bottom: 16px;">
                  <span style="font-size: 20px; margin-right: 8px;">📚</span>
                  <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #D95436;">Session Details</h2>
                </div>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #666666; width: 40%;">Subject:</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${booking.subject}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #666666;">Tutor:</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${tutorProfile?.email?.split('@')[0] || 'Your Tutor'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #666666;">Date & Time:</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${formattedDate}<br>${formattedTime}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #666666;">Duration:</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">Until ${slot ? new Date(slot.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' }) : '02:00 PM'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-size: 14px; color: #666666;">Class Type:</td>
                    <td style="padding: 10px 0; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${booking.class_type === 'physical' ? '📍 Physical' : '💻 Online'}</td>
                  </tr>
                </table>
              </div>
              
              <!-- Payment Summary Section -->
              <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 24px; border-radius: 12px; margin: 24px 0;">
                <div style="display: flex; align-items: center; margin-bottom: 16px;">
                  <span style="font-size: 20px; margin-right: 8px;">💰</span>
                  <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #D97706;">Payment Summary</h2>
                </div>
                <table style="width: 100%; border-collapse: collapse;">
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
                  ` : ''}
                </table>
                
                ${booking.payment_option !== 'deposit' ? `
                <div style="background-color: #D1FAE5; border-left: 4px solid #10B981; padding: 16px; border-radius: 8px; margin-top: 16px;">
                  <p style="margin: 0; font-size: 14px; color: #065F46; font-weight: 600;">✓ Fully Paid! Your session is completely paid for. See you there!</p>
                </div>
                ` : ''}
              </div>
              
              ${booking.class_type === 'online' ? `
              <!-- Online Session Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${finalMeetingLink}" style="display: inline-block; background: linear-gradient(135deg, #D95436 0%, #c73420 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(217, 84, 54, 0.4);">Join Online Session</a>
                <p style="margin: 12px 0 0 0; font-size: 13px; color: #666666;">Click the button above to join your session at the scheduled time</p>
              </div>
              ` : `
              <!-- Physical Session Location -->
              <div style="background: linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%); padding: 24px; border-radius: 12px; margin: 24px 0;">
                <div style="display: flex; align-items: center; margin-bottom: 12px;">
                  <span style="font-size: 20px; margin-right: 8px;">📍</span>
                  <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #7C3AED;">Physical Session Location</h2>
                </div>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #5B21B6;">This is a physical session. Your tutor will contact you shortly to confirm the meeting location and any additional details.</p>
              </div>
              `}
              
              <!-- Help Section -->
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e5;">
                <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #666666;">If you have any questions or need to reschedule, please contact us at <a href="mailto:info@lanatutors.africa" style="color: #D95436; text-decoration: none; font-weight: 500;">info@lanatutors.africa</a></p>
              </div>
              
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9f9f9; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #D95436;">Lana Tutors</p>
              <p style="margin: 0; font-size: 12px; color: #999999;">Supporting your learning journey, one session at a time.</p>
            </div>
            
          </div>
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

      const studentEmailResult = await studentEmailResponse.json();
      console.log('Student email result:', studentEmailResult);
    }

    // Send to tutor
    if (recipientType === 'tutor' || recipientType === 'both') {
      console.log(`Sending email to tutor: ${tutorProfile?.email}`);
      
      const tutorEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;">
          <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff;">
            
            <!-- Header -->
            <div style="background-color: #D95436; color: #ffffff; padding: 40px 30px; text-align: center;">
              <div style="font-size: 32px; margin-bottom: 8px;">🔔</div>
              <h1 style="margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -0.5px;">New Booking!</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 0 30px 40px 30px;">
              
              <!-- Greeting -->
              <div style="padding: 30px 0 20px 0;">
                <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">Dear Tutor,</p>
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #4a4a4a;">Great news! You have a new tutoring session booked. Here are the details:</p>
              </div>
              
              <!-- Session Details Section -->
              <div style="background: linear-gradient(135deg, #FFF5F5 0%, #FFE8E8 100%); padding: 24px; border-radius: 12px; margin: 24px 0;">
                <div style="display: flex; align-items: center; margin-bottom: 16px;">
                  <span style="font-size: 20px; margin-right: 8px;">📚</span>
                  <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #D95436;">Session Details</h2>
                </div>
                <table style="width: 100%; border-collapse: collapse;">
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
                    <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${formattedDate}<br>${formattedTime}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #666666;">Duration:</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">Until ${slot ? new Date(slot.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' }) : '02:00 PM'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-size: 14px; color: #666666;">Class Type:</td>
                    <td style="padding: 10px 0; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${booking.class_type === 'physical' ? '📍 Physical' : '💻 Online'}</td>
                  </tr>
                </table>
              </div>
              
              ${booking.class_type === 'online' ? `
              <!-- Online Session Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${finalMeetingLink}" style="display: inline-block; background: linear-gradient(135deg, #D95436 0%, #c73420 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(217, 84, 54, 0.4);">Join Online Session</a>
                <p style="margin: 12px 0 0 0; font-size: 13px; color: #666666;">Use this link to start the session at the scheduled time</p>
              </div>
              ` : `
              <!-- Physical Session Info -->
              <div style="background: linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%); padding: 20px; border-radius: 12px; margin: 24px 0;">
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1E40AF;">📍 Physical Session</p>
                <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #1E3A8A;">Please contact the student/parent to confirm the meeting location and any additional details for this in-person session.</p>
              </div>
              `}
              
              <!-- Preparation Tips -->
              <div style="background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%); padding: 20px; border-radius: 12px; margin: 24px 0;">
                <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #15803D;">💡 Preparation Tips</p>
                <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8; color: #166534;">
                  <li>Review the subject material before the session</li>
                  <li>Test your internet connection and equipment (for online sessions)</li>
                  <li>Be ready 5 minutes before the scheduled time</li>
                  <li>Bring any teaching materials or resources you'll need</li>
                </ul>
              </div>
              
              <!-- Help Section -->
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e5;">
                <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #666666;">If you need to reschedule or have any questions, please contact us at <a href="mailto:info@lanatutors.africa" style="color: #D95436; text-decoration: none; font-weight: 500;">info@lanatutors.africa</a></p>
              </div>
              
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9f9f9; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #D95436;">Lana Tutors</p>
              <p style="margin: 0; font-size: 12px; color: #999999;">Thank you for being part of our tutoring community!</p>
            </div>
            
          </div>
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

      const tutorEmailResult = await tutorEmailResponse.json();
      console.log('Tutor email result:', tutorEmailResult);
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
