import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
