import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch central calendar OAuth tokens
    const { data: centralConfig, error: configError } = await supabaseClient
      .from("central_calendar_config")
      .select("google_oauth_token, google_refresh_token, google_token_expires_at")
      .eq("id", "central-calendar")
      .maybeSingle();

    if (configError) {
      console.error("Error fetching central calendar config:", configError);
      return new Response(
        JSON.stringify({ error: "central_calendar_config_error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!centralConfig || !centralConfig.google_oauth_token) {
      console.log("Central calendar not configured, cannot create Meet link");
      return new Response(
        JSON.stringify({
          success: false,
          message: "central_calendar_not_configured",
          meetingLink: "https://meet.google.com/pending",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let accessToken = centralConfig.google_oauth_token as string;

    // Refresh token if expired
    if (centralConfig.google_token_expires_at) {
      const expiresAt = new Date(centralConfig.google_token_expires_at as string);
      if (expiresAt <= new Date()) {
        console.log("Central calendar token expired, refreshing...");

        const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
            client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
            refresh_token: centralConfig.google_refresh_token!,
            grant_type: "refresh_token",
          }),
        });

        if (!refreshResponse.ok) {
          const errorText = await refreshResponse.text();
          console.error("Token refresh failed for consultations:", errorText);
          return new Response(
            JSON.stringify({
              success: false,
              message: "calendar_token_refresh_failed",
              meetingLink: "https://meet.google.com/pending",
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const tokens = await refreshResponse.json();
        accessToken = tokens.access_token;

        const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
        await supabaseClient
          .from("central_calendar_config")
          .update({
            google_oauth_token: accessToken,
            google_token_expires_at: newExpiresAt.toISOString(),
          })
          .eq("id", "central-calendar");

        console.log("Central calendar token refreshed successfully for consultations");
      }
    }

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
          Authorization: `Bearer ${accessToken}`,
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
