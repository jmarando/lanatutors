import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  name: string;
  accountType: 'parent' | 'student';
  childName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, accountType, childName }: WelcomeEmailRequest = await req.json();

    console.log(`Sending welcome email to ${email} for ${accountType} account`);

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      throw new Error("Email service not configured");
    }

    const isParent = accountType === 'parent';
    const greeting = isParent ? `Dear ${name}` : `Hi ${name}`;
    const introText = isParent 
      ? `Welcome to Lana Tutors! Your parent account has been created successfully${childName ? ` and ${childName} has been added as your first child` : ''}.`
      : `Welcome to Lana Tutors! Your student account has been created successfully.`;

    const nextStepsHtml = isParent ? `
      <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 24px; border-radius: 12px; margin: 24px 0;">
        <h3 style="color: #1a1a2e; margin: 0 0 16px 0; font-size: 18px;">🎯 Your Next Steps</h3>
        <ol style="color: #4a4a68; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li><strong>Browse our tutors</strong> - Find the perfect match for ${childName || 'your child'}'s learning needs</li>
          <li><strong>Book a session</strong> - Choose a convenient time slot that works for your family</li>
          <li><strong>Join the December Holiday Bootcamp</strong> - Intensive revision sessions available now!</li>
          <li><strong>Request a Learning Plan</strong> - Get a customized plan from our expert tutors</li>
        </ol>
      </div>
    ` : `
      <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 24px; border-radius: 12px; margin: 24px 0;">
        <h3 style="color: #1a1a2e; margin: 0 0 16px 0; font-size: 18px;">🎯 Your Next Steps</h3>
        <ol style="color: #4a4a68; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li><strong>Browse our tutors</strong> - Find the perfect tutor for your subjects</li>
          <li><strong>Book your first session</strong> - Choose a convenient time slot</li>
          <li><strong>Join the December Holiday Bootcamp</strong> - Intensive revision sessions available!</li>
          <li><strong>Explore learning packages</strong> - Save with multi-session bundles</li>
        </ol>
      </div>
    `;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Lana Tutors</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #9b87f5 0%, #7E69AB 100%); padding: 40px 40px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">🎉 Welcome to Lana Tutors!</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0; font-size: 16px;">Your learning journey starts here</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="color: #1a1a2e; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      ${greeting},
                    </p>
                    
                    <p style="color: #4a4a68; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                      ${introText}
                    </p>

                    <p style="color: #4a4a68; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                      We're excited to have you join our community of learners and educators. At Lana Tutors, we connect students with experienced, qualified tutors across various curricula including CBC, 8-4-4, IGCSE, A-Level, and IB.
                    </p>

                    ${nextStepsHtml}

                    <!-- CTA Buttons -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                      <tr>
                        <td align="center">
                          <a href="https://lanatutors.africa/tutors" style="display: inline-block; background: linear-gradient(135deg, #9b87f5 0%, #7E69AB 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 0 8px 12px 8px;">
                            Browse Tutors
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td align="center">
                          <a href="https://lanatutors.africa/december-intensive" style="display: inline-block; background: #1a1a2e; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 0 8px;">
                            December Holiday Bootcamp
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Support -->
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 24px;">
                      <p style="color: #4a4a68; font-size: 14px; line-height: 1.6; margin: 0;">
                        <strong>Need help?</strong> Our team is here to assist you. Simply reply to this email or reach out to us at <a href="mailto:info@lanatutors.africa" style="color: #9b87f5;">info@lanatutors.africa</a>
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #1a1a2e; padding: 30px 40px; text-align: center;">
                    <p style="color: #ffffff; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">Lana Tutors</p>
                    <p style="color: rgba(255,255,255,0.7); font-size: 14px; margin: 0 0 16px 0;">Expert tutoring for every learner</p>
                    <p style="color: rgba(255,255,255,0.5); font-size: 12px; margin: 0;">
                      © ${new Date().getFullYear()} Lana Tutors. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Lana Tutors <info@lanatutors.africa>",
        to: [email],
        subject: `Welcome to Lana Tutors, ${name}! 🎉`,
        html: emailHtml,
      }),
    });

    const responseData = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", responseData);
      throw new Error(responseData.message || "Failed to send email");
    }

    console.log("Welcome email sent successfully:", responseData);

    return new Response(JSON.stringify({ success: true, data: responseData }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
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
