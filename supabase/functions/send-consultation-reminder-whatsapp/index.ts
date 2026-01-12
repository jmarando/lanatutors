import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppMessage } from "../_shared/whatsapp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    
    // Calculate time windows for 24h and 1h reminders
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in24HoursStart = new Date(in24Hours.getTime() - 15 * 60 * 1000);
    const in24HoursEnd = new Date(in24Hours.getTime() + 15 * 60 * 1000);
    
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
    const in1HourStart = new Date(in1Hour.getTime() - 15 * 60 * 1000);
    const in1HourEnd = new Date(in1Hour.getTime() + 15 * 60 * 1000);

    // Fetch consultations needing reminders
    const { data: consultations, error } = await supabase
      .from("consultation_bookings")
      .select("*")
      .eq("status", "confirmed")
      .not("phone_number", "is", null);

    if (error) {
      console.error("Error fetching consultations:", error);
      throw error;
    }

    const results: Array<{ id: string; type: string; success: boolean; error?: string }> = [];

    for (const consultation of consultations || []) {
      const consultationDateTime = new Date(
        `${consultation.consultation_date}T${consultation.consultation_time}`
      );

      let reminderType: "24h" | "1h" | null = null;

      // Check if falls within 24h window
      if (consultationDateTime >= in24HoursStart && consultationDateTime <= in24HoursEnd) {
        reminderType = "24h";
      }
      // Check if falls within 1h window
      else if (consultationDateTime >= in1HourStart && consultationDateTime <= in1HourEnd) {
        reminderType = "1h";
      }

      if (!reminderType) continue;

      const formattedDate = new Date(consultation.consultation_date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });

      let message: string;
      
      if (reminderType === "24h") {
        message = `
🔔 *Reminder: Consultation Tomorrow!*

Hi ${consultation.parent_name},

Just a friendly reminder about your consultation for *${consultation.student_name}* tomorrow!

📅 *Date:* ${formattedDate}
⏰ *Time:* ${consultation.consultation_time}
⏱️ *Duration:* 30 minutes

🔗 *Join here:*
${consultation.meeting_link || "Link will be shared shortly"}

📝 *Prepare for your session:*
• Have your child's recent report cards ready
• Note specific subjects or topics of concern
• Think about your goals for tutoring

See you tomorrow!

_Lana Tutors Team_
        `.trim();
      } else {
        message = `
⏰ *Starting in 1 Hour!*

Hi ${consultation.parent_name},

Your consultation for *${consultation.student_name}* starts in about 1 hour!

📅 *Time:* ${consultation.consultation_time}
⏱️ *Duration:* 30 minutes

🔗 *Join here:*
${consultation.meeting_link || "Link will be shared shortly"}

Please join 5 minutes early to ensure a smooth start.

See you soon!

_Lana Tutors Team_
        `.trim();
      }

      const result = await sendWhatsAppMessage(consultation.phone_number, message);
      
      results.push({
        id: consultation.id,
        type: reminderType,
        success: result.success,
        error: result.error
      });

      if (result.success) {
        console.log(`Sent ${reminderType} WhatsApp reminder for consultation ${consultation.id}`);
      } else {
        console.error(`Failed ${reminderType} reminder for ${consultation.id}:`, result.error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error processing WhatsApp reminders:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
