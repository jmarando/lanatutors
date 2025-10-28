import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateTutorRequest {
  email: string;
  fullName: string;
  phoneNumber: string;
  subjects: string[];
  curriculum: string[];
  bio: string;
  hourlyRate: number;
  experienceYears: number;
  currentInstitution: string;
  qualifications: string[];
  avatarUrl?: string;
  verified?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const tutorData: CreateTutorRequest = await req.json();

    // Create auth user with temporary password
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: tutorData.email,
      password: Math.random().toString(36).slice(-12) + "Aa1!", // Random temp password
      email_confirm: true,
      user_metadata: {
        full_name: tutorData.fullName,
      },
    });

    if (authError) {
      console.error("Auth user creation error:", authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authUser.user.id;

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        full_name: tutorData.fullName,
        phone_number: tutorData.phoneNumber,
        avatar_url: tutorData.avatarUrl || null,
      });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      throw profileError;
    }

    // Create tutor profile
    const { data: tutorProfile, error: tutorProfileError } = await supabaseAdmin
      .from("tutor_profiles")
      .insert({
        user_id: userId,
        subjects: tutorData.subjects,
        curriculum: tutorData.curriculum,
        bio: tutorData.bio,
        hourly_rate: tutorData.hourlyRate,
        experience_years: tutorData.experienceYears,
        current_institution: tutorData.currentInstitution,
        qualifications: tutorData.qualifications,
        verified: tutorData.verified ?? false,
        rating: 0,
        total_reviews: 0,
      })
      .select()
      .single();

    if (tutorProfileError) {
      console.error("Tutor profile creation error:", tutorProfileError);
      throw tutorProfileError;
    }

    // Assign tutor role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role: "tutor",
      });

    if (roleError) {
      console.error("Role assignment error:", roleError);
      throw roleError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        tutorProfileId: tutorProfile.id,
        message: "Tutor profile created successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error creating tutor profile:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
