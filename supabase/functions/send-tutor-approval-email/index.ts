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
          
          <h2>Next Steps:</h2>
          <p>To complete your registration and start accepting students, please complete your full tutor profile by clicking the link below:</p>
          
          <p style="margin: 30px 0;">
            <a href="${Deno.env.get('VITE_SUPABASE_URL')?.replace('/rest/v1', '')}/tutor/signup" 
               style="background-color: #4CAF50; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Complete Your Profile
            </a>
          </p>
          
          <p>Your full profile will include:</p>
          <ul>
            <li>Professional photo</li>
            <li>Teaching experience and qualifications</li>
            <li>Subject specializations</li>
            <li>References</li>
            <li>A short teaching video (optional but recommended)</li>
          </ul>
          
          <p>Once your full profile is submitted, our team will conduct a final review before making your profile visible to students.</p>
          
          <p>If you have any questions, feel free to reach out to our support team at support@elimuconnect.co.ke</p>
          
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
