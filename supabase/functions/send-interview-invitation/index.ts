import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InterviewInvitationRequest {
  email: string;
  fullName: string;
  meetLink: string;
  interviewDate: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, meetLink, interviewDate }: InterviewInvitationRequest = await req.json();
    
    console.log("Sending interview invitation to:", email);

    // TEMPORARY: Send to verified test email for testing
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
        subject: `Great News ${fullName} - Interview Invitation!`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Congratulations! You've Passed Initial Vetting 🎉</h1>
          
          <p>Dear ${fullName},</p>
          
          <p><strong>Testing Mode:</strong> This email was sent to justin@glab.africa. Applicant email: ${email}</p>
          
          <p>We're pleased to inform you that you've successfully passed the initial vetting stage of our application process!</p>
          
          <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 20px; margin: 30px 0;">
            <h2 style="color: #2563eb; margin-top: 0;">📅 Next Step: Expert Conversation</h2>
            <p style="margin: 0;">You're invited to a 30-minute video conversation with an ElimuConnect Expert to discuss your teaching philosophy and experience.</p>
          </div>
          
          <h2 style="color: #2563eb; margin-top: 30px;">Interview Details</h2>
          
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>📆 Date & Time:</strong> ${new Date(interviewDate).toLocaleString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Africa/Nairobi'
            })} EAT</p>
            <p style="margin: 0 0 10px 0;"><strong>⏱️ Duration:</strong> 30 minutes</p>
            <p style="margin: 0;"><strong>💻 Platform:</strong> Google Meet</p>
          </div>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${meetLink}" 
               style="background-color: #2563eb; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Join Video Interview
            </a>
          </div>
          
          <h2 style="color: #2563eb; margin-top: 30px;">How to Prepare</h2>
          
          <ul style="line-height: 1.8;">
            <li><strong>Test your equipment</strong> - Ensure your camera and microphone work properly</li>
            <li><strong>Find a quiet space</strong> - Choose a location with minimal background noise</li>
            <li><strong>Review your application</strong> - Be ready to discuss your teaching experience and methods</li>
            <li><strong>Prepare questions</strong> - Feel free to ask about the platform, students, and expectations</li>
            <li><strong>Be yourself</strong> - We want to see your authentic teaching personality</li>
          </ul>
          
          <h2 style="color: #2563eb; margin-top: 30px;">What We'll Discuss</h2>
          
          <ul style="line-height: 1.8;">
            <li>Your teaching philosophy and approach</li>
            <li>Experience with different curricula (CBC, IGCSE, etc.)</li>
            <li>How you handle challenging students</li>
            <li>Your availability and preferred teaching mode</li>
            <li>Questions about the ElimuConnect platform</li>
          </ul>
          
          <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>💡 Pro Tip:</strong> Have examples ready of successful teaching moments or student transformations. We love hearing real stories!</p>
          </div>
          
          <h2 style="color: #2563eb; margin-top: 30px;">Need to Reschedule?</h2>
          <p>If the scheduled time doesn't work for you, please reply to this email as soon as possible so we can arrange an alternative time.</p>
          
          <p style="margin-top: 30px;">We're excited to meet you and learn more about your teaching journey!</p>
          
          <p style="margin-top: 30px;">Best regards,<br>
          <strong>The ElimuConnect Team</strong></p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <p style="font-size: 12px; color: #6b7280;">
            Interview Link: <a href="${meetLink}">${meetLink}</a><br>
            This is an automated message. For questions, contact info@elimuconnect.co.ke
          </p>
        </div>
      `,
      }),
    });

    const emailResponse = await response.json();
    console.log("Interview invitation sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-interview-invitation function:", error);
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
