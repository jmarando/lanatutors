import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tutorProfileId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch tutor profile with related data
    const { data: tutorProfile, error: profileError } = await supabase
      .from("tutor_profiles")
      .select(`
        *,
        profiles:user_id(full_name)
      `)
      .eq("id", tutorProfileId)
      .single();

    if (profileError || !tutorProfile) {
      throw new Error("Tutor profile not found");
    }

    // Prepare criteria for AI analysis
    const criteria = {
      experienceYears: tutorProfile.experience_years || 0,
      rating: tutorProfile.rating || 0,
      totalReviews: tutorProfile.total_reviews || 0,
      curriculum: tutorProfile.curriculum || [],
      qualifications: tutorProfile.qualifications || [],
      currentInstitution: tutorProfile.current_institution || "",
      subjects: tutorProfile.subjects || [],
      graduationYear: tutorProfile.graduation_year || 0,
      tutoringExperience: tutorProfile.tutoring_experience || "",
    };

    // Call Lovable AI to analyze and assign tier
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert in evaluating tutor qualifications. Analyze tutor profiles and assign a tier (bronze, silver, or gold) based on these criteria:

TIER CRITERIA:
Gold Tier (2,000 KES/hour):
- 5+ years teaching experience OR 3+ years with exceptional ratings (4.8+)
- 20+ positive reviews with 4.8+ average rating
- Teaches IGCSE, IB, or A-Level curriculum
- Graduate from top-tier university or holds advanced degree
- Teaches higher grades (Form 3-4, Grade 11-12)

Silver Tier (1,750 KES/hour):
- 3-5 years teaching experience OR 2+ years with good ratings (4.5+)
- 10-20 positive reviews with 4.5+ average rating
- Teaches KCSE or CBC curriculum OR teaches IGCSE/IB with less experience
- Qualified teacher with relevant credentials
- Teaches middle to higher grades (Form 1-4, Grade 6-12)

Bronze Tier (1,500 KES/hour):
- Less than 3 years teaching experience
- Fewer than 10 reviews OR rating below 4.5
- Primarily teaches CBC or lower grade levels
- Recent graduate or less established credentials

IMPORTANT: Be fair but rigorous. Quality education matters. Provide clear justification for the tier assigned.`,
          },
          {
            role: "user",
            content: `Analyze this tutor profile and assign a tier (bronze, silver, or gold):

Experience Years: ${criteria.experienceYears}
Current Rating: ${criteria.rating}/5.0
Total Reviews: ${criteria.totalReviews}
Curriculum: ${criteria.curriculum.join(", ")}
Qualifications: ${criteria.qualifications.join(", ")}
Current Institution: ${criteria.currentInstitution}
Subjects: ${criteria.subjects.join(", ")}
Graduation Year: ${criteria.graduationYear}
Tutoring Experience Description: ${criteria.tutoringExperience}

Return ONLY a JSON object with this structure:
{
  "tier": "bronze" | "silver" | "gold",
  "justification": "Clear explanation of why this tier was assigned, referencing specific criteria met or not met"
}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "assign_tutor_tier",
              description: "Assign a tier to the tutor based on their qualifications",
              parameters: {
                type: "object",
                properties: {
                  tier: {
                    type: "string",
                    enum: ["bronze", "silver", "gold"],
                    description: "The tier assigned to the tutor",
                  },
                  justification: {
                    type: "string",
                    description: "Detailed explanation of why this tier was assigned",
                  },
                },
                required: ["tier", "justification"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "assign_tutor_tier" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Update tutor profile with new tier
    const { error: updateError } = await supabase
      .from("tutor_profiles")
      .update({
        tier: result.tier,
        tier_justification: result.justification,
        tier_last_updated: new Date().toISOString(),
      })
      .eq("id", tutorProfileId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        tier: result.tier,
        justification: result.justification,
        rate: result.tier === "gold" ? 2000 : result.tier === "silver" ? 1750 : 1500,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in calculate-tutor-tier:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
