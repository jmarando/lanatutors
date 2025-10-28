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

    // TEMPORARY: Send to verified test email for testing
    // TODO: Change back to applicant's email when domain is verified
    const recipient = "justin@glab.africa";

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ElimuConnect <onboarding@resend.dev>",
        to: [recipient],
        subject: `Application Received - ${fullName}`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Thank You for Your Application!</h1>
          
          <p>Dear ${fullName},</p>
          
          <p>We have successfully received your application to become a tutor at ElimuConnect. Thank you for your interest in joining Kenya's leading tutoring platform!</p>
          
          <p><strong>Testing Mode:</strong> This email was sent to justin@glab.africa. Applicant email: ${email}</p>
          
          <p>We will communicate with you via this email: <strong>${email}</strong>.</p>
          
          <h2 style="color: #2563eb; margin-top: 30px;">What Happens Next?</h2>
          
          <p>Our vetting process consists of three simple steps:</p>
          
          <div style="margin: 20px 0;">
            <div style="padding: 15px; background-color: #f8fafc; border-left: 4px solid #2563eb; margin-bottom: 15px;">
              <h3 style="color: #2563eb; margin: 0 0 10px 0;">Step 1: Initial Vetting</h3>
              <p style="margin: 0;">We'll review your application and verify that you meet our requirements, including your TSC certification, teaching experience, and qualifications.</p>
            </div>
            
            <div style="padding: 15px; background-color: #f8fafc; border-left: 4px solid #2563eb; margin-bottom: 15px;">
              <h3 style="color: #2563eb; margin: 0 0 10px 0;">Step 2: Expert Conversation</h3>
              <p style="margin: 0;">If you pass the initial vetting, you'll be invited for a 30-minute video conversation with an ElimuConnect Expert to discuss your teaching philosophy and experience.</p>
            </div>
            
            <div style="padding: 15px; background-color: #f8fafc; border-left: 4px solid #2563eb;">
              <h3 style="color: #2563eb; margin: 0 0 10px 0;">Step 3: Enrollment & Profile Setup</h3>
              <p style="margin: 0;">Upon successfully passing the conversation, you'll become an official ElimuConnect tutor! You'll be enrolled in our system to complete your profile, upload your teaching video, and gain access to the tutor dashboard.</p>
            </div>
          </div>
          
          <h2 style="color: #2563eb; margin-top: 30px;">Timeline</h2>
          <p>You can expect to hear from us within <strong>3-5 business days</strong> regarding the status of your initial vetting.</p>
          
          <p style="margin-top: 30px;">If you have any questions in the meantime, please don't hesitate to reach out to us at <a href="mailto:info@elimuconnect.co.ke">info@elimuconnect.co.ke</a>.</p>
          
          <p style="margin-top: 30px;">Best regards,<br>
          <strong>The ElimuConnect Team</strong></p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <p style="font-size: 12px; color: #6b7280;">
            This is an automated message. Please do not reply directly to this email.
          </p>
        </div>
      `,
      }),
    });

    const emailResponse = await response.json();

    console.log("Acknowledgment email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-application-acknowledgment function:", error);
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
