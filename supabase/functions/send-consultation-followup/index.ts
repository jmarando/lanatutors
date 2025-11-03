import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FollowUpRequest {
  email: string;
  parentName: string;
  studentName: string;
  consultationOutcome: string;
  recommendedSubjects: string[];
  recommendedTutors?: string[];
  nextSteps: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      email, 
      parentName, 
      studentName, 
      consultationOutcome,
      recommendedSubjects,
      recommendedTutors,
      nextSteps 
    }: FollowUpRequest = await req.json();

    const bookSessionUrl = `${req.headers.get("origin")}/tutors`;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: linear-gradient(135deg, #ED3F27 0%, #c73420 100%); padding: 40px 20px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
          .content { padding: 40px 30px; }
          .banner { background: linear-gradient(135deg, #F1EDEA 0%, #ffffff 100%); padding: 30px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #1D9DB8; }
          .banner h2 { color: #1A1A1A; margin: 0 0 10px 0; font-size: 22px; }
          .banner p { color: #737373; margin: 5px 0; line-height: 1.6; }
          .section-box { background: #F1EDEA; padding: 25px; border-radius: 12px; margin: 25px 0; }
          .section-box h3 { color: #1A1A1A; margin-top: 0; font-size: 18px; }
          .section-box p { color: #737373; line-height: 1.6; }
          .section-box ul { color: #1A1A1A; line-height: 1.8; margin: 10px 0; padding-left: 20px; }
          .button { display: inline-block; background: linear-gradient(135deg, #ED3F27 0%, #c73420 100%); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 5px; box-shadow: 0 4px 12px rgba(237, 63, 39, 0.3); }
          .button-secondary { background: linear-gradient(135deg, #1D9DB8 0%, #178ca3 100%); box-shadow: 0 4px 12px rgba(29, 157, 184, 0.3); }
          .info-box { background: #E8F7FA; border-left: 4px solid #1D9DB8; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .highlight-box { background: #FFF8E6; border-left: 4px solid #F59E0B; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .subjects-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 15px 0; }
          .subject-badge { background: #1D9DB8; color: white; padding: 8px 12px; border-radius: 6px; text-align: center; font-size: 14px; }
          .footer { background: #1A1A1A; color: #ffffff; padding: 30px; text-align: center; }
          .footer a { color: #1D9DB8; text-decoration: none; }
          @media only screen and (max-width: 600px) {
            .content { padding: 20px 15px; }
            .button { display: block; margin: 10px 0; }
            .subjects-grid { grid-template-columns: 1fr; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✨ Thank You for Choosing Lana Tutors!</h1>
          </div>
          
          <div class="content">
            <div class="banner">
              <h2>Hi ${parentName},</h2>
              <p>It was wonderful speaking with you about ${studentName}'s educational journey! We're excited to help ${studentName} achieve their academic goals.</p>
            </div>

            <div class="section-box">
              <h3>📋 Consultation Summary</h3>
              <p>${consultationOutcome}</p>
            </div>

            ${recommendedSubjects && recommendedSubjects.length > 0 ? `
            <div class="info-box">
              <h3 style="color: #1D9DB8; margin-top: 0;">📚 Recommended Subjects for ${studentName}</h3>
              <p style="color: #1A1A1A; margin-bottom: 15px;">Based on our discussion, we recommend focusing on these subjects:</p>
              <div class="subjects-grid">
                ${recommendedSubjects.map(subject => `<div class="subject-badge">${subject}</div>`).join('')}
              </div>
            </div>
            ` : ''}

            ${recommendedTutors && recommendedTutors.length > 0 ? `
            <div class="highlight-box">
              <h3 style="color: #F59E0B; margin-top: 0;">⭐ Recommended Tutors</h3>
              <p style="color: #1A1A1A;">We've handpicked these expert tutors who are perfect matches for ${studentName}:</p>
              <ul style="color: #1A1A1A;">
                ${recommendedTutors.map(tutor => `<li>${tutor}</li>`).join('')}
              </ul>
            </div>
            ` : ''}

            <div class="section-box">
              <h3>🎯 Next Steps</h3>
              <p>${nextSteps}</p>
            </div>

            <div style="text-align: center; margin: 40px 0;">
              <a href="${bookSessionUrl}" class="button">🚀 Browse Tutors & Book Sessions</a>
            </div>

            <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h3 style="color: #1A1A1A; margin-top: 0;">💡 Why Choose Lana Tutors?</h3>
              <ul style="color: #737373; line-height: 1.8;">
                <li><strong>Vetted Expert Tutors:</strong> All our tutors are carefully screened and verified</li>
                <li><strong>Personalized Learning:</strong> Customized lesson plans tailored to ${studentName}'s needs</li>
                <li><strong>Flexible Scheduling:</strong> Book sessions that fit your family's schedule</li>
                <li><strong>Progress Tracking:</strong> Regular updates on ${studentName}'s improvement</li>
                <li><strong>Affordable Packages:</strong> Multiple session packages with great value</li>
              </ul>
            </div>

            <div style="background: #E8F7FA; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
              <p style="color: #1A1A1A; margin: 0; font-size: 16px;">
                <strong>Questions or need help choosing a tutor?</strong>
              </p>
              <p style="color: #737373; margin: 10px 0;">
                Reply to this email or call us anytime. We're here to help!
              </p>
              <p style="margin: 15px 0;">
                <a href="mailto:info@lanatutors.africa" style="color: #1D9DB8; font-weight: 600;">info@lanatutors.africa</a>
              </p>
            </div>

            <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 2px solid #F1EDEA;">
              <p style="color: #1A1A1A; font-size: 16px; margin: 0;">Ready to get started? We can't wait to see ${studentName} succeed!</p>
            </div>
          </div>

          <div class="footer">
            <p style="margin: 0 0 10px 0; font-size: 16px;">The Lana Team</p>
            <p style="margin: 0; font-size: 14px; color: #B0B0B0;">Empowering Kenyan Students Through Quality Education</p>
            <p style="margin: 20px 0 0 0;">
              <a href="https://learnwithlana.com">www.learnwithlana.com</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log("Attempting to send follow-up email to:", email);
    console.log("Using API key:", RESEND_API_KEY ? "API key is set" : "API key is MISSING");
    
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Lana <info@lanatutors.africa>",
        to: [email],
        subject: `Next Steps for ${studentName}'s Learning Journey 🎓`,
        html: emailHtml,
      }),
    });

    const emailData = await emailResponse.json();
    
    console.log("Resend API response status:", emailResponse.status);
    console.log("Resend API response:", JSON.stringify(emailData));
    
    if (!emailResponse.ok) {
      console.error("Email sending failed with status:", emailResponse.status);
      console.error("Error details:", emailData);
      throw new Error(emailData.message || `Failed to send email: ${JSON.stringify(emailData)}`);
    }

    console.log("Follow-up email sent successfully:", emailData);

    return new Response(JSON.stringify(emailData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-consultation-followup:", error);
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
