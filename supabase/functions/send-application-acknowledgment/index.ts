import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AcknowledgmentEmailRequest {
  email: string;
  fullName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName }: AcknowledgmentEmailRequest = await req.json();

    console.log("Sending application acknowledgment to:", email);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ElimuConnect <info@resend.dev>",
        to: [email],
        subject: "Application Received - ElimuConnect Tutor Program",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Thank You for Your Interest, ${fullName}!</h1>
            
            <p>We have successfully received your application to join the ElimuConnect tutor community.</p>
            
            <div style="background-color: #f4f4f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #333; margin-top: 0;">What Happens Next?</h2>
              <ol style="line-height: 1.8; color: #555;">
                <li><strong>Application Review</strong> - Our team will carefully review your credentials, CV, and teaching experience (3-5 business days)</li>
                <li><strong>Verification</strong> - We'll verify your TSC number, references, and conduct background checks</li>
                <li><strong>Approval & Invitation</strong> - If approved, you'll receive an email invitation to complete your full tutor profile</li>
                <li><strong>Profile Completion</strong> - Submit your complete profile including professional photo, detailed experience, and references</li>
                <li><strong>Final Review</strong> - We'll conduct a final review before making your profile live on our platform</li>
                <li><strong>Go Live!</strong> - Once approved, you can start accepting students and earning</li>
              </ol>
            </div>

            <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2e7d32; margin-top: 0;">⏱️ Timeline</h3>
              <p style="margin: 0; color: #555;">You can expect to hear from us within <strong>3-5 business days</strong>. We review all applications thoroughly to maintain our high standards.</p>
            </div>

            <div style="background-color: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #e65100; margin-top: 0;">📋 What We're Looking For</h3>
              <p style="color: #555; margin-bottom: 10px;">As we review your application, we'll be assessing:</p>
              <ul style="color: #555; line-height: 1.6;">
                <li>Teaching experience and credentials</li>
                <li>TSC registration status</li>
                <li>Subject expertise and qualifications</li>
                <li>Professional background and references</li>
              </ul>
            </div>

            <p style="color: #555;">In the meantime, if you have any questions about the application process, feel free to reach out to us at <a href="mailto:support@elimuconnect.co.ke" style="color: #2754C5;">support@elimuconnect.co.ke</a></p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            
            <p style="color: #888; font-size: 12px;">
              Best regards,<br>
              <strong>The ElimuConnect Team</strong><br>
              Building Kenya's Premier Tutoring Network
            </p>
          </div>
        `,
      }),
    });

    const data = await emailResponse.json();

    console.log("Acknowledgment email sent successfully:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-application-acknowledgment:", error);
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
