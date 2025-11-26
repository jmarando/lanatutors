import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingRequest {
  bookingId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId }: BookingRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        student:profiles!student_id(full_name, email),
        tutor:tutor_profiles!tutor_id(email),
        slot:tutor_availability!availability_slot_id(start_time, end_time)
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError) throw bookingError;

    // Get Google Calendar credentials from central config
    const { data: calendarConfig, error: configError } = await supabase
      .from("central_calendar_config")
      .select("*")
      .limit(1)
      .single();

    if (configError || !calendarConfig?.google_oauth_token) {
      console.error("No Google Calendar configured");
      return new Response(
        JSON.stringify({ error: "Calendar not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token needs refresh
    let accessToken = calendarConfig.google_oauth_token;
    const expiresAt = new Date(calendarConfig.google_token_expires_at || 0);
    
    if (expiresAt <= new Date()) {
      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
          client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
          refresh_token: calendarConfig.google_refresh_token!,
          grant_type: "refresh_token",
        }),
      });

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      await supabase
        .from("central_calendar_config")
        .update({
          google_oauth_token: accessToken,
          google_token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
        })
        .eq("id", calendarConfig.id);
    }

    // Create Google Calendar event with Meet link
    const startTime = new Date(booking.slot.start_time);
    const endTime = new Date(booking.slot.end_time);

    const calendarEvent = {
      summary: `${booking.subject} - ${booking.student.full_name}`,
      description: `Tutoring session for ${booking.subject}\nTutor: ${booking.tutor.email}\nStudent: ${booking.student.full_name}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: "Africa/Nairobi",
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: "Africa/Nairobi",
      },
      attendees: [
        { email: booking.student.email },
        { email: booking.tutor.email },
      ],
      conferenceData: {
        createRequest: {
          requestId: `booking-${bookingId}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 1440 },
          { method: "popup", minutes: 30 },
        ],
      },
    };

    const calendarResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(calendarEvent),
      }
    );

    if (!calendarResponse.ok) {
      throw new Error(`Calendar API error: ${await calendarResponse.text()}`);
    }

    const eventData = await calendarResponse.json();
    const meetingLink = eventData.hangoutLink;

    // Update booking with meeting link
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ meeting_link: meetingLink })
      .eq("id", bookingId);

    if (updateError) throw updateError;

    // Send emails to student and tutor
    await supabase.functions.invoke("send-booking-email", {
      body: { 
        bookingId,
        meetingLink,
        recipientType: "student",
      },
    });

    await supabase.functions.invoke("send-booking-email", {
      body: { 
        bookingId,
        meetingLink,
        recipientType: "tutor",
      },
    });

    return new Response(
      JSON.stringify({ success: true, meetingLink }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating booking with Meet:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
