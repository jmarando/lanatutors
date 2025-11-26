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
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; }
            .header { background-color: #D95436; color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .checkmark { font-size: 24px; margin-right: 8px; }
            .content { padding: 30px; }
            .greeting { color: #333333; font-size: 16px; margin-bottom: 20px; }
            .section { background-color: #FFF5F5; border-left: 4px solid #D95436; padding: 20px; margin: 20px 0; border-radius: 4px; }
            .section-title { color: #D95436; font-size: 18px; font-weight: 600; margin: 0 0 15px 0; display: flex; align-items: center; }
            .section-icon { margin-right: 8px; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #FEE; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { color: #666666; font-size: 14px; }
            .detail-value { color: #333333; font-size: 14px; font-weight: 500; }
            .payment-section { background-color: #FFFBEB; border-left: 4px solid: #F59E0B; padding: 20px; margin: 20px 0; border-radius: 4px; }
            .payment-title { color: #F59E0B; font-size: 18px; font-weight: 600; margin: 0 0 15px 0; }
            .meeting-button { display: inline-block; background-color: #D95436; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
            .footer { padding: 20px 30px; background-color: #f9f9f9; color: #666666; font-size: 12px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1><span class="checkmark">✓</span> Booking Confirmed!</h1>
            </div>
            <div class="content">
              <p class="greeting">Hi ${studentProfile?.full_name || 'Parent'},</p>
              <p>Great news! Your tutoring session has been successfully booked and confirmed. We're excited to support your learning journey! 🎓</p>
              
              <div class="section">
                <h2 class="section-title"><span class="section-icon">📚</span> Session Details</h2>
                <div class="detail-row">
                  <span class="detail-label">Subject:</span>
                  <span class="detail-value">${booking.subject}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Tutor:</span>
                  <span class="detail-value">${tutorProfile?.email?.split('@')[0] || 'Your Tutor'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Date & Time:</span>
                  <span class="detail-value">${formattedDate} at ${formattedTime}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Duration:</span>
                  <span class="detail-value">1 hour</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Class Type:</span>
                  <span class="detail-value">${booking.class_type === 'physical' ? '📍 Physical' : '💻 Online'}</span>
                </div>
              </div>

              <div class="payment-section">
                <h2 class="payment-title">💰 Payment Summary</h2>
                <div class="detail-row">
                  <span class="detail-label">Total Amount:</span>
                  <span class="detail-value">${booking.currency || 'KES'} ${booking.amount}</span>
                </div>
                ${booking.payment_option === 'deposit' && booking.deposit_paid ? `
                <div class="detail-row">
                  <span class="detail-label">✓ Deposit Paid:</span>
                  <span class="detail-value">${booking.currency || 'KES'} ${booking.deposit_paid}</span>
                </div>
                ${booking.balance_due ? `
                <div class="detail-row">
                  <span class="detail-label">Balance Due:</span>
                  <span class="detail-value">${booking.currency || 'KES'} ${booking.balance_due}</span>
                </div>
                ` : ''}
                ` : `
                <div style="background-color: #D1FAE5; padding: 12px; border-radius: 4px; margin-top: 10px; border-left: 3px solid #10B981;">
                  <span style="color: #065F46; font-weight: 600;">✓ Fully Paid!</span> Your session is completely paid for. See you there!
                </div>
                `}
              </div>

              ${booking.class_type === 'online' ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${finalMeetingLink}" class="meeting-button">Join Online Session</a>
                <p style="color: #666666; font-size: 14px; margin-top: 10px;">Click the button above to join your session at the scheduled time</p>
              </div>
              ` : `
              <div style="background-color: #EDE9FE; border-left: 4px solid: #8B5CF6; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h2 style="color: #8B5CF6; font-size: 18px; font-weight: 600; margin: 0 0 10px 0;">📍 Physical Session Location</h2>
                <p style="color: #666666; font-size: 14px; margin: 0;">This is a physical session. Your tutor will contact you shortly to confirm the meeting location and any additional details.</p>
              </div>
              `}

              <p style="color: #666666; font-size: 14px; margin-top: 30px;">If you have any questions or need to reschedule, please contact us at <a href="mailto:info@lanatutors.africa" style="color: #D95436;">info@lanatutors.africa</a></p>
            </div>
            <div class="footer">
              <p style="margin: 0 0 5px 0; font-weight: 600; color: #D95436;">Lana Tutors</p>
              <p style="margin: 0;">Supporting your learning journey, one session at a time.</p>
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
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; }
            .header { background-color: #D95436; color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .bell-icon { font-size: 24px; margin-right: 8px; }
            .content { padding: 30px; }
            .greeting { color: #333333; font-size: 16px; margin-bottom: 20px; }
            .section { background-color: #FFF5F5; border-left: 4px solid #D95436; padding: 20px; margin: 20px 0; border-radius: 4px; }
            .section-title { color: #D95436; font-size: 18px; font-weight: 600; margin: 0 0 15px 0; display: flex; align-items: center; }
            .section-icon { margin-right: 8px; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #FEE; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { color: #666666; font-size: 14px; }
            .detail-value { color: #333333; font-size: 14px; font-weight: 500; }
            .meeting-button { display: inline-block; background-color: #D95436; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
            .footer { padding: 20px 30px; background-color: #f9f9f9; color: #666666; font-size: 12px; text-align: center; }
            .highlight-box { background-color: #DBEAFE; border-left: 4px solid #3B82F6; padding: 15px; border-radius: 4px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1><span class="bell-icon">🔔</span> New Booking!</h1>
            </div>
            <div class="content">
              <p class="greeting">Dear Tutor,</p>
              <p>Great news! You have a new tutoring session booked. Here are the details:</p>
              
              <div class="section">
                <h2 class="section-title"><span class="section-icon">📚</span> Session Details</h2>
                <div class="detail-row">
                  <span class="detail-label">Student:</span>
                  <span class="detail-value">${studentProfile?.full_name || 'Student'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Subject:</span>
                  <span class="detail-value">${booking.subject}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Date & Time:</span>
                  <span class="detail-value">${formattedDate} at ${formattedTime}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Duration:</span>
                  <span class="detail-value">1 hour</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Class Type:</span>
                  <span class="detail-value">${booking.class_type === 'physical' ? '📍 Physical' : '💻 Online'}</span>
                </div>
              </div>

              ${booking.class_type === 'online' ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${finalMeetingLink}" class="meeting-button">Join Online Session</a>
                <p style="color: #666666; font-size: 14px; margin-top: 10px;">Use this link to start the session at the scheduled time</p>
              </div>
              ` : `
              <div class="highlight-box">
                <p style="color: #1E40AF; font-weight: 600; margin: 0 0 8px 0;">📍 Physical Session</p>
                <p style="color: #666666; font-size: 14px; margin: 0;">Please contact the student/parent to confirm the meeting location and any additional details for this in-person session.</p>
              </div>
              `}

              <div class="highlight-box">
                <p style="color: #1E40AF; font-weight: 600; margin: 0 0 8px 0;">💡 Preparation Tips</p>
                <p style="color: #666666; font-size: 14px; margin: 0;">• Review the subject material before the session<br>• Test your internet connection and equipment (for online sessions)<br>• Be ready 5 minutes before the scheduled time<br>• Bring any teaching materials or resources you'll need</p>
              </div>

              <p style="color: #666666; font-size: 14px; margin-top: 30px;">If you need to reschedule or have any questions, please contact us at <a href="mailto:info@lanatutors.africa" style="color: #D95436;">info@lanatutors.africa</a></p>
            </div>
            <div class="footer">
              <p style="margin: 0 0 5px 0; font-weight: 600; color: #D95436;">Lana Tutors</p>
              <p style="margin: 0;">Thank you for being part of our tutoring community!</p>
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
