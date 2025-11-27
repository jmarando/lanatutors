import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { checkRateLimit, getRateLimitIdentifier } from "../_shared/rate-limiter.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GeneralLearningPlanInquiryRequest {
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
    }: GeneralLearningPlanInquiryRequest = await req.json();

    console.log("Sending general learning plan inquiry to LANA team");

    // Email to LANA admin team
    const adminEmailHtml = `
      <h1>New Learning Plan Request</h1>
      <p>A parent has requested a personalized learning plan. Here are the details:</p>
      
      <h2>Parent Information</h2>
      <ul>
        <li><strong>Name:</strong> ${parentName}</li>
        <li><strong>Email:</strong> ${parentEmail}</li>
        ${parentPhone ? `<li><strong>Phone:</strong> ${parentPhone}</li>` : ""}
      </ul>
      
      <h2>Student Information</h2>
      <ul>
        <li><strong>Name:</strong> ${studentName}</li>
        <li><strong>Grade Level:</strong> ${gradeLevel}</li>
        ${curriculum ? `<li><strong>Curriculum:</strong> ${curriculum}</li>` : ""}
      </ul>
      
      <h2>Request Details</h2>
      <ul>
        <li><strong>Subjects Needed:</strong> ${subjects.join(", ")}</li>
        ${preferredSessions ? `<li><strong>Preferred Sessions:</strong> ${preferredSessions}</li>` : ""}
        ${lastExamPerformance ? `<li><strong>Last Exam Performance:</strong> ${lastExamPerformance}</li>` : ""}
        ${challenges ? `<li><strong>Challenges & Goals:</strong> ${challenges}</li>` : ""}
      </ul>
      
      <h3>Next Steps</h3>
      <p>Please:</p>
      <ol>
        <li>Review this request and match the student with appropriate tutor(s)</li>
        <li>Create a personalized learning plan with subject breakdown and pricing</li>
        <li>Reply to ${parentEmail} with the custom plan within 24 hours</li>
      </ol>
      
      <p>Parent is expecting to receive a detailed plan via email.</p>
    `;

    const adminEmailResponse = await resend.emails.send({
      from: "LANA Tutors <inquiries@lanatutors.africa>",
      reply_to: parentEmail,
      to: ["info@lanatutors.africa"],
      subject: `New Learning Plan Request from ${parentName}`,
      html: adminEmailHtml,
    });

    console.log("Admin email sent:", adminEmailResponse);

    // Confirmation email to parent
    const parentEmailHtml = `
      <h1>Learning Plan Request Received</h1>
      <p>Hi ${parentName},</p>
      <p>Thank you for requesting a personalized learning plan from LANA Tutors!</p>
      
      <h2>What Happens Next?</h2>
      <ol>
        <li><strong>Review:</strong> Our expert team will review ${studentName}'s needs and match them with the perfect tutor(s)</li>
        <li><strong>Plan Creation:</strong> You'll receive a detailed plan via email within 24 hours with:
          <ul>
            <li>Recommended tutor(s) matched to your needs</li>
            <li>Subject breakdown and session recommendations</li>
            <li>Total package price and any discounts</li>
            <li>Teaching approach tailored to ${studentName}'s needs</li>
          </ul>
        </li>
        <li><strong>Your Decision:</strong> Review the plan at your convenience and accept when ready</li>
        <li><strong>Payment & Booking:</strong> Once accepted, complete payment and start scheduling sessions</li>
      </ol>
      
      <h3>Your Request Summary</h3>
      <ul>
        <li><strong>Student:</strong> ${studentName}</li>
        <li><strong>Grade Level:</strong> ${gradeLevel}</li>
        ${curriculum ? `<li><strong>Curriculum:</strong> ${curriculum}</li>` : ""}
        <li><strong>Subjects:</strong> ${subjects.join(", ")}</li>
        ${preferredSessions ? `<li><strong>Preferred Sessions:</strong> ${preferredSessions}</li>` : ""}
      </ul>
      
      ${challenges ? `<p><strong>Your Notes:</strong> ${challenges}</p>` : ""}
      
      <p>If you have any questions in the meantime, feel free to reply to this email.</p>
      
      <p>Best regards,<br>LANA Tutors Team</p>
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
        adminEmail: adminEmailResponse.data,
        parentEmail: parentEmailResponse.data,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-general-learning-plan-inquiry:", error);
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