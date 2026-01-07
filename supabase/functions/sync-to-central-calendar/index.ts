import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CalendarSyncRequest {
  bookingId: string;
  summary: string;
  description: string;
  startTime: string;
  endTime: string;
}

async function getAccessToken(): Promise<string> {
  const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
  if (!serviceAccountJson) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
  }

  const serviceAccount = JSON.parse(serviceAccountJson);
  
  // Create JWT for Google OAuth
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    sub: 'info@lanatutors.africa', // The central calendar email
  };

  // Import the private key
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  let pemContents = serviceAccount.private_key.replace(pemHeader, '').replace(pemFooter, '');
  pemContents = pemContents.replace(/\s/g, '');
  
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const jwt = await create({ alg: 'RS256', typ: 'JWT' }, payload, cryptoKey);

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    console.error('Token exchange error:', error);
    throw new Error('Failed to get access token');
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, summary, description, startTime, endTime } = 
      await req.json() as CalendarSyncRequest;

    console.log('Syncing to central calendar:', { bookingId, summary, startTime, endTime });

    // Get access token
    const accessToken = await getAccessToken();

    // Create calendar event
    const event = {
      summary,
      description,
      start: {
        dateTime: startTime,
        timeZone: 'Africa/Nairobi',
      },
      end: {
        dateTime: endTime,
        timeZone: 'Africa/Nairobi',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 },
        ],
      },
    };

    const calendarResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/info@lanatutors.africa/events',
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
      const errorText = await calendarResponse.text();
      console.error('Google Calendar API error:', errorText);
      throw new Error('Failed to create calendar event');
    }

    const calendarEvent = await calendarResponse.json();
    console.log('Calendar event created:', calendarEvent.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        eventId: calendarEvent.id,
        message: 'Booking added to Lana calendar'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error syncing to calendar:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
