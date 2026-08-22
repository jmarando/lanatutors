import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { create } from "https://deno.land/x/djwt@v2.8/mod.ts";
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

    // Service-account access token (fallback / primary when OAuth tokens are stale)
    const getServiceAccountToken = async (): Promise<string | null> => {
      try {
        const raw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
        if (!raw) {
          console.log('GOOGLE_SERVICE_ACCOUNT_JSON not set');
          return null;
        }
        const serviceAccount = JSON.parse(raw);

        const pemToArrayBuffer = (pem: string): ArrayBuffer => {
          const b64 = pem
            .replace(/-----BEGIN PRIVATE KEY-----/g, '')
            .replace(/-----END PRIVATE KEY-----/g, '')
            .replace(/\r?\n|\r|\s/g, '');
          const binary = atob(b64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          return bytes.buffer;
        };

        const cryptoKey = await crypto.subtle.importKey(
          'pkcs8',
          pemToArrayBuffer(serviceAccount.private_key),
          { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
          false,
          ['sign'],
        );

        const now = Math.floor(Date.now() / 1000);
        const payload: Record<string, unknown> = {
          iss: serviceAccount.client_email,
          scope: 'https://www.googleapis.com/auth/calendar',
          aud: 'https://oauth2.googleapis.com/token',
          exp: now + 3600,
          iat: now,
        };
        const impersonate = Deno.env.get('GOOGLE_IMPERSONATE_EMAIL');
        if (impersonate) payload.sub = impersonate;

        const jwt = await create({ alg: 'RS256', typ: 'JWT' }, payload, cryptoKey);

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt,
          }),
        });

        if (!tokenResponse.ok) {
          console.error('Service account token error:', await tokenResponse.text());
          return null;
        }
        const { access_token } = await tokenResponse.json();
        return access_token as string;
      } catch (e) {
        console.error('Service account auth failed:', e);
        return null;
      }
    };

    // Get central calendar OAuth tokens from config table
    const { data: centralConfig, error: configError } = await supabaseClient
      .from('central_calendar_config')
      .select('google_oauth_token, google_refresh_token, google_token_expires_at')
      .eq('id', 'central-calendar')
      .maybeSingle();

    if (configError) {
      console.error('Error fetching central calendar config:', configError);
    }

    let accessToken: string | null = centralConfig?.google_oauth_token ?? null;

    // Refresh the OAuth token when expired; fall back to the service account
    if (accessToken && centralConfig?.google_token_expires_at) {
      const expiresAt = new Date(centralConfig.google_token_expires_at);
      if (expiresAt <= new Date()) {
        console.log('Central calendar token expired, refreshing...');
        accessToken = null;

        if (centralConfig.google_refresh_token) {
          const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
              client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
              refresh_token: centralConfig.google_refresh_token,
              grant_type: 'refresh_token',
            }),
          });

          if (refreshResponse.ok) {
            const tokens = await refreshResponse.json();
            accessToken = tokens.access_token;
            await supabaseClient
              .from('central_calendar_config')
              .update({
                google_oauth_token: accessToken,
                google_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
              })
              .eq('id', 'central-calendar');
            console.log('Central calendar token refreshed successfully');
          } else {
            console.error('Token refresh failed:', await refreshResponse.text());
          }
        }
      }
    }

    if (!accessToken) {
      console.log('Falling back to Google service account for Meet creation');
      accessToken = await getServiceAccountToken();
    }

    if (!accessToken) {
      return new Response(
        JSON.stringify({ message: 'google_calendar_unavailable' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    const createEvent = (token: string) =>
      fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

    // Create event in primary calendar
    let calendarResponse = await createEvent(accessToken);

    // If the stored OAuth token is stale/revoked, retry once with the service account
    if (!calendarResponse.ok) {
      console.error('Calendar event creation failed:', await calendarResponse.text());
      const saToken = await getServiceAccountToken();
      if (saToken && saToken !== accessToken) {
        console.log('Retrying calendar event creation with service account');
        calendarResponse = await createEvent(saToken);
      }
    }

    if (!calendarResponse.ok) {
      const error = await calendarResponse.text();
      console.error('Calendar event creation failed (after fallback):', error);
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
