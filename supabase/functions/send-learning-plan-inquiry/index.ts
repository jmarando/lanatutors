import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LearningPlanInquiryRequest {
  tutorEmail: string;
  tutorName: string;
  parentName: string;
  parentEmail: string;
  parentPhone?: string;
  studentName: string;
  gradeLevel: string;
  curriculum?: string;
  subjects: string[];
  lastExamPerformance?: string;
  challenges?: string;
  preferredSessions?: number;
  inquiryId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      tutorEmail,
      tutorName,
      parentName,
      parentEmail,
      parentPhone,
      studentName,
      gradeLevel,
      curriculum,
      subjects,
      lastExamPerformance,
      challenges,
      preferredSessions,
      inquiryId,
    }: LearningPlanInquiryRequest = await req.json();

    console.log("Sending learning plan inquiry to:", tutorEmail);

    // Email to tutor
    const tutorEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; }
          .header { background-color: #D95436; color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
          .content { padding: 30px; }
          .section { background-color: #FFF5F5; border-left: 4px solid #D95436; padding: 20px; margin: 20px 0; border-radius: 4px; }
          .section-title { color: #D95436; font-size: 18px; font-weight: 600; margin: 0 0 15px 0; }
          .detail-row { padding: 8px 0; color: #666666; font-size: 14px; }
          .highlight-box { background-color: #FFFBEB; border-left: 4px solid #F59E0B; padding: 20px; border-radius: 4px; margin: 20px 0; }
          .footer { padding: 20px 30px; background-color: #f9f9f9; color: #666666; font-size: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 New Learning Plan Request</h1>
          </div>
          <div class="content">
            <p style="color: #333333; font-size: 16px;">Hi ${tutorName},</p>
            <p style="color: #666666; font-size: 15px;">You have received a new learning plan request from a parent. Here are the details:</p>
            
            <div class="section">
              <h2 class="section-title">👤 Parent Information</h2>
              <div class="detail-row"><strong>Name:</strong> ${parentName}</div>
              <div class="detail-row"><strong>Email:</strong> ${parentEmail}</div>
              ${parentPhone ? `<div class="detail-row"><strong>Phone:</strong> ${parentPhone}</div>` : ""}
            </div>
            
            <div class="section">
              <h2 class="section-title">🎓 Student Information</h2>
              <div class="detail-row"><strong>Name:</strong> ${studentName}</div>
              <div class="detail-row"><strong>Grade Level:</strong> ${gradeLevel}</div>
              ${curriculum ? `<div class="detail-row"><strong>Curriculum:</strong> ${curriculum}</div>` : ""}
            </div>
            
            <div class="section">
              <h2 class="section-title">📚 Request Details</h2>
              <div class="detail-row"><strong>Subjects Needed:</strong> ${subjects.join(", ")}</div>
              ${preferredSessions ? `<div class="detail-row"><strong>Preferred Sessions:</strong> ${preferredSessions}</div>` : ""}
              ${lastExamPerformance ? `<div class="detail-row"><strong>Last Exam Performance:</strong> ${lastExamPerformance}</div>` : ""}
              ${challenges ? `<div class="detail-row"><strong>Challenges & Goals:</strong> ${challenges}</div>` : ""}
            </div>
            
            <div class="highlight-box">
              <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">📝 Next Steps</h3>
              <p style="color: #666666; font-size: 14px; margin-bottom: 15px;">Please review this request and create a personalized learning plan for ${studentName}. Reply directly to <strong>${parentEmail}</strong> with:</p>
              <ol style="color: #666666; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>A breakdown of subjects and recommended number of sessions per subject</li>
                <li>Total package price with any applicable discounts</li>
                <li>Your teaching approach and how you'll address the student's needs</li>
                <li>Proposed schedule or availability</li>
              </ol>
              <p style="color: #92400e; font-size: 14px; margin-top: 15px; margin-bottom: 0;"><strong>⏱️ Please respond within 24 hours to maintain excellent parent communication.</strong></p>
            </div>
            
            <p style="color: #666666; font-size: 14px;">Best regards,<br><strong style="color: #D95436;">LANA Tutors Team</strong></p>
          </div>
          <div class="footer">
            <p style="margin: 0 0 5px 0; font-weight: 600; color: #D95436;">LANA Tutors</p>
            <p style="margin: 0;">Thank you for being part of our tutoring community!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const tutorEmailResponse = await resend.emails.send({
      from: "LANA Tutors <inquiries@lanatutors.africa>",
      reply_to: parentEmail,
      to: [tutorEmail],
      subject: `New Learning Plan Request from ${parentName}`,
      html: tutorEmailHtml,
    });

    console.log("Tutor email sent:", tutorEmailResponse);

    // Confirmation email to parent
    const parentEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; }
          .header { background-color: #D95436; color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
          .content { padding: 30px; }
          .section { background-color: #FFF5F5; border-left: 4px solid #D95436; padding: 20px; margin: 20px 0; border-radius: 4px; }
          .section-title { color: #D95436; font-size: 18px; font-weight: 600; margin: 0 0 15px 0; }
          .detail-row { padding: 8px 0; color: #666666; font-size: 14px; }
          .success-box { background-color: #D1FAE5; border-left: 4px solid #10B981; padding: 20px; border-radius: 4px; margin: 20px 0; }
          .footer { padding: 20px 30px; background-color: #f9f9f9; color: #666666; font-size: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ Request Received!</h1>
          </div>
          <div class="content">
            <p style="color: #333333; font-size: 16px;">Hi ${parentName},</p>
            <p style="color: #666666; font-size: 15px;">Thank you for requesting a personalized learning plan from ${tutorName}!</p>
            
            <div class="success-box">
              <h2 style="color: #065F46; font-size: 18px; font-weight: 600; margin: 0 0 10px 0;">📋 What Happens Next?</h2>
              <ol style="color: #065F46; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li><strong>Review:</strong> ${tutorName} will review ${studentName}'s needs and create a custom learning plan</li>
                <li><strong>Plan Creation:</strong> You'll receive a detailed plan via email within 24 hours with:
                  <ul style="margin-top: 8px;">
                    <li>Recommended subjects and session breakdown</li>
                    <li>Total package price and any discounts</li>
                    <li>Teaching approach tailored to ${studentName}'s needs</li>
                    <li>Proposed schedule</li>
                  </ul>
                </li>
                <li><strong>Your Decision:</strong> Review the plan at your convenience and accept when ready</li>
                <li><strong>Payment & Booking:</strong> Once accepted, complete payment and start scheduling sessions</li>
              </ol>
            </div>
            
            <div class="section">
              <h3 class="section-title">📝 Your Request Summary</h3>
              <div class="detail-row"><strong>Student:</strong> ${studentName}</div>
              <div class="detail-row"><strong>Grade Level:</strong> ${gradeLevel}</div>
              ${curriculum ? `<div class="detail-row"><strong>Curriculum:</strong> ${curriculum}</div>` : ""}
              <div class="detail-row"><strong>Subjects:</strong> ${subjects.join(", ")}</div>
              ${preferredSessions ? `<div class="detail-row"><strong>Preferred Sessions:</strong> ${preferredSessions}</div>` : ""}
              ${challenges ? `<div class="detail-row"><strong>Your Notes:</strong> ${challenges}</div>` : ""}
            </div>
            
            <p style="color: #666666; font-size: 14px;">If you have any questions in the meantime, feel free to reply to this email or contact us at <a href="mailto:info@lanatutors.africa" style="color: #D95436;">info@lanatutors.africa</a></p>
            
            <p style="color: #666666; font-size: 14px;">Best regards,<br><strong style="color: #D95436;">LANA Tutors Team</strong></p>
          </div>
          <div class="footer">
            <p style="margin: 0 0 5px 0; font-weight: 600; color: #D95436;">LANA Tutors</p>
            <p style="margin: 0;">Supporting your learning journey, one session at a time.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const parentEmailResponse = await resend.emails.send({
      from: "LANA Tutors <inquiries@lanatutors.africa>",
      to: [parentEmail],
      subject: "Your Learning Plan Request Has Been Sent",
      html: parentEmailHtml,
    });

    console.log("Parent confirmation email sent:", parentEmailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        tutorEmail: tutorEmailResponse.data,
        parentEmail: parentEmailResponse.data,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-learning-plan-inquiry:", error);
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
