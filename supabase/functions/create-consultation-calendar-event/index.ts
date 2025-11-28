import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { create } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CalendarEventRequest {
  parentName: string;
  studentName: string;
  email: string;
  phoneNumber: string;
  consultationDate: string; // e.g. 2025-11-28 (ISO date only)
  consultationTime: string; // e.g. "12:00 PM"
  subjects: string[];
  gradeLevel: string;
  notes?: string;
}

// Helper to convert 12-hour time ("12:00 PM") plus date string into a Date in EAT
function buildStartDateTime(dateStr: string, timeStr: string): Date {
  const [timePart, meridiem] = timeStr.split(" ");
  const [hourStr, minuteStr] = timePart.split(":");

  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10) || 0;

  if (meridiem?.toUpperCase() === "PM" && hour < 12) {
    hour += 12;
  } else if (meridiem?.toUpperCase() === "AM" && hour === 12) {
    hour = 0;
  }

  // Construct a datetime in Africa/Nairobi (UTC+3). We append "+03:00" so
  // Google Calendar interprets it correctly when we also pass the timeZone.
  const hourPadded = hour.toString().padStart(2, "0");
  const minutePadded = minute.toString().padStart(2, "0");

  return new Date(`${dateStr}T${hourPadded}:${minutePadded}:00+03:00`);
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      parentName,
      studentName,
      email,
      phoneNumber,
      consultationDate,
      consultationTime,
      subjects,
      gradeLevel,
      notes,
    }: CalendarEventRequest = await req.json();

    // Use Google service account to create Meet link (same approach as generate-google-meet-link)
    const googleServiceAccount = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!googleServiceAccount) {
      throw new Error("Google service account not configured");
    }

    const serviceAccount = JSON.parse(googleServiceAccount);

    // Create JWT for Google API
    const now = Math.floor(Date.now() / 1000);

    const pemToArrayBuffer = (pem: string): ArrayBuffer => {
      const b64 = pem
        .replace(/-----BEGIN PRIVATE KEY-----/g, "")
        .replace(/-----END PRIVATE KEY-----/g, "")
        .replace(/\r?\n|\r|\s/g, "");
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    };

    const keyData = pemToArrayBuffer(serviceAccount.private_key);
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      keyData,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const payload: Record<string, unknown> = {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/calendar",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    };

    const impersonate = Deno.env.get("GOOGLE_IMPERSONATE_EMAIL");
    if (impersonate) {
      (payload as any).sub = impersonate;
    }

    const jwt = await create(
      { alg: "RS256", typ: "JWT" },
      payload,
      cryptoKey,
    );

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
      console.error("Token error (consultation):", errorData);
      throw new Error("Failed to get access token for consultation event");
    }

    const { access_token } = await tokenResponse.json();

    const startDateTime = buildStartDateTime(consultationDate, consultationTime);
    const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000); // 30 minutes

    const eventDescription = [
      "Free Consultation",
      `Parent: ${parentName}`,
      `Student: ${studentName}`,
      `Email: ${email}`,
      `Phone: ${phoneNumber}`,
      `Grade Level: ${gradeLevel}`,
      `Subjects: ${subjects.join(", ")}`,
      notes ? `Notes: ${notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const calendarEvent = {
      summary: `Consultation - ${studentName}`,
      description: eventDescription,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: "Africa/Nairobi",
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: "Africa/Nairobi",
      },
      attendees: [
        { email },
        { email: "info@lanatutors.africa" },
      ],
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 }, // 1 day before
          { method: "email", minutes: 60 }, // 1 hour before
        ],
      },
    };

    const calendarResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(calendarEvent),
      },
    );

    if (!calendarResponse.ok) {
      const errorText = await calendarResponse.text();
      console.error("Calendar event creation failed for consultation:", errorText);
      return new Response(
        JSON.stringify({
          success: false,
          message: "calendar_event_creation_failed",
          meetingLink: "https://meet.google.com/pending",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const event = await calendarResponse.json();
    const meetingLink =
      event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri || "https://meet.google.com/pending";

    console.log("Consultation calendar event created:", event.id, "link:", meetingLink);

    return new Response(
      JSON.stringify({ success: true, eventId: event.id, meetingLink }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Error creating consultation calendar event:", error);
    return new Response(
      JSON.stringify({ error: error.message ?? "unknown_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
};

serve(handler);
