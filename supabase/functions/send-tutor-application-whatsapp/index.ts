import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendWhatsAppMessage } from "../_shared/whatsapp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppRequest {
  phoneNumber: string;
  fullName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, fullName }: WhatsAppRequest = await req.json();

    const message = `
🎓 *Lana Tutors - Application Received!*

Hi ${fullName},

Thank you for applying to become a tutor with Lana! ✅

We have successfully received your application.

📋 *What Happens Next?*

*1️⃣ Initial Vetting*
We'll review your credentials within 3-5 business days

*2️⃣ Expert Conversation*
If you pass, we'll schedule a 30-minute video call with you

*3️⃣ Enrollment & Dashboard Access*
Upon approval, complete your profile and start teaching!

📧 *Stay Updated:*
We'll send you updates via email and WhatsApp throughout the process.

Questions? Contact us at info@lanatutors.africa

Looking forward to having you on our team!

_Lana Tutors Team_
    `.trim();

    const result = await sendWhatsAppMessage(phoneNumber, message);

    if (!result.success) {
      console.error("Failed to send tutor application WhatsApp:", result.error);
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
    console.error("Error sending tutor application WhatsApp:", error);
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
