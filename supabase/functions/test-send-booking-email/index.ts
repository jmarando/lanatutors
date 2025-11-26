import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use a real booking ID from the database
    const bookingId = "339bac43-e95d-4167-8195-4d570b4fec9a"; // Justin Anyona's Mathematics booking
    
    console.log(`Attempting to send booking confirmation email for booking: ${bookingId}`);

    // Call the existing send-booking-email function
    const response = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-booking-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({ 
          bookingId,
          meetingLink: "https://meet.google.com/test-xyz-meeting",
          recipientType: "both"
        }),
      }
    );

    const result = await response.json();
    console.log("Email send result:", JSON.stringify(result));

    if (!response.ok) {
      throw new Error(`Failed to send email: ${JSON.stringify(result)}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Test booking confirmation email sent for booking " + bookingId,
        result 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in test-send-booking-email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
