import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendWhatsAppMessage } from "../_shared/whatsapp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppRequest {
  phoneNumber: string;
  parentName: string;
  studentName: string;
  consultationDate: string;
  consultationTime: string;
  meetingLink: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      phoneNumber, 
      parentName, 
      studentName, 
      consultationDate, 
      consultationTime, 
      meetingLink 
    }: WhatsAppRequest = await req.json();

    const formattedDate = new Date(consultationDate).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const message = `
🎓 *Lana Tutors - Consultation Confirmed!*

Hi ${parentName},

Your free consultation for *${studentName}* is confirmed! ✅

📅 *Date:* ${formattedDate}
⏰ *Time:* ${consultationTime}
⏱️ *Duration:* 30 minutes

🔗 *Join here:*
${meetingLink}

🔔 *Reminders:*
We'll send you reminders 1 day before and 1 hour before your consultation.

Need to reschedule? Contact us at info@lanatutors.africa

Looking forward to meeting you!

_Lana Tutors Team_
    `.trim();

    const result = await sendWhatsAppMessage(phoneNumber, message);

    if (!result.success) {
      console.error("Failed to send WhatsApp:", result.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.messageId,
        phone: phoneNumber 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error sending WhatsApp:", error);
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
