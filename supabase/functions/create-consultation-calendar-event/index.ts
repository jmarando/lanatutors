import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CalendarEventRequest {
  parentName: string;
  studentName: string;
  email: string;
  phoneNumber: string;
  consultationDate: string;
  consultationTime: string;
  subjects: string[];
  gradeLevel: string;
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { parentName, studentName, email, phoneNumber, consultationDate, consultationTime, subjects, gradeLevel, notes }: CalendarEventRequest = await req.json();

    const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    const impersonateEmail = Deno.env.get("GOOGLE_IMPERSONATE_EMAIL") || "info@lanatutors.africa";
    
    if (!serviceAccountJson) {
      throw new Error("Google service account credentials not found");
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    
    // Create JWT for Google API authentication with impersonation
    const now = Math.floor(Date.now() / 1000);
    const jwtHeader = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const jwtClaimSet = btoa(JSON.stringify({
      iss: serviceAccount.client_email,
      sub: impersonateEmail, // Impersonate the calendar owner
      scope: "https://www.googleapis.com/auth/calendar",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }));

    // Create start and end times
    const startDateTime = new Date(`${consultationDate}T${consultationTime.replace(' AM', ':00').replace(' PM', ':00')}`);
    const endDateTime = new Date(startDateTime.getTime() + 30 * 60000); // 30 minutes

    // Get access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: `${jwtHeader}.${jwtClaimSet}`,
      }),
    });

    const { access_token } = await tokenResponse.json();

    // Create calendar event
    const eventDescription = `
Free Consultation
Parent: ${parentName}
Student: ${studentName}
Email: ${email}
Phone: ${phoneNumber}
Grade Level: ${gradeLevel}
Subjects: ${subjects.join(', ')}
${notes ? `Notes: ${notes}` : ''}
    `.trim();

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
        { email: email },
        { email: impersonateEmail },
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
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(impersonateEmail)}/events?conferenceDataVersion=1`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(calendarEvent),
      }
    );

    const result = await calendarResponse.json();
    
    console.log("Calendar event created successfully:", result.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        eventId: result.id,
        meetingLink: result.hangoutLink || result.conferenceData?.entryPoints?.[0]?.uri || "https://meet.google.com/pending"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error creating calendar event:", error);
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
