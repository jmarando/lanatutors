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
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No authorization header' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { bookingId }: BookingRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the authenticated user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError) throw bookingError;

    // Verify the user owns this booking
    if (booking.student_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - You do not own this booking' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let meetingLink = "Will be shared soon";
    
    // Try to create Google Meet link, but don't fail if it doesn't work
    try {
      // Get Google Calendar credentials from central config
      const { data: calendarConfig, error: configError } = await supabase
        .from("central_calendar_config")
        .select("*")
        .limit(1)
        .single();

      if (!configError && calendarConfig?.google_oauth_token) {
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

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            accessToken = refreshData.access_token;

            await supabase
              .from("central_calendar_config")
              .update({
                google_oauth_token: accessToken,
                google_token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
              })
              .eq("id", calendarConfig.id);
          } else {
            console.error("Token refresh failed, skipping Google Meet creation");
          }
        }

    // Create Google Calendar event with Meet link
    const { data: slot, error: slotError } = await supabase
      .from("tutor_availability")
      .select("start_time, end_time")
      .eq("id", booking.availability_slot_id)
      .single();

    if (slotError) throw slotError;

    const startTime = new Date(slot.start_time);
    const endTime = new Date(slot.end_time);

    const { data: studentProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", booking.student_id)
      .maybeSingle();

    const { data: tutorProfile } = await supabase
      .from("tutor_profiles")
      .select("email")
      .eq("id", booking.tutor_id)
      .maybeSingle();

    const studentName = studentProfile?.full_name || "Student";
    const tutorEmail = tutorProfile?.email || "";

    const calendarEvent = {
      summary: `${booking.subject} - ${studentName}`,
      description: `Tutoring session for ${booking.subject}\nTutor: ${tutorEmail}\nStudent: ${studentName}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: "Africa/Nairobi",
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: "Africa/Nairobi",
      },
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

        if (calendarResponse.ok) {
          const eventData = await calendarResponse.json();
          meetingLink = eventData.hangoutLink || meetingLink;

          // Update booking with meeting link
          await supabase
            .from("bookings")
            .update({ meeting_link: meetingLink })
            .eq("id", bookingId);
          
          console.log("Google Meet link created successfully:", meetingLink);
        } else {
          console.error("Calendar API error:", await calendarResponse.text());
        }
      } else {
        console.log("No Google Calendar configured, skipping Meet link creation");
      }
    } catch (meetError) {
      console.error("Error creating Google Meet link:", meetError);
      console.log("Continuing with email sending anyway...");
    }

    // Create Google Classroom for this booking
    let classroomLink = "";
    try {
      const { data: studentData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", booking.student_id)
        .maybeSingle();

      const { data: tutorData } = await supabase
        .from("tutor_profiles")
        .select("email")
        .eq("user_id", booking.tutor_id)
        .maybeSingle();

      const { data: studentAuth } = await supabase.auth.admin.getUserById(booking.student_id);
      const studentEmail = studentAuth?.user?.email || "";
      const studentName = studentData?.full_name || "Student";
      const tutorEmail = tutorData?.email || "";

      if (studentEmail && tutorEmail) {
        const classroomResponse = await supabase.functions.invoke("create-google-classroom", {
          body: {
            bookingId,
            tutorName: tutorEmail.split("@")[0],
            tutorEmail,
            studentName,
            studentEmail,
            subject: booking.subject,
          },
        });

        if (classroomResponse.data?.classroomLink) {
          classroomLink = classroomResponse.data.classroomLink;
          console.log("Google Classroom created successfully:", classroomLink);
        }
      }
    } catch (classroomError) {
      console.error("Error creating Google Classroom:", classroomError);
      console.log("Continuing without classroom...");
    }

    // Always send emails, even if Google Meet or Classroom creation failed
    try {
      await supabase.functions.invoke("send-booking-email", {
        body: { 
          bookingId,
          meetingLink,
          classroomLink,
          recipientType: "student",
        },
      });

      await supabase.functions.invoke("send-booking-email", {
        body: { 
          bookingId,
          meetingLink,
          classroomLink,
          recipientType: "tutor",
        },
      });
      
      console.log("Confirmation emails sent successfully");
    } catch (emailError) {
      console.error("Error sending emails:", emailError);
      // Don't throw - the booking is still confirmed
    }

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
