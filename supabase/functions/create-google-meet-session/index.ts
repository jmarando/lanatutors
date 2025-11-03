import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingRequest {
  bookingId: string;
  tutorEmail: string;
  studentEmail: string;
  studentName: string;
  tutorName: string;
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

    const { bookingId, tutorEmail, studentEmail, studentName, tutorName, subject, startTime, endTime }: BookingRequest = await req.json();

    console.log('Creating Google Meet session for booking:', bookingId);

    // Get the booking to find tutor_id
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select('tutor_id')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error('Booking not found');
    }

    // Get tutor's OAuth token
    const { data: tutorProfile, error: profileError } = await supabaseClient
      .from('tutor_profiles')
      .select('google_oauth_token, google_refresh_token, google_token_expires_at')
      .eq('id', booking.tutor_id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching tutor profile:', profileError);
      throw new Error('Error fetching tutor profile');
    }

    if (!tutorProfile) {
      console.log('Tutor profile not found, skipping Google Meet creation');
      return new Response(
        JSON.stringify({ message: 'Tutor has not set up profile yet, Google Meet link will be added later' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tutorProfile.google_oauth_token) {
      console.log('Tutor has not connected Google Calendar, skipping Google Meet creation');
      return new Response(
        JSON.stringify({ message: 'Tutor has not connected Google Calendar, meeting link will be added later' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let accessToken = tutorProfile.google_oauth_token;

    // Check if token is expired and refresh if needed
    if (tutorProfile.google_token_expires_at) {
      const expiresAt = new Date(tutorProfile.google_token_expires_at);
      if (expiresAt <= new Date()) {
        console.log('Token expired, refreshing...');
        
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
            client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
            refresh_token: tutorProfile.google_refresh_token!,
            grant_type: 'refresh_token',
          }),
        });

        if (!refreshResponse.ok) {
          const error = await refreshResponse.text();
          console.error('Token refresh failed:', error);
          throw new Error('Failed to refresh access token');
        }

        const tokens = await refreshResponse.json();
        accessToken = tokens.access_token;

        // Update stored token
        const newExpiresAt = new Date(Date.now() + (tokens.expires_in * 1000));
        await supabaseClient
          .from('tutor_profiles')
          .update({
            google_oauth_token: accessToken,
            google_token_expires_at: newExpiresAt.toISOString(),
          })
          .eq('id', booking.tutor_id);
          
        console.log('Token refreshed successfully');
      }
    }

    // Create calendar event with Google Meet
    const event = {
      summary: `Tutoring Session: ${subject}`,
      description: `Tutoring session between ${tutorName} (Tutor) and ${studentName} (Student)\n\nSubject: ${subject}`,
      start: {
        dateTime: startTime,
        timeZone: 'Africa/Nairobi',
      },
      end: {
        dateTime: endTime,
        timeZone: 'Africa/Nairobi',
      },
      attendees: [
        { email: tutorEmail },
        { email: studentEmail },
        { email: 'info@lanatutors.africa' },
      ],
      conferenceData: {
        createRequest: {
          requestId: `booking-${bookingId}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };

    // Create event in primary calendar
    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!calendarResponse.ok) {
      const error = await calendarResponse.text();
      console.error('Calendar event creation failed:', error);
      throw new Error('Failed to create calendar event');
    }

    const calendarEvent = await calendarResponse.json();
    const meetLink = calendarEvent.hangoutLink || calendarEvent.conferenceData?.entryPoints?.[0]?.uri;

    console.log('Calendar event created with Meet link:', meetLink);

    // Update booking with meeting link
    const { error: updateError } = await supabaseClient
      .from('bookings')
      .update({ meeting_link: meetLink })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Failed to update booking with meet link:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ meetLink, eventId: calendarEvent.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-google-meet-session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
