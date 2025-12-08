import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Time slots for December Holiday Bootcamp (Africa/Nairobi)
const TIME_SLOT_MAP: Record<string, { start: string; end: string }> = {
  "8:00 AM - 9:15 AM": { start: "08:00", end: "09:15" },
  "9:30 AM - 10:45 AM": { start: "09:30", end: "10:45" },
  "11:00 AM - 12:15 PM": { start: "11:00", end: "12:15" },
  "1:00 PM - 2:15 PM": { start: "13:00", end: "14:15" },
  "2:30 PM - 3:45 PM": { start: "14:30", end: "15:45" },
  "4:00 PM - 5:15 PM": { start: "16:00", end: "17:15" },
};

// Program dates - 10 weekdays from Dec 8-19, 2025
const PROGRAM_DATES = [
  "2025-12-08", // Mon
  "2025-12-09", // Tue
  "2025-12-10", // Wed
  "2025-12-11", // Thu
  "2025-12-12", // Fri (Jamhuri Day - still running)
  "2025-12-15", // Mon
  "2025-12-16", // Tue
  "2025-12-17", // Wed
  "2025-12-18", // Thu
  "2025-12-19", // Fri
];

async function getAccessToken(): Promise<string> {
  const googleServiceAccount = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!googleServiceAccount) {
    throw new Error("Google service account not configured");
  }

  const serviceAccount = JSON.parse(googleServiceAccount);
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
    payload.sub = impersonate;
  }

  const jwt = await create(
    { alg: "RS256", typ: "JWT" },
    payload,
    cryptoKey,
  );

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
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
  return access_token;
}

async function createCalendarEvent(
  accessToken: string,
  summary: string,
  description: string,
  startDateTime: string,
  endDateTime: string,
  meetingLink?: string,
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const calendarEvent: Record<string, unknown> = {
    summary,
    description,
    start: {
      dateTime: startDateTime,
      timeZone: "Africa/Nairobi",
    },
    end: {
      dateTime: endDateTime,
      timeZone: "Africa/Nairobi",
    },
    colorId: "9", // Blue color for bootcamp classes
  };

  // If we have a meeting link, add it to the description
  if (meetingLink) {
    calendarEvent.description = `${description}\n\nMeeting Link: ${meetingLink}`;
  }

  const calendarResponse = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
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
    console.error("Calendar event creation failed:", errorText);
    return { success: false, error: errorText };
  }

  const event = await calendarResponse.json();
  console.log("Calendar event created:", event.id, summary);
  return { success: true, eventId: event.id };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all active intensive classes with tutor info
    const { data: classes, error: classesError } = await supabase
      .from("intensive_classes")
      .select(`
        id,
        subject,
        curriculum,
        grade_levels,
        time_slot,
        meeting_link,
        tutor_id,
        program_id,
        current_enrollment
      `)
      .eq("status", "active");

    if (classesError) {
      console.error("Error fetching classes:", classesError);
      throw new Error("Failed to fetch intensive classes");
    }

    console.log(`Found ${classes?.length || 0} active bootcamp classes`);

    // Fetch tutor names
    const tutorIds = [...new Set(classes?.filter(c => c.tutor_id).map(c => c.tutor_id))];
    const { data: tutorProfiles } = await supabase
      .from("tutor_profiles")
      .select("id, user_id")
      .in("id", tutorIds);

    const tutorUserIds = tutorProfiles?.map(t => t.user_id) || [];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", tutorUserIds);

    // Create tutor name lookup
    const tutorNameMap: Record<string, string> = {};
    tutorProfiles?.forEach(tp => {
      const profile = profiles?.find(p => p.id === tp.user_id);
      if (profile) {
        tutorNameMap[tp.id] = profile.full_name || "TBD";
      }
    });

    const accessToken = await getAccessToken();

    let createdCount = 0;
    let errorCount = 0;
    const results: Array<{ class: string; date: string; success: boolean; error?: string }> = [];

    // For each class, create events for all 10 program dates
    for (const cls of classes || []) {
      const timeSlot = TIME_SLOT_MAP[cls.time_slot];
      if (!timeSlot) {
        console.warn(`Unknown time slot: ${cls.time_slot} for class ${cls.subject}`);
        continue;
      }

      const tutorName = cls.tutor_id ? (tutorNameMap[cls.tutor_id] || "TBD") : "TBD";
      const gradeLevel = cls.grade_levels?.[0] || "Mixed";

      for (let i = 0; i < PROGRAM_DATES.length; i++) {
        const date = PROGRAM_DATES[i];
        const dayNumber = i + 1;

        const startDateTime = `${date}T${timeSlot.start}:00+03:00`;
        const endDateTime = `${date}T${timeSlot.end}:00+03:00`;

        const summary = `Bootcamp: ${cls.subject} (${cls.curriculum} ${gradeLevel}) - ${tutorName}`;
        const description = [
          `December Holiday Bootcamp - Day ${dayNumber}`,
          `Subject: ${cls.subject}`,
          `Curriculum: ${cls.curriculum}`,
          `Grade Level: ${gradeLevel}`,
          `Tutor: ${tutorName}`,
          `Time: ${cls.time_slot}`,
          `Students Enrolled: ${cls.current_enrollment}`,
        ].join("\n");

        const result = await createCalendarEvent(
          accessToken,
          summary,
          description,
          startDateTime,
          endDateTime,
          cls.meeting_link,
        );

        if (result.success) {
          createdCount++;
        } else {
          errorCount++;
        }

        results.push({
          class: `${cls.subject} (${cls.curriculum} ${gradeLevel})`,
          date,
          success: result.success,
          error: result.error,
        });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`Sync complete. Created: ${createdCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${createdCount} calendar events for bootcamp classes`,
        created: createdCount,
        errors: errorCount,
        details: results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Error syncing bootcamp to calendar:", error);
    return new Response(
      JSON.stringify({ error: error.message ?? "unknown_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
};

serve(handler);
