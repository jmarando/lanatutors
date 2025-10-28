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
    
    console.log("Sending tutor approval email to:", email);

    // TEMPORARY: Send to verified test email for testing
    // TODO: Change back to applicant's email when domain is verified
    const recipient = "justin@glab.africa";

    const signupUrl = `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?type=signup&redirect_to=https://elimuconnect.lovable.app/tutor-profile-setup`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ElimuConnect <onboarding@resend.dev>",
        to: [recipient],
        subject: `Congratulations ${fullName} - You're Approved!`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Congratulations! You've Been Approved!</h1>
          
          <p>Dear ${fullName},</p>
          
          <p><strong>Testing Mode:</strong> This email was sent to justin@glab.africa. Applicant email: ${email}</p>
          
          <p>We're thrilled to inform you that you've successfully passed our vetting process and expert conversation! Welcome to the ElimuConnect family of elite tutors.</p>
          
          <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 20px; margin: 30px 0;">
            <h2 style="color: #2563eb; margin-top: 0;">🎉 What This Means</h2>
            <p style="margin: 0;">You are now officially an approved ElimuConnect tutor! You're joining Kenya's leading tutoring platform where quality education meets passionate educators.</p>
          </div>
          
          <h2 style="color: #2563eb; margin-top: 30px;">Next Steps - Complete Your Profile</h2>
          
          <p>To start teaching and earning, you need to complete your tutor profile. This includes:</p>
          
          <ol style="line-height: 1.8;">
            <li><strong>Create Your Account</strong> - Set up your login credentials</li>
            <li><strong>Personal Information</strong> - Add your bio and teaching philosophy</li>
            <li><strong>Professional Details</strong> - Upload your teaching video and qualifications</li>
            <li><strong>Teaching Preferences</strong> - Set your subjects, rates, and availability</li>
            <li><strong>Profile Review</strong> - Our team will do a final review</li>
          </ol>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="https://elimuconnect.lovable.app/tutor-profile-setup" 
               style="background-color: #2563eb; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Complete Your Profile Now
            </a>
          </div>
          
          <h2 style="color: #2563eb; margin-top: 30px;">Important Information</h2>
          
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <h3 style="color: #92400e; margin-top: 0;">⏱️ Complete Within 7 Days</h3>
            <p style="margin: 0; color: #78350f;">Please complete your profile setup within 7 days to maintain your approved status. This ensures we can start connecting you with students as soon as possible.</p>
          </div>
          
          <h2 style="color: #2563eb; margin-top: 30px;">What You'll Earn</h2>
          <ul style="line-height: 1.8;">
            <li>Set your own hourly rate (KES 2,000 - 6,000)</li>
            <li>Earn 70% of your set rate (we retain 30% service fee)</li>
            <li>Example: KES 3,000/hr rate = KES 2,100/hr earnings</li>
            <li>Weekly payouts directly to your M-Pesa</li>
          </ul>
          
          <h2 style="color: #2563eb; margin-top: 30px;">Need Help?</h2>
          <p>If you have any questions while setting up your profile, our team is here to help at <a href="mailto:info@elimuconnect.co.ke">info@elimuconnect.co.ke</a>.</p>
          
          <p style="margin-top: 30px;">We're excited to have you on board and can't wait to see you make an impact on students' lives!</p>
          
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

    console.log("Approval email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-tutor-approval-email function:", error);
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
