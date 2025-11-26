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

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        student:profiles!student_id(full_name, email),
        tutor:tutor_profiles!tutor_id(email),
        slot:tutor_availability!availability_slot_id(start_time, end_time)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError) throw bookingError;

    const finalMeetingLink = meetingLink || booking.meeting_link || 'Will be shared soon';

    const startTime = new Date(booking.slot.start_time);
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
      const studentEmailHtml = `
        <h1>Booking Confirmation</h1>
        <p>Dear ${booking.student.full_name},</p>
        <p>Your tutoring session has been confirmed!</p>
        <h2>Booking Details:</h2>
        <ul>
          <li><strong>Subject:</strong> ${booking.subject}</li>
          <li><strong>Date:</strong> ${formattedDate}</li>
          <li><strong>Time:</strong> ${formattedTime} EAT</li>
          <li><strong>Type:</strong> ${booking.class_type}</li>
          <li><strong>Amount:</strong> ${booking.currency} ${booking.amount}</li>
          <li><strong>Meeting Link:</strong> <a href="${finalMeetingLink}">${finalMeetingLink}</a></li>
        </ul>
        <p>Click the meeting link above to join your session at the scheduled time.</p>
        <p>Best regards,<br>LANA Tutors Team</p>
      `;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: 'LANA Tutors <bookings@lanatutors.africa>',
          to: [booking.student.email],
          subject: 'Booking Confirmation - LANA Tutors',
          html: studentEmailHtml,
        }),
      });
    }

    // Send to tutor
    if (recipientType === 'tutor' || recipientType === 'both') {
      const tutorEmailHtml = `
        <h1>New Booking Notification</h1>
        <p>Dear Tutor,</p>
        <p>You have a new tutoring session booked!</p>
        <h2>Session Details:</h2>
        <ul>
          <li><strong>Student:</strong> ${booking.student.full_name}</li>
          <li><strong>Subject:</strong> ${booking.subject}</li>
          <li><strong>Date:</strong> ${formattedDate}</li>
          <li><strong>Time:</strong> ${formattedTime} EAT</li>
          <li><strong>Type:</strong> ${booking.class_type}</li>
          <li><strong>Meeting Link:</strong> <a href="${finalMeetingLink}">${finalMeetingLink}</a></li>
        </ul>
        <p>Please prepare for this session and join using the meeting link at the scheduled time.</p>
        <p>Best regards,<br>LANA Tutors Team</p>
      `;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: 'LANA Tutors <bookings@lanatutors.africa>',
          to: [booking.tutor.email],
          subject: 'New Booking - LANA Tutors',
          html: tutorEmailHtml,
        }),
      });
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
