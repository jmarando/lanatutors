import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { create } from "https://deno.land/x/djwt@v2.8/mod.ts";
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

    console.log("create-booking-with-meet invoked for booking:", bookingId);

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Error fetching booking:", bookingError);
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let meetingLink = "Will be shared soon";
    
    // Try to create Google Meet link using service account, but don't fail if it doesn't work
    try {
      const googleServiceAccount = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
      if (!googleServiceAccount) {
        console.log("Google service account not configured, skipping Meet creation");
        throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not set");
      }

      const serviceAccount = JSON.parse(googleServiceAccount);

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

      const now = Math.floor(Date.now() / 1000);
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
        console.error("Token error (booking meet):", errorData);
        throw new Error("Failed to get access token for booking event");
      }

      const { access_token } = await tokenResponse.json();

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
        .eq("user_id", booking.tutor_id)
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
        attendees: [
          ...(tutorEmail ? [{ email: tutorEmail }] : []),
          { email: "info@lanatutors.africa" },
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

      if (calendarResponse.ok) {
        const eventData = await calendarResponse.json();
        meetingLink = eventData.hangoutLink || eventData.conferenceData?.entryPoints?.[0]?.uri || meetingLink;

        // Update booking with meeting link
        await supabase
          .from("bookings")
          .update({ meeting_link: meetingLink })
          .eq("id", bookingId);

        console.log("Google Meet link created successfully:", meetingLink);
      } else {
        console.error("Calendar API error (booking meet):", await calendarResponse.text());
      }
    } catch (meetError) {
      console.error("Error creating Google Meet link (booking):", meetError);
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
    console.log('Attempting to send booking emails for:', bookingId);
    try {
      console.log('Sending student email...');
      const studentEmailResponse = await supabase.functions.invoke("send-booking-email", {
        body: { 
          bookingId,
          meetingLink,
          classroomLink,
          recipientType: "student",
        },
      });
      
      if (studentEmailResponse.error) {
        console.error('Student email error:', studentEmailResponse.error);
      } else {
        console.log('Student email sent successfully');
      }

      console.log('Sending tutor email...');
      const tutorEmailResponse = await supabase.functions.invoke("send-booking-email", {
        body: { 
          bookingId,
          meetingLink,
          classroomLink,
          recipientType: "tutor",
        },
      });
      
      if (tutorEmailResponse.error) {
        console.error('Tutor email error:', tutorEmailResponse.error);
      } else {
        console.log('Tutor email sent successfully');
      }
      
      console.log("Confirmation emails process completed");
    } catch (emailError) {
      console.error("Critical error sending emails:", emailError);
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
