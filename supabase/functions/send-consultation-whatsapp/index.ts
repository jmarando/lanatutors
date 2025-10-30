import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
    const { phoneNumber, parentName, studentName, consultationDate, consultationTime, meetingLink }: WhatsAppRequest = await req.json();

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
We'll send you reminders 1 day before and 1 hour before your consultation via email and WhatsApp.

Need to reschedule? Contact us at info@lanatutors.com

Looking forward to meeting you!

_Lana Tutors Team_
    `.trim();

    // Format phone number for WhatsApp (remove + and spaces)
    const formattedPhone = phoneNumber.replace(/[\s+]/g, '');
    
    // Using WhatsApp Business API or similar service
    // Note: This is a placeholder - actual implementation would require WhatsApp Business API credentials
    console.log(`Would send WhatsApp to ${formattedPhone}:`, message);

    // For now, we'll log the message. In production, integrate with WhatsApp Business API
    // Example with a WhatsApp service provider:
    /*
    const whatsappResponse = await fetch("https://api.whatsapp.provider.com/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("WHATSAPP_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: formattedPhone,
        message: message,
      }),
    });
    */

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "WhatsApp notification logged (integration pending)",
        phone: formattedPhone 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending WhatsApp:", error);
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
