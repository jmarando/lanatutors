import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendWhatsAppMessage } from "../_shared/whatsapp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppBookingRequest {
  phoneNumber: string;
  parentName: string;
  studentName: string;
  tutorName: string;
  subject: string;
  bookingDate: string;
  bookingTime: string;
  meetingLink?: string;
  depositPaid: number;
  balanceDue: number;
  totalAmount: number;
  classType: string;
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
      tutorName,
      subject,
      bookingDate,
      bookingTime,
      meetingLink,
      depositPaid,
      balanceDue,
      totalAmount,
      classType,
    }: WhatsAppBookingRequest = await req.json();

    const formattedDate = new Date(bookingDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const message = `
🎓 *Lana Tutors - Booking Confirmed!*

Hi ${parentName},

Great news! Your tutoring session for *${studentName}* has been confirmed. ✅

*Session Details:*
📚 Subject: ${subject}
👨‍🏫 Tutor: ${tutorName}
📅 Date: ${formattedDate}
🕐 Time: ${bookingTime}
${classType === 'online' ? '💻' : '📍'} Class Type: ${classType.charAt(0).toUpperCase() + classType.slice(1)}

${meetingLink ? `🔗 *Join here:*\n${meetingLink}\n` : ''}
*Payment Summary:*
💰 Total Amount: KES ${totalAmount.toLocaleString()}
✅ Deposit Paid: KES ${depositPaid.toLocaleString()}
${balanceDue > 0 ? `⏳ Balance Due: KES ${balanceDue.toLocaleString()}` : '✅ Fully Paid'}

*What's Next?*
1. ${meetingLink ? 'Join the session using the link above' : 'The tutor will contact you with session details'}
2. Be ready 5 minutes before the scheduled time
3. Have all necessary learning materials ready
${balanceDue > 0 ? '4. Remember to settle the remaining balance' : ''}

Questions? Contact us at info@lanatutors.africa

_Lana Tutors Team_
`.trim();

    const result = await sendWhatsAppMessage(phoneNumber, message);

    if (!result.success) {
      console.error("Failed to send booking WhatsApp:", result.error);
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
    console.error("Error in send-booking-whatsapp function:", error);
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
