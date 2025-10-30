import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AssessmentMessage {
  role: "user" | "assistant";
  content: string;
}

interface AssessmentRequest {
  assessmentId?: string;
  messages: AssessmentMessage[];
  studentName: string;
  email: string;
  isComplete?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assessmentId, messages, studentName, email, isComplete }: AssessmentRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // System prompt for the AI assessment
    const systemPrompt = `You are an educational assessment AI for Lana Tutors. Be direct and concise. NO emojis or excessive friendliness.

Your role is to gather:
1. Current academic level
2. Learning style
3. Learning gaps/challenges
4. Subjects needing help
5. Preferred curriculum

CRITICAL INSTRUCTIONS:
- Keep messages under 2 sentences
- Be helpful but professional
- ALWAYS provide 3-5 button options for the student to choose from
- Format your response as: Brief question, then "OPTIONS:" followed by each option on a new line starting with "- "
- Ask ONE question at a time

Example format:
"What grade are you in?
OPTIONS:
- Primary 4-6
- Primary 7-8
- Form 1-2
- Form 3-4
- Other"

After 4-5 exchanges, provide a summary in this JSON format:
{
  "assessment_complete": true,
  "current_level": "Primary 5" or "Grade 10" etc,
  "learning_style": "visual" | "auditory" | "kinesthetic" | "reading_writing" | "mixed",
  "learning_gaps": ["specific gap 1", "specific gap 2"],
  "strengths": ["strength 1", "strength 2"],
  "goals": "brief description of goals",
  "preferred_subjects": ["Math", "Science"],
  "curriculum": "British" | "American" | "IB" | "Kenyan" | "Other",
  "ai_analysis": "2-3 sentence summary of the student's learning profile"
}

Student name: ${studentName}`;

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices[0].message.content;

    // Try to parse if assessment is complete
    let assessmentData = null;
    try {
      const jsonMatch = assistantMessage.match(/\{[\s\S]*"assessment_complete":\s*true[\s\S]*\}/);
      if (jsonMatch) {
        assessmentData = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.log("No JSON assessment data in response yet");
    }

    // Update or create assessment record
    let currentAssessmentId = assessmentId;
    
    if (assessmentData && assessmentData.assessment_complete) {
      // Generate tutor recommendations first
      const tutorRecommendations = await generateTutorRecommendations(
        supabase,
        assessmentData
      );

      // Save the completed assessment using the actual table schema
      const assessmentRecord = {
        student_email: email,
        student_name: studentName,
        grade_level: assessmentData.current_level,
        subjects: assessmentData.preferred_subjects,
        assessment_responses: [...messages, { role: "assistant", content: assistantMessage }],
        learning_level: assessmentData.current_level,
        learning_style: assessmentData.learning_style,
        identified_gaps: assessmentData.learning_gaps,
        strengths: assessmentData.strengths,
        recommended_approach: assessmentData.goals,
        suggested_learning_path: assessmentData.ai_analysis,
        recommended_tutors: tutorRecommendations,
        completed_at: new Date().toISOString(),
      };

      if (currentAssessmentId) {
        await supabase
          .from("learning_assessments")
          .update(assessmentRecord)
          .eq("id", currentAssessmentId);
      } else {
        const { data, error } = await supabase
          .from("learning_assessments")
          .insert(assessmentRecord)
          .select()
          .single();
        
        if (error) throw error;
        currentAssessmentId = data.id;
      }


      return new Response(
        JSON.stringify({
          message: assistantMessage,
          assessmentComplete: true,
          assessmentId: currentAssessmentId,
          assessmentData,
          tutorRecommendations,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      // Continue conversation - update existing or create new draft
      if (!currentAssessmentId) {
        const { data, error } = await supabase
          .from("learning_assessments")
          .insert({
            student_email: email,
            student_name: studentName,
            grade_level: "In Progress",
            subjects: [],
            assessment_responses: [...messages, { role: "assistant", content: assistantMessage }],
            learning_style: "mixed",
            identified_gaps: [],
            strengths: [],
          })
          .select()
          .single();
        
        if (error) throw error;
        currentAssessmentId = data.id;
      } else {
        await supabase
          .from("learning_assessments")
          .update({
            assessment_responses: [...messages, { role: "assistant", content: assistantMessage }],
          })
          .eq("id", currentAssessmentId);
      }

      return new Response(
        JSON.stringify({
          message: assistantMessage,
          assessmentComplete: false,
          assessmentId: currentAssessmentId,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Error in ai-learning-assessment:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function generateTutorRecommendations(
  supabase: any,
  assessmentData: any
) {
  // Fetch verified tutors with their subjects and curricula
  const { data: tutors, error } = await supabase
    .from("tutor_profiles")
    .select(`
      id,
      user_id,
      subjects,
      curriculum,
      hourly_rate,
      rating,
      total_reviews,
      experience_years,
      bio,
      profiles!tutor_profiles_user_id_fkey(full_name, avatar_url)
    `)
    .eq("verified", true);

  if (error || !tutors) {
    console.error("Error fetching tutors:", error);
    return [];
  }

  // Calculate match scores
  const recommendations = tutors
    .map((tutor: any) => {
      let score = 0;
      const reasons = [];

      // Subject match (40% weight)
      const tutorSubjects = tutor.subjects || [];
      const matchingSubjects = assessmentData.preferred_subjects.filter((subject: string) =>
        tutorSubjects.some((ts: string) => ts.toLowerCase().includes(subject.toLowerCase()))
      );
      if (matchingSubjects.length > 0) {
        score += 0.4 * (matchingSubjects.length / assessmentData.preferred_subjects.length);
        reasons.push(`Teaches ${matchingSubjects.join(", ")}`);
      }

      // Curriculum match (20% weight)
      const tutorCurricula = tutor.curriculum || [];
      if (tutorCurricula.includes(assessmentData.curriculum)) {
        score += 0.2;
        reasons.push(`Experienced with ${assessmentData.curriculum} curriculum`);
      }

      // Rating (20% weight)
      if (tutor.rating) {
        score += 0.2 * (tutor.rating / 5);
        if (tutor.rating >= 4.5) {
          reasons.push(`Highly rated (${tutor.rating}/5)`);
        }
      }

      // Experience (20% weight)
      if (tutor.experience_years) {
        score += 0.2 * Math.min(tutor.experience_years / 10, 1);
        if (tutor.experience_years >= 5) {
          reasons.push(`${tutor.experience_years}+ years experience`);
        }
      }

      return {
        tutor_id: tutor.id,
        match_score: score,
        match_reasons: reasons,
        tutor: {
          ...tutor,
          full_name: tutor.profiles?.full_name,
          avatar_url: tutor.profiles?.avatar_url,
        },
      };
    })
    .filter((rec: any) => rec.match_score > 0.3) // Only recommend tutors with >30% match
    .sort((a: any, b: any) => b.match_score - a.match_score)
    .slice(0, 5); // Top 5 recommendations

  // Return recommendations to be stored in the assessment record
  return recommendations;
}
