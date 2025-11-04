import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { create } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MeetRequest {
  summary: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  attendeeEmail?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { summary, description, startDateTime, endDateTime, attendeeEmail }: MeetRequest = await req.json();
    
    console.log("Creating Google Meet event:", { summary, startDateTime, endDateTime });

    const googleServiceAccount = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!googleServiceAccount) {
      throw new Error("Google service account not configured");
    }

    const serviceAccount = JSON.parse(googleServiceAccount);

    // Create JWT for Google API
    const now = Math.floor(Date.now() / 1000);
    const jwt = await create(
      { alg: "RS256", typ: "JWT" },
      {
        iss: serviceAccount.client_email,
        scope: "https://www.googleapis.com/auth/calendar",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now,
      },
      await crypto.subtle.importKey(
        "pkcs8",
        new TextEncoder().encode(serviceAccount.private_key),
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
      )
    );

    // Exchange JWT for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token error:", errorData);
      throw new Error("Failed to get access token");
    }

    const { access_token } = await tokenResponse.json();

    // Create calendar event with Google Meet
    const event = {
      summary,
      description: description || "",
      start: {
        dateTime: startDateTime,
        timeZone: "Africa/Nairobi",
      },
      end: {
        dateTime: endDateTime,
        timeZone: "Africa/Nairobi",
      },
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
      attendees: attendeeEmail ? [{ email: attendeeEmail }] : [],
    };

    const calendarResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!calendarResponse.ok) {
      const error = await calendarResponse.text();
      console.error("Calendar API error:", error);
      throw new Error("Failed to create calendar event");
    }

    const calendarEvent = await calendarResponse.json();
    const meetingLink = calendarEvent.hangoutLink;

    console.log("Google Meet link created:", meetingLink);

    return new Response(
      JSON.stringify({
        success: true,
        meetingLink,
        eventId: calendarEvent.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error generating Google Meet link:", error);
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
