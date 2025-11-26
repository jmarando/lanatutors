import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { create } from "https://deno.land/x/djwt@v2.8/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClassroomRequest {
  bookingId: string;
  tutorName: string;
  tutorEmail: string;
  studentName: string;
  studentEmail: string;
  subject: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, tutorName, tutorEmail, studentName, studentEmail, subject }: ClassroomRequest = await req.json();
    
    console.log("Creating Google Classroom for booking:", bookingId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const googleServiceAccount = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!googleServiceAccount) {
      throw new Error("Google service account not configured");
    }

    const serviceAccount = JSON.parse(googleServiceAccount);

    // Create JWT for Google API with Classroom scope
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
      ["sign"]
    );

    const payload: Record<string, unknown> = {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/classroom.courses https://www.googleapis.com/auth/classroom.rosters https://www.googleapis.com/auth/classroom.coursework.students https://www.googleapis.com/auth/classroom.announcements",
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
      cryptoKey
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

    // Create Google Classroom
    const courseName = `${subject} - ${tutorName} & ${studentName}`;
    const courseDescription = `One-on-one tutoring sessions for ${subject}. Booking ID: ${bookingId}`;

    const course = {
      name: courseName,
      section: "1:1 Tutoring Session",
      description: courseDescription,
      descriptionHeading: "About This Class",
      room: "Online via Google Meet",
      ownerId: impersonate, // The teacher/tutor will be the owner
      courseState: "ACTIVE",
    };

    console.log("Creating classroom with details:", course);

    const classroomResponse = await fetch(
      "https://classroom.googleapis.com/v1/courses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(course),
      }
    );

    if (!classroomResponse.ok) {
      const error = await classroomResponse.text();
      console.error("Classroom API error:", error);
      throw new Error("Failed to create Google Classroom");
    }

    const classroomData = await classroomResponse.json();
    const classroomId = classroomData.id;
    const classroomLink = classroomData.alternateLink;

    console.log("Google Classroom created:", classroomId);

    // Add student to the classroom
    const studentInvite = {
      userId: studentEmail,
      courseId: classroomId,
      role: "STUDENT",
    };

    const addStudentResponse = await fetch(
      `https://classroom.googleapis.com/v1/courses/${classroomId}/students`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(studentInvite),
      }
    );

    if (!addStudentResponse.ok) {
      const error = await addStudentResponse.text();
      console.error("Failed to add student:", error);
      // Don't throw - classroom is created, student can be added manually
    } else {
      console.log("Student added to classroom");
    }

    // Update booking with classroom details
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        classroom_id: classroomId,
        classroom_link: classroomLink,
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("Failed to update booking:", updateError);
      throw updateError;
    }

    console.log("Booking updated with classroom details");

    return new Response(
      JSON.stringify({
        success: true,
        classroomId,
        classroomLink,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error creating Google Classroom:", error);
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
