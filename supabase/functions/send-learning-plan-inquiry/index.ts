import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { checkRateLimit, getRateLimitIdentifier } from "../_shared/rate-limiter.ts";

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
  desiredDurationWeeks?: number;
  availableTimePerWeek?: string;
  inquiryId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting: 5 requests per IP per minute
  const identifier = getRateLimitIdentifier(req);
  if (!checkRateLimit(identifier)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      { 
        status: 429, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
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
      desiredDurationWeeks,
      availableTimePerWeek,
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
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff;">
          
          <!-- Header -->
          <div style="background-color: #D95436; color: #ffffff; padding: 40px 30px; text-align: center;">
            <div style="font-size: 32px; margin-bottom: 8px;">📋</div>
            <h1 style="margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -0.5px;">New Learning Plan Request</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 0 30px 40px 30px;">
            
            <!-- Greeting -->
            <div style="padding: 30px 0 20px 0;">
              <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">Hi ${tutorName},</p>
              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #4a4a4a;">You have received a new learning plan request from a parent. Here are the details:</p>
            </div>
            
            <!-- Parent Information -->
            <div style="background: linear-gradient(135deg, #FFF5F5 0%, #FFE8E8 100%); padding: 24px; border-radius: 12px; margin: 24px 0;">
              <div style="display: flex; align-items: center; margin-bottom: 16px;">
                <span style="font-size: 20px; margin-right: 8px;">👤</span>
                <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #D95436;">Parent Information</h2>
              </div>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #666666; width: 40%;">Name:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${parentName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #666666;">Email:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${parentEmail}</td>
                </tr>
                ${parentPhone ? `
                <tr>
                  <td style="padding: 10px 0; font-size: 14px; color: #666666;">Phone:</td>
                  <td style="padding: 10px 0; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${parentPhone}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <!-- Student Information -->
            <div style="background: linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%); padding: 24px; border-radius: 12px; margin: 24px 0;">
              <div style="display: flex; align-items: center; margin-bottom: 16px;">
                <span style="font-size: 20px; margin-right: 8px;">🎓</span>
                <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #7C3AED;">Student Information</h2>
              </div>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #DDD6FE; font-size: 14px; color: #5B21B6; width: 40%;">Name:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #DDD6FE; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${studentName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; ${curriculum ? 'border-bottom: 1px solid #DDD6FE;' : ''} font-size: 14px; color: #5B21B6;">Grade Level:</td>
                  <td style="padding: 10px 0; ${curriculum ? 'border-bottom: 1px solid #DDD6FE;' : ''} font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${gradeLevel}</td>
                </tr>
                ${curriculum ? `
                <tr>
                  <td style="padding: 10px 0; font-size: 14px; color: #5B21B6;">Curriculum:</td>
                  <td style="padding: 10px 0; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${curriculum}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <!-- Request Details -->
            <div style="background: linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%); padding: 24px; border-radius: 12px; margin: 24px 0;">
              <div style="display: flex; align-items: center; margin-bottom: 16px;">
                <span style="font-size: 20px; margin-right: 8px;">📚</span>
                <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #1E40AF;">Request Details</h2>
              </div>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; ${preferredSessions || lastExamPerformance || challenges || desiredDurationWeeks || availableTimePerWeek ? 'border-bottom: 1px solid #BFDBFE;' : ''} font-size: 14px; color: #1E3A8A; width: 40%;">Subjects:</td>
                  <td style="padding: 10px 0; ${preferredSessions || lastExamPerformance || challenges || desiredDurationWeeks || availableTimePerWeek ? 'border-bottom: 1px solid #BFDBFE;' : ''} font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${subjects.join(", ")}</td>
                </tr>
                ${desiredDurationWeeks ? `
                <tr>
                  <td style="padding: 10px 0; ${preferredSessions || lastExamPerformance || challenges || availableTimePerWeek ? 'border-bottom: 1px solid #BFDBFE;' : ''} font-size: 14px; color: #1E3A8A;">Desired Duration:</td>
                  <td style="padding: 10px 0; ${preferredSessions || lastExamPerformance || challenges || availableTimePerWeek ? 'border-bottom: 1px solid #BFDBFE;' : ''} font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${desiredDurationWeeks} weeks</td>
                </tr>
                ` : ''}
                ${availableTimePerWeek ? `
                <tr>
                  <td style="padding: 10px 0; ${preferredSessions || lastExamPerformance || challenges ? 'border-bottom: 1px solid #BFDBFE;' : ''} font-size: 14px; color: #1E3A8A;">Available Time/Week:</td>
                  <td style="padding: 10px 0; ${preferredSessions || lastExamPerformance || challenges ? 'border-bottom: 1px solid #BFDBFE;' : ''} font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${availableTimePerWeek}</td>
                </tr>
                ` : ''}
                ${preferredSessions ? `
                <tr>
                  <td style="padding: 10px 0; ${lastExamPerformance || challenges ? 'border-bottom: 1px solid #BFDBFE;' : ''} font-size: 14px; color: #1E3A8A;">Preferred Sessions:</td>
                  <td style="padding: 10px 0; ${lastExamPerformance || challenges ? 'border-bottom: 1px solid #BFDBFE;' : ''} font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${preferredSessions}</td>
                </tr>
                ` : ''}
                ${lastExamPerformance ? `
                <tr>
                  <td style="padding: 10px 0; ${challenges ? 'border-bottom: 1px solid #BFDBFE;' : ''} font-size: 14px; color: #1E3A8A;">Last Performance:</td>
                  <td style="padding: 10px 0; ${challenges ? 'border-bottom: 1px solid #BFDBFE;' : ''} font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${lastExamPerformance}</td>
                </tr>
                ` : ''}
                ${challenges ? `
                <tr>
                  <td colspan="2" style="padding: 10px 0; font-size: 14px; color: #1E3A8A;">
                    <strong>Challenges & Goals:</strong><br>
                    <span style="color: #1a1a1a; font-weight: 400;">${challenges}</span>
                  </td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <!-- Next Steps -->
            <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 24px; border-radius: 12px; margin: 24px 0;">
              <div style="display: flex; align-items: center; margin-bottom: 16px;">
                <span style="font-size: 20px; margin-right: 8px;">📝</span>
                <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #D97706;">Next Steps</h2>
              </div>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #78350f;">Please review this request and create a personalized learning plan for ${studentName}. ${desiredDurationWeeks ? `The parent wants tutoring for ${desiredDurationWeeks} weeks${availableTimePerWeek ? ` with ${availableTimePerWeek} available` : ''}. Consider recommending 2-3 sessions per week across subjects.` : ''} Reply directly to <strong>${parentEmail}</strong> with:</p>
              <ol style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #78350f;">
                <li>A breakdown of subjects and recommended sessions per week across the ${desiredDurationWeeks || ''} week period</li>
                <li>Total package price with any applicable discounts</li>
                <li>Your teaching approach and how you'll address the student's needs</li>
                <li>Proposed weekly schedule (e.g., Mon/Wed Math, Tue/Thu English)</li>
              </ol>
              <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; border-radius: 8px; margin-top: 16px;">
                <p style="margin: 0; font-size: 13px; color: #92400E; font-weight: 600;">⏱️ Please respond within 24 hours to maintain excellent parent communication.</p>
              </div>
            </div>
            
            <!-- Help Section -->
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #666666;">If you have any questions, contact us at <a href="mailto:info@lanatutors.africa" style="color: #D95436; text-decoration: none; font-weight: 500;">info@lanatutors.africa</a></p>
            </div>
            
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f9f9f9; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e5e5;">
            <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #D95436;">Lana Tutors</p>
            <p style="margin: 0; font-size: 12px; color: #999999;">Thank you for being part of our tutoring community!</p>
          </div>
          
        </div>
      </body>
      </html>
    `;

    const tutorEmailResponse = await resend.emails.send({
      from: "Lana Tutors <inquiries@lanatutors.africa>",
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
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff;">
          
          <!-- Header -->
          <div style="background-color: #D95436; color: #ffffff; padding: 40px 30px; text-align: center;">
            <div style="font-size: 32px; margin-bottom: 8px;">✓</div>
            <h1 style="margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -0.5px;">Request Received!</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 0 30px 40px 30px;">
            
            <!-- Greeting -->
            <div style="padding: 30px 0 20px 0;">
              <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">Hi ${parentName},</p>
              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #4a4a4a;">Thank you for requesting a personalized learning plan from ${tutorName}!</p>
            </div>
            
            <!-- What Happens Next -->
            <div style="background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%); padding: 24px; border-radius: 12px; margin: 24px 0;">
              <div style="display: flex; align-items: center; margin-bottom: 16px;">
                <span style="font-size: 20px; margin-right: 8px;">📋</span>
                <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #065F46;">What Happens Next?</h2>
              </div>
              <ol style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #065F46;">
                <li style="margin-bottom: 12px;"><strong>Review:</strong> ${tutorName} will review ${studentName}'s needs and create a custom learning plan</li>
                <li style="margin-bottom: 12px;"><strong>Plan Creation:</strong> You'll receive a detailed plan via email within 24 hours with:
                  <ul style="margin-top: 8px; padding-left: 20px;">
                    <li>Recommended subjects and session breakdown</li>
                    <li>Total package price and any discounts</li>
                    <li>Teaching approach tailored to ${studentName}'s needs</li>
                    <li>Proposed schedule</li>
                  </ul>
                </li>
                <li style="margin-bottom: 12px;"><strong>Your Decision:</strong> Review the plan at your convenience and accept when ready</li>
                <li><strong>Payment & Booking:</strong> Once accepted, complete payment and start scheduling sessions</li>
              </ol>
            </div>
            
            <!-- Request Summary -->
            <div style="background: linear-gradient(135deg, #FFF5F5 0%, #FFE8E8 100%); padding: 24px; border-radius: 12px; margin: 24px 0;">
              <div style="display: flex; align-items: center; margin-bottom: 16px;">
                <span style="font-size: 20px; margin-right: 8px;">📝</span>
                <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #D95436;">Your Request Summary</h2>
              </div>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #666666; width: 40%;">Student:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${studentName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #666666;">Grade Level:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${gradeLevel}</td>
                </tr>
                ${curriculum ? `
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #666666;">Curriculum:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #FFD6D6; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${curriculum}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 10px 0; ${preferredSessions ? 'border-bottom: 1px solid #FFD6D6;' : ''} font-size: 14px; color: #666666;">Subjects:</td>
                  <td style="padding: 10px 0; ${preferredSessions ? 'border-bottom: 1px solid #FFD6D6;' : ''} font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${subjects.join(", ")}</td>
                </tr>
                ${preferredSessions ? `
                <tr>
                  <td style="padding: 10px 0; font-size: 14px; color: #666666;">Preferred Sessions:</td>
                  <td style="padding: 10px 0; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${preferredSessions}</td>
                </tr>
                ` : ''}
              </table>
              ${challenges ? `
              <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #FFD6D6;">
                <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #666666;">Your Notes:</p>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #1a1a1a;">${challenges}</p>
              </div>
              ` : ''}
            </div>
            
            <!-- Help Section -->
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #666666;">If you have any questions in the meantime, feel free to reply to this email or contact us at <a href="mailto:info@lanatutors.africa" style="color: #D95436; text-decoration: none; font-weight: 500;">info@lanatutors.africa</a></p>
            </div>
            
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f9f9f9; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e5e5;">
            <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #D95436;">Lana Tutors</p>
            <p style="margin: 0; font-size: 12px; color: #999999;">Supporting your learning journey, one session at a time.</p>
          </div>
          
        </div>
      </body>
      </html>
    `;

    const parentEmailResponse = await resend.emails.send({
      from: "Lana Tutors <inquiries@lanatutors.africa>",
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
