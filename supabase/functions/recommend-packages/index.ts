import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assessmentId } = await req.json();

    if (!assessmentId) {
      throw new Error('Assessment ID is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch assessment data
    const { data: assessment, error: assessmentError } = await supabaseClient
      .from('learning_assessments')
      .select('*')
      .eq('id', assessmentId)
      .single();

    if (assessmentError) throw assessmentError;

    // Call Lovable AI to generate package recommendations
    const systemPrompt = `You are an education consultant for Lana Tutors. Based on student assessments, recommend suitable learning packages. 

Available package types:
- single_subject: 5, 10, or 20 sessions (10-15% discount)
- multi_subject: 10 or 20 sessions across multiple subjects (15-18% discount)
- multi_child: 15 or 30 sessions for siblings (20-22% discount)
- exam_prep: 15-20 intensive exam preparation sessions (15% discount)

Return recommendations as a JSON array with: name, sessions, discount, price (estimated), package_type, and reason.`;

    const userPrompt = `Assessment Details:
- Grade Level: ${assessment.grade_level}
- Subjects: ${assessment.subjects.join(', ')}
- Learning Gaps: ${assessment.identified_gaps?.join(', ') || 'None specified'}
- Strengths: ${assessment.strengths?.join(', ') || 'None specified'}
- Learning Style: ${assessment.learning_style || 'Not specified'}
- Goals: ${assessment.recommended_approach || 'General improvement'}

Recommend 2-3 suitable packages that would help this student achieve their goals.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'recommend_packages',
            description: 'Return 2-3 package recommendations',
            parameters: {
              type: 'object',
              properties: {
                recommendations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      sessions: { type: 'number' },
                      discount: { type: 'number' },
                      price: { type: 'number' },
                      package_type: { 
                        type: 'string',
                        enum: ['single_subject', 'multi_subject', 'multi_child', 'exam_prep']
                      },
                      reason: { type: 'string' }
                    },
                    required: ['name', 'sessions', 'discount', 'price', 'package_type', 'reason']
                  }
                }
              },
              required: ['recommendations']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'recommend_packages' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service requires credits. Please contact support.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI service error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No recommendations generated');
    }

    const recommendations = JSON.parse(toolCall.function.arguments).recommendations;

    // Store recommendations in database
    const { error: insertError } = await supabaseClient
      .from('package_recommendations')
      .insert({
        assessment_id: assessmentId,
        recommended_packages: recommendations,
        reasoning: 'AI-generated based on learning assessment'
      });

    if (insertError) {
      console.error('Failed to store recommendations:', insertError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        recommended_packages: recommendations 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in recommend-packages:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});