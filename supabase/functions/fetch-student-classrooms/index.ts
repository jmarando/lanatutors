import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClassroomRequest {
  studentId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentId }: ClassroomRequest = await req.json();
    
    console.log("Fetching classrooms for student:", studentId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all bookings for this student that have classroom links
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("id, subject, classroom_id, classroom_link, created_at")
      .eq("student_id", studentId)
      .not("classroom_id", "is", null)
      .order("created_at", { ascending: false });

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      throw bookingsError;
    }

    // Transform bookings into classroom list
    const classrooms = bookings?.map(booking => ({
      id: booking.classroom_id,
      name: `${booking.subject} Class`,
      subject: booking.subject,
      link: booking.classroom_link,
      bookingId: booking.id,
      createdAt: booking.created_at,
    })) || [];

    console.log(`Found ${classrooms.length} classrooms`);

    return new Response(
      JSON.stringify({
        success: true,
        classrooms,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error fetching student classrooms:", error);
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
