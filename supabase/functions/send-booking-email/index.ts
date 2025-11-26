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
        <h1>Booking Confirmation</h1>
        <p>Dear ${studentProfile?.full_name || 'Parent'},</p>
        <p>Your tutoring session has been confirmed!</p>
        <h2>Booking Details:</h2>
        <ul>
          <li><strong>Subject:</strong> ${booking.subject}</li>
          <li><strong>Date:</strong> ${formattedDate}</li>
          <li><strong>Time:</strong> ${formattedTime} EAT</li>
          <li><strong>Type:</strong> ${booking.class_type}</li>
          <li><strong>Amount:</strong> ${booking.currency || 'KES'} ${booking.amount}</li>
          <li><strong>Meeting Link:</strong> <a href="${finalMeetingLink}">${finalMeetingLink}</a></li>
        </ul>
        <p>Click the meeting link above to join your session at the scheduled time.</p>
        <p>Best regards,<br>LANA Tutors Team</p>
      `;

      const studentEmailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: 'LANA Tutors <info@lanatutors.africa>',
          to: [studentEmail || ''],
          subject: 'Booking Confirmation - LANA Tutors',
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
        <h1>New Booking Notification</h1>
        <p>Dear Tutor,</p>
        <p>You have a new tutoring session booked!</p>
        <h2>Session Details:</h2>
        <ul>
          <li><strong>Student:</strong> ${studentProfile?.full_name || 'Student'}</li>
          <li><strong>Subject:</strong> ${booking.subject}</li>
          <li><strong>Date:</strong> ${formattedDate}</li>
          <li><strong>Time:</strong> ${formattedTime} EAT</li>
          <li><strong>Type:</strong> ${booking.class_type}</li>
          <li><strong>Meeting Link:</strong> <a href="${finalMeetingLink}">${finalMeetingLink}</a></li>
        </ul>
        <p>Please prepare for this session and join using the meeting link at the scheduled time.</p>
        <p>Best regards,<br>LANA Tutors Team</p>
      `;

      const tutorEmailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: 'LANA Tutors <info@lanatutors.africa>',
          to: [tutorProfile?.email || ''],
          subject: 'New Booking - LANA Tutors',
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
