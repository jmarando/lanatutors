import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalEmailRequest {
  email: string;
  fullName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName }: ApprovalEmailRequest = await req.json();

    console.log("Sending approval email to:", email);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ElimuConnect <onboarding@resend.dev>",
        to: [email],
        subject: "Congratulations! Complete Your ElimuConnect Tutor Profile",
        html: `
          <h1>Congratulations, ${fullName}!</h1>
          
          <p>We're excited to inform you that your initial application to become an ElimuConnect tutor has been approved!</p>
          
          <h2>Next Step: Schedule Your Interview</h2>
          <p>Before completing your full tutor profile, we'd like to have a brief 30-minute session with you to discuss your teaching experience and answer any questions you may have about working with ElimuConnect.</p>
          
          <p style="margin: 30px 0;">
            <a href="mailto:info@elimuconnect.co.ke?subject=Interview Booking - ${encodeURIComponent(fullName)}&body=Hello, I would like to schedule my 30-minute interview session. Please share available times.%0D%0A%0D%0AName: ${encodeURIComponent(fullName)}%0D%0AEmail: ${encodeURIComponent(email)}" 
               style="background-color: #4CAF50; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Book Your Interview Session
            </a>
          </p>
          
          <p><strong>What to expect:</strong></p>
          <ul>
            <li>A 30-minute video call with our team</li>
            <li>Discussion about your teaching experience and approach</li>
            <li>Overview of how ElimuConnect works</li>
            <li>Opportunity to ask any questions</li>
          </ul>
          
          <p>After your interview session, you'll receive an invitation to complete your full tutor profile, which will include your professional photo, detailed qualifications, and teaching preferences.</p>
          
          <p>To schedule your session, please click the button above to email us at info@elimuconnect.co.ke with your preferred times.</p>
          
          <p>We look forward to speaking with you soon!</p>
          
          <p>Best regards,<br>
          The ElimuConnect Team</p>
        `,
      }),
    });

    const data = await emailResponse.json();

    console.log("Approval email sent successfully:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-tutor-approval-email:", error);
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
