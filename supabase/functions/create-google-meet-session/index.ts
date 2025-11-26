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

    // Get central calendar OAuth tokens from config table
    const { data: centralConfig, error: configError } = await supabaseClient
      .from('central_calendar_config')
      .select('google_oauth_token, google_refresh_token, google_token_expires_at')
      .eq('id', 'central-calendar')
      .maybeSingle();

    if (configError) {
      console.error('Error fetching central calendar config:', configError);
      throw new Error('Error fetching central calendar configuration');
    }

    if (!centralConfig || !centralConfig.google_oauth_token) {
      console.log('Central calendar not configured, skipping Google Meet creation');
      return new Response(
        JSON.stringify({ message: 'Central calendar not set up yet, please configure it first' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let accessToken = centralConfig.google_oauth_token;

    // Check if token is expired and refresh if needed
    if (centralConfig.google_token_expires_at) {
      const expiresAt = new Date(centralConfig.google_token_expires_at);
      if (expiresAt <= new Date()) {
        console.log('Central calendar token expired, refreshing...');
        
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
            client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
            refresh_token: centralConfig.google_refresh_token!,
            grant_type: 'refresh_token',
          }),
        });

        if (!refreshResponse.ok) {
          const error = await refreshResponse.text();
          console.error('Token refresh failed:', error);
          // Don't break the booking flow – just skip Meet creation
          return new Response(
            JSON.stringify({ message: 'calendar_token_refresh_failed' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const tokens = await refreshResponse.json();
        accessToken = tokens.access_token;

        // Update stored token
        const newExpiresAt = new Date(Date.now() + (tokens.expires_in * 1000));
        await supabaseClient
          .from('central_calendar_config')
          .update({
            google_oauth_token: accessToken,
            google_token_expires_at: newExpiresAt.toISOString(),
          })
          .eq('id', 'central-calendar');
          
        console.log('Central calendar token refreshed successfully');
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
      // Don't fail the whole request – return a soft error
      return new Response(
        JSON.stringify({ message: 'calendar_event_creation_failed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
