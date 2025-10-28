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

    // TEMPORARY: Send to verified email for testing
    // TODO: Verify domain at resend.com/domains and update 'from' address
    const testEmail = "justin@glab.africa";

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ElimuConnect <onboarding@resend.dev>",
        to: [testEmail], // Temporarily sending to verified email
        subject: `Application Received - ${fullName}`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Thank You for Your Application!</h1>
          
          <p>Dear ${fullName},</p>
          
          <p>We have successfully received your application to become a tutor at ElimuConnect. Thank you for your interest in joining Kenya's leading tutoring platform!</p>
          
          <p><strong>Note:</strong> This acknowledgment was sent to ${testEmail} (testing mode). The applicant's email was: ${email}</p>
          
          <h2 style="color: #2563eb; margin-top: 30px;">What Happens Next?</h2>
          
          <p>Our vetting process includes the following steps:</p>
          
          <ol style="line-height: 1.8;">
            <li><strong>Application Review</strong> - We'll verify your credentials and teaching experience</li>
            <li><strong>Background Check</strong> - Verification of your TSC number and certificate of good conduct</li>
            <li><strong>Reference Verification</strong> - We'll contact your professional references</li>
            <li><strong>Subject Expertise Assessment</strong> - Evaluation of your teaching materials and methods</li>
            <li><strong>Interview</strong> - A comprehensive discussion about your teaching philosophy and experience</li>
            <li><strong>Full Profile Setup</strong> - If approved, you'll complete your tutor profile with photos, teaching video, and detailed information</li>
          </ol>
          
          <h2 style="color: #2563eb; margin-top: 30px;">Timeline</h2>
          <p>You can expect to hear from us within <strong>3-5 business days</strong> regarding the status of your application.</p>
          
          <h2 style="color: #2563eb; margin-top: 30px;">What We're Looking For</h2>
          <p>We carefully vet all tutors to ensure they meet our high standards:</p>
          <ul style="line-height: 1.8;">
            <li>Valid TSC certification</li>
            <li>Minimum 3 years teaching experience</li>
            <li>Proven track record of student success</li>
            <li>Strong communication and interpersonal skills</li>
            <li>Commitment to educational excellence</li>
          </ul>
          
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
