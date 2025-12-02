import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

Great news! Your tutoring session for ${studentName} has been confirmed.

*Session Details:*
📚 Subject: ${subject}
👨‍🏫 Tutor: ${tutorName}
📅 Date: ${formattedDate}
🕐 Time: ${bookingTime}
${classType === 'online' ? '💻' : '📍'} Class Type: ${classType.charAt(0).toUpperCase() + classType.slice(1)}

${meetingLink ? `*Google Meet Link:*\n🔗 ${meetingLink}\n` : ''}
*Payment Summary:*
💰 Total Amount: KES ${totalAmount.toLocaleString()}
✅ Deposit Paid: KES ${depositPaid.toLocaleString()}
${balanceDue > 0 ? `⏳ Balance Due: KES ${balanceDue.toLocaleString()}` : '✅ Fully Paid'}

*What's Next?*
1. ${meetingLink ? 'Join the session using the Google Meet link above' : 'The tutor will contact you with session details'}
2. Be ready 5 minutes before the scheduled time
3. Have all necessary learning materials ready
4. ${balanceDue > 0 ? 'Remember to settle the remaining balance' : ''}

*Need Help?*
📧 Email: support@lanatutors.com
📞 WhatsApp: +254 700 000 000

Looking forward to a great learning session! 📚✨

- Lana Tutors Team
`.trim();

    const formattedPhone = phoneNumber.replace(/\s+/g, '').replace('+', '');
    
    console.log('WhatsApp booking confirmation prepared for:', formattedPhone);
    console.log('Message:', message);

    // In production, integrate with a WhatsApp API like Twilio, WhatsApp Business API, or similar
    // For now, we're just logging the message
    // Example with Twilio:
    /*
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhone = Deno.env.get('TWILIO_WHATSAPP_NUMBER');
    
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: `whatsapp:${twilioPhone}`,
          To: `whatsapp:+${formattedPhone}`,
          Body: message,
        }),
      }
    );
    */

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'WhatsApp notification prepared',
        phone: formattedPhone 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-booking-whatsapp function:", error);
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
