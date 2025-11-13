import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalRequest {
  applicationId: string;
  notes?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Missing Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized - Missing authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Verify the JWT token and get the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Invalid authentication token:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has admin role
    const { data: roleData, error: adminRoleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (adminRoleError || !roleData) {
      console.error("Admin role check failed:", adminRoleError);
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Admin ${user.email} approving tutor application`);

    const { applicationId, notes }: ApprovalRequest = await req.json();

    // Get application details
    const { data: application, error: appError } = await supabaseAdmin
      .from("tutor_applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (appError || !application) {
      console.error("Application not found:", appError);
      return new Response(
        JSON.stringify({ error: "Application not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase() + "1!";

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === application.email);
    
    let userId: string;
    
    if (existingUser) {
      // User already exists, use their ID and update their password
      console.log("User already exists, updating password:", existingUser.id);
      userId = existingUser.id;
      
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: tempPassword }
      );
      
      if (updateError) {
        console.error("Password update error:", updateError);
        return new Response(
          JSON.stringify({ error: `Failed to update password: ${updateError.message}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Create new auth user
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: application.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: application.full_name,
        },
      });

      if (authError) {
        console.error("Auth user creation error:", authError);
        return new Response(
          JSON.stringify({ error: `Failed to create account: ${authError.message}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = authUser.user.id;
      console.log("Created auth user:", userId);
    }

    // Create or update profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        full_name: application.full_name,
        phone_number: application.phone_number,
        must_reset_password: true,
      });

    if (profileError) {
      console.error("Profile upsert error:", profileError);
      throw profileError;
    }

    // Assign tutor role (skip if already exists)
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role: 'tutor'
      })
      .select()
      .maybeSingle();

    if (roleError && roleError.code !== '23505') { // 23505 is unique violation (role already exists)
      console.error("Role assignment error:", roleError);
      throw roleError;
    }

    // Update application to interview_passed
    const { error: updateError } = await supabaseAdmin
      .from("tutor_applications")
      .update({ 
        status: 'interview_passed',
        interview_notes: notes || null,
        user_id: userId,
        updated_at: new Date().toISOString()
      })
      .eq("id", applicationId);

    if (updateError) {
      console.error("Application update error:", updateError);
      throw updateError;
    }

    // Send approval email with temp password
    const emailResult = await supabaseAdmin.functions.invoke('send-tutor-approval-email', {
      body: { 
        email: application.email,
        fullName: application.full_name,
        tempPassword: tempPassword
      }
    });

    console.log("Approval email sent:", emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: userId,
        message: "Account created and approval email sent"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in approve-tutor-interview:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
