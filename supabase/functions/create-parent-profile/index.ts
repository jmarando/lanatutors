import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateParentRequest {
  fullName: string;
  phoneNumber: string;
  email?: string;
  sendWelcomeEmail?: boolean;
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

    console.log(`Admin ${user.email} creating parent profile`);

    const parentData: CreateParentRequest = await req.json();
    const hasRealEmail = parentData.email && !parentData.email.includes('@lana-placeholder.local');

    // Generate email if not provided (use phone as placeholder)
    const email = parentData.email || `parent_${parentData.phoneNumber.replace(/\D/g, '')}@lana-placeholder.local`;

    // Create auth user with temporary password
    const tempPassword = `Lana${Math.random().toString(36).slice(2, 8)}!2025`;
    
    let userId: string;
    let isExistingUser = false;
    
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: parentData.fullName,
      },
    });

    if (authError) {
      // Check if user already exists
      if (authError.code === 'email_exists') {
        console.log(`User with email ${email} already exists, looking up existing user`);
        
        // Find the existing user by email
        const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (listError) {
          console.error("Error listing users:", listError);
          return new Response(
            JSON.stringify({ error: "Failed to lookup existing user" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const existingUser = existingUsers.users.find(u => u.email === email);
        if (!existingUser) {
          return new Response(
            JSON.stringify({ error: "User exists but could not be found" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        userId = existingUser.id;
        isExistingUser = true;
        console.log(`Found existing user with id ${userId}`);
      } else {
        console.error("Auth user creation error:", authError);
        return new Response(
          JSON.stringify({ error: authError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      userId = authUser.user.id;
    }

    // Create or update profile with parent account type
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        full_name: parentData.fullName,
        phone_number: parentData.phoneNumber,
        account_type: "parent",
        must_reset_password: !isExistingUser, // Only require reset for new users
      }, { onConflict: 'id' });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // Only clean up auth user if it was newly created and profile creation fails
      if (!isExistingUser) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      }
      throw profileError;
    }

    // Assign student role (parents use student role for access) - use upsert to handle existing users
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({
        user_id: userId,
        role: "student",
      }, { onConflict: 'user_id,role', ignoreDuplicates: true });

    if (roleError) {
      console.error("Role assignment error:", roleError);
      // Don't fail the whole operation for role assignment
    }

    // Send welcome email if real email provided
    let emailSent = false;
    if (hasRealEmail && parentData.sendWelcomeEmail !== false) {
      try {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (resendApiKey) {
          const resend = new Resend(resendApiKey);
          const loginUrl = `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || 'https://lanatutors.com'}/login`;
          
          await resend.emails.send({
            from: "Lana Tutors <hello@lanatutors.com>",
            to: [email],
            subject: "Welcome to Lana Tutors - Your Account is Ready!",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #2563eb;">Welcome to Lana Tutors!</h1>
                <p>Dear ${parentData.fullName},</p>
                <p>Your parent account has been created. You can now access the Lana Tutors portal to manage your child's tutoring sessions.</p>
                
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0 0 10px 0;"><strong>Your Login Details:</strong></p>
                  <p style="margin: 5px 0;">Email: <strong>${email}</strong></p>
                  <p style="margin: 5px 0;">Temporary Password: <strong>${tempPassword}</strong></p>
                </div>
                
                <p><strong>Important:</strong> For security, you'll be asked to change your password when you first log in.</p>
                
                <a href="${loginUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                  Log In to Your Account
                </a>
                
                <p>If you have any questions, please don't hesitate to reach out to us.</p>
                <p>Best regards,<br>The Lana Tutors Team</p>
              </div>
            `,
          });
          emailSent = true;
          console.log(`Welcome email sent to ${email}`);
        }
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        // Don't fail the operation if email fails
      }
    }

    console.log(`Successfully created parent ${parentData.fullName} with id ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        email: hasRealEmail ? email : undefined,
        emailSent,
        message: hasRealEmail && emailSent 
          ? "Parent account created and welcome email sent!" 
          : "Parent profile created successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error creating parent profile:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
