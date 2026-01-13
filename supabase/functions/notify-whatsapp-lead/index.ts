import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendWhatsAppMessage } from "../_shared/whatsapp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Admin phone number to receive lead notifications
const ADMIN_PHONE = "254117512316";

interface LeadNotification {
  parentName: string;
  phoneNumber: string;
  curriculum: string;
  gradeLevel: string;
  subjects: string[];
  location?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lead: LeadNotification = await req.json();

    console.log("Received lead notification request:", lead);

    // Build message for admin
    const adminMessage = `🔔 *New WhatsApp Lead!*

👤 *Parent:* ${lead.parentName}
📞 *Phone:* ${lead.phoneNumber}
📚 *Curriculum:* ${lead.curriculum}
🎓 *Grade:* ${lead.gradeLevel}
📖 *Subjects:* ${lead.subjects.join(", ")}
📍 *Location:* ${lead.location || "Not specified"}

Reply to this lead ASAP! ⏰`;

    // Send notification to admin
    const result = await sendWhatsAppMessage(ADMIN_PHONE, adminMessage);

    if (!result.success) {
      console.error("Failed to send admin notification:", result.error);
      // Don't fail the request - the lead is still saved
      return new Response(
        JSON.stringify({ success: true, notificationSent: false, error: result.error }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Admin notification sent successfully:", result.messageId);

    return new Response(
      JSON.stringify({ success: true, notificationSent: true, messageId: result.messageId }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in notify-whatsapp-lead:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
