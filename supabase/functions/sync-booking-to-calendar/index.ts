import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingCalendarRequest {
  bookingId: string;
  tutorId: string;
  studentName: string;
  subject: string;
  startTime: string;
  endTime: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { bookingId, tutorId, studentName, subject, startTime, endTime } = 
      await req.json() as BookingCalendarRequest;

    console.log('Syncing booking to calendar:', { bookingId, tutorId });

    // Get tutor's Google Calendar credentials
    const { data: tutorProfile, error: tutorError } = await supabaseClient
      .from('tutor_profiles')
      .select('google_oauth_token, google_refresh_token, google_calendar_email')
      .eq('user_id', tutorId)
      .single();

    if (tutorError || !tutorProfile) {
      console.error('Tutor not found:', tutorError);
      return new Response(
        JSON.stringify({ error: 'Tutor not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (!tutorProfile.google_oauth_token || !tutorProfile.google_calendar_email) {
      console.log('Tutor has not connected Google Calendar');
      return new Response(
        JSON.stringify({ message: 'Tutor has not connected Google Calendar' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Create Google Calendar event
    const event = {
      summary: `Tutoring Session: ${subject}`,
      description: `Tutoring session with ${studentName}\nSubject: ${subject}\nBooking ID: ${bookingId}`,
      start: {
        dateTime: startTime,
        timeZone: 'Africa/Nairobi',
      },
      end: {
        dateTime: endTime,
        timeZone: 'Africa/Nairobi',
      },
      attendees: [
        { email: tutorProfile.google_calendar_email }
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };

    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tutorProfile.google_oauth_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!calendarResponse.ok) {
      const errorData = await calendarResponse.text();
      console.error('Google Calendar API error:', errorData);
      
      // If token expired, try to refresh
      if (calendarResponse.status === 401 && tutorProfile.google_refresh_token) {
        console.log('Access token expired, attempting refresh...');
        // In production, you'd implement token refresh here
        throw new Error('Token refresh needed');
      }
      
      throw new Error('Failed to create calendar event');
    }

    const calendarEvent = await calendarResponse.json();
    console.log('Calendar event created:', calendarEvent.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        eventId: calendarEvent.id,
        message: 'Booking synced to Google Calendar'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error syncing booking to calendar:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
