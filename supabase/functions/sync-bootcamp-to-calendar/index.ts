import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create } from "https://deno.land/x/djwt@v2.8/mod.ts";
import { calendarEventId, parseTimeSlot, weekdayDates } from "../_shared/bootcamp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// What this puts on the calendar: for each class of an active holiday program that has not ended, one event on each
// of the program's Monday to Friday days, at the class's time slot (Africa/Nairobi). The days come from the program's
// start_date and end_date, and the times from the class's time_slot (either label style, see _shared/bootcamp.ts).
// Nothing about one year is written in here any more: it used to carry last December's ten dates and sync every active
// class of every program.

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
  eventId: string,
  summary: string,
  description: string,
  startDateTime: string,
  endDateTime: string,
  meetingLink?: string,
): Promise<{ success: boolean; alreadyThere?: boolean; error?: string }> {
  const calendarEvent: Record<string, unknown> = {
    // The same id for the same class on the same day, so syncing twice cannot make a second event.
    id: eventId,
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

  // Google answers 409 when the calendar already has that id: this event was made by an earlier sync.
  if (calendarResponse.status === 409) {
    await calendarResponse.text();
    return { success: true, alreadyThere: true };
  }

  if (!calendarResponse.ok) {
    const errorText = await calendarResponse.text();
    console.error("Calendar event creation failed:", errorText);
    return { success: false, error: errorText };
  }

  const event = await calendarResponse.json();
  console.log("Calendar event created:", event.id, summary);
  return { success: true };
}

interface Program {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // The admin screen calls this with no body. A body may name one program ({ "programId": "..." }).
    let programId: string | undefined;
    try {
      const body = await req.json();
      if (typeof body?.programId === "string") programId = body.programId;
    } catch (_) {
      // no body: sync every active program
    }

    const respond = (payload: Record<string, unknown>) =>
      new Response(JSON.stringify({ success: true, created: 0, already_synced: 0, errors: 0, skipped: [], details: [], ...payload }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // Active programs that have not ended. Today is read in Nairobi time (UTC+3, no daylight saving).
    const today = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
    let programQuery = supabase
      .from("intensive_programs")
      .select("id, name, start_date, end_date")
      .eq("is_active", true);
    if (programId) programQuery = programQuery.eq("id", programId);
    const { data: programRows, error: programsError } = await programQuery;
    if (programsError) {
      console.error("Error fetching programs:", programsError);
      throw new Error("Failed to fetch intensive programs");
    }
    const programs: Program[] = ((programRows ?? []) as Program[]).filter((p) => p.end_date >= today);
    if (programs.length === 0) {
      return respond({ message: "No active program to sync: none is active, or it has already ended" });
    }
    const programById: Record<string, Program> = Object.fromEntries(programs.map((p) => [p.id, p]));

    // Active classes of those programs only
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
      .eq("status", "active")
      .in("program_id", programs.map((p) => p.id));

    if (classesError) {
      console.error("Error fetching classes:", classesError);
      throw new Error("Failed to fetch intensive classes");
    }

    console.log(`Found ${classes?.length || 0} active classes in ${programs.length} program(s)`);
    if (!classes?.length) {
      return respond({ message: "No active classes to sync" });
    }

    // Fetch tutor names
    const tutorIds = [...new Set(classes.filter((c) => c.tutor_id).map((c) => c.tutor_id))];
    const { data: tutorProfiles } = await supabase
      .from("tutor_profiles")
      .select("id, user_id")
      .in("id", tutorIds);

    const tutorUserIds = tutorProfiles?.map((t) => t.user_id) || [];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", tutorUserIds);

    // Create tutor name lookup
    const tutorNameMap: Record<string, string> = {};
    tutorProfiles?.forEach((tp) => {
      const profile = profiles?.find((p) => p.id === tp.user_id);
      if (profile) {
        tutorNameMap[tp.id] = profile.full_name || "TBD";
      }
    });

    const accessToken = await getAccessToken();
    const pauseMs = Number(Deno.env.get("BOOTCAMP_SYNC_DELAY_MS") ?? 100);

    let createdCount = 0;
    let alreadyCount = 0;
    let errorCount = 0;
    const skipped: Array<{ class: string; reason: string }> = [];
    const results: Array<{ class: string; date: string; success: boolean; already_there?: boolean; error?: string }> = [];

    for (const cls of classes) {
      const program = programById[cls.program_id];
      const gradeLevel = cls.grade_levels?.[0] || "Mixed";
      const label = `${cls.subject} (${cls.curriculum} ${gradeLevel})`;

      const timeSlot = parseTimeSlot(cls.time_slot);
      if (!timeSlot) {
        console.warn(`Unknown time slot: ${cls.time_slot} for class ${cls.subject}`);
        skipped.push({ class: label, reason: `unknown time slot "${cls.time_slot}"` });
        continue;
      }

      const tutorName = cls.tutor_id ? (tutorNameMap[cls.tutor_id] || "TBD") : "TBD";
      const days = weekdayDates(program.start_date, program.end_date);

      for (let i = 0; i < days.length; i++) {
        const date = days[i];
        const dayNumber = i + 1;

        const startDateTime = `${date}T${timeSlot.start}:00+03:00`;
        const endDateTime = `${date}T${timeSlot.end}:00+03:00`;

        const summary = `Bootcamp: ${label} - ${tutorName}`;
        const description = [
          `${program.name} - Day ${dayNumber}`,
          `Subject: ${cls.subject}`,
          `Curriculum: ${cls.curriculum}`,
          `Grade Level: ${gradeLevel}`,
          `Tutor: ${tutorName}`,
          `Time: ${cls.time_slot}`,
          `Students Enrolled: ${cls.current_enrollment}`,
        ].join("\n");

        const result = await createCalendarEvent(
          accessToken,
          calendarEventId(cls.id, date),
          summary,
          description,
          startDateTime,
          endDateTime,
          cls.meeting_link,
        );

        if (!result.success) {
          errorCount++;
        } else if (result.alreadyThere) {
          alreadyCount++;
        } else {
          createdCount++;
        }

        results.push({
          class: label,
          date,
          success: result.success,
          already_there: result.alreadyThere,
          error: result.error,
        });

        // Small delay to avoid rate limiting
        if (pauseMs > 0) await new Promise((resolve) => setTimeout(resolve, pauseMs));
      }
    }

    console.log(`Sync complete. Created: ${createdCount}, already there: ${alreadyCount}, skipped classes: ${skipped.length}, errors: ${errorCount}`);

    return respond({
      message: `Synced ${createdCount} calendar events (${alreadyCount} were already there, ${skipped.length} classes skipped)`,
      created: createdCount,
      already_synced: alreadyCount,
      errors: errorCount,
      skipped,
      details: results,
    });
  } catch (error) {
    console.error("Error syncing bootcamp to calendar:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "unknown_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
};

serve(handler);
