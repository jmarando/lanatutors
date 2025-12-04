import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { packagePurchaseId } = await req.json();
    console.log('Sending package confirmation for:', packagePurchaseId);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch package purchase details
    const { data: packageData, error: packageError } = await supabase
      .from('package_purchases')
      .select('*')
      .eq('id', packagePurchaseId)
      .single();

    if (packageError || !packageData) {
      console.error('Package not found:', packageError);
      throw new Error('Package purchase not found');
    }

    // Fetch student profile and email
    const { data: studentProfile } = await supabase
      .from('profiles')
      .select('full_name, phone_number')
      .eq('id', packageData.student_id)
      .single();

    // If package has student_profile_id, fetch the student's name from students table
    let actualStudentName = studentProfile?.full_name;
    if (packageData.student_profile_id) {
      const { data: studentChildProfile } = await supabase
        .from('students')
        .select('full_name')
        .eq('id', packageData.student_profile_id)
        .maybeSingle();
      if (studentChildProfile?.full_name) {
        actualStudentName = studentChildProfile.full_name;
      }
    }
    
    // Check metadata for student name
    if ((packageData.metadata as any)?.studentName) {
      actualStudentName = (packageData.metadata as any).studentName;
    }

    // Get student email from auth
    const { data: { user: studentUser } } = await supabase.auth.admin.getUserById(packageData.student_id);
    const studentEmail = studentUser?.email;

    if (!studentEmail) {
      console.error('Student email not found');
      throw new Error('Student email not found');
    }

    // Fetch tutor profile and name
    const { data: tutorProfile } = await supabase
      .from('tutor_profiles')
      .select('user_id, email')
      .eq('id', packageData.tutor_id)
      .single();

    let tutorName = 'Your Tutor';
    let tutorEmail = tutorProfile?.email;

    if (tutorProfile?.user_id) {
      const { data: tutorUserProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', tutorProfile.user_id)
        .single();
      
      tutorName = tutorUserProfile?.full_name || 'Your Tutor';

      // Get tutor email from auth if not in profile
      if (!tutorEmail) {
        const { data: { user: tutorUser } } = await supabase.auth.admin.getUserById(tutorProfile.user_id);
        tutorEmail = tutorUser?.email;
      }
    }

    // Check metadata for tutor name and curriculum details
    const metadata = packageData.metadata as any;
    if (metadata?.tutorName) {
      tutorName = metadata.tutorName;
    }

    // Extract curriculum details from metadata
    const curriculum = metadata?.curriculum || '';
    const level = metadata?.level || '';
    const subject = metadata?.subject || '';

    // Fetch subject allocations
    const { data: allocations } = await supabase
      .from('package_subject_allocations')
      .select('subject, sessions_allocated')
      .eq('package_purchase_id', packagePurchaseId);

    const subjectsList = allocations?.map(a => `<li>${a.subject}: ${a.sessions_allocated} sessions</li>`).join('') || 
      `<li>${packageData.total_sessions} sessions</li>`;

    const balanceDue = packageData.total_amount - (packageData.amount_paid || 0);
    const isDeposit = balanceDue > 0;
    const studentName = actualStudentName || 'Student';
    
    // Build curriculum details HTML
    const curriculumDetailsHtml = (curriculum || level || subject) ? `
      ${curriculum ? `<tr>
        <td style="border-bottom: 1px solid #e5e7eb;">
          <strong style="color: #6b7280;">Curriculum:</strong>
        </td>
        <td style="border-bottom: 1px solid #e5e7eb; text-align: right;">
          ${curriculum}
        </td>
      </tr>` : ''}
      ${level ? `<tr>
        <td style="border-bottom: 1px solid #e5e7eb;">
          <strong style="color: #6b7280;">Level:</strong>
        </td>
        <td style="border-bottom: 1px solid #e5e7eb; text-align: right;">
          ${level}
        </td>
      </tr>` : ''}
      ${subject ? `<tr>
        <td style="border-bottom: 1px solid #e5e7eb;">
          <strong style="color: #6b7280;">Subject:</strong>
        </td>
        <td style="border-bottom: 1px solid #e5e7eb; text-align: right;">
          ${subject}
        </td>
      </tr>` : ''}
    ` : '';

    // Send confirmation email to student/parent
    const studentEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                <!-- Header -->
                <tr>
                  <td style="background-color: #7c3aed; padding: 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">LANA Tutors</h1>
                    <p style="color: #e0d4fc; margin: 10px 0 0 0;">Package Confirmation</p>
                  </td>
                </tr>
                
                <!-- Success Banner -->
                <tr>
                  <td style="background-color: #dcfce7; padding: 20px; text-align: center;">
                    <p style="color: #166534; font-size: 18px; margin: 0; font-weight: bold;">
                      ✓ Package Purchase Confirmed!
                    </p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 30px;">
                    <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">
                      Dear ${studentName},
                    </p>
                    <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">
                      Your tutoring package with <strong>${tutorName}</strong> has been successfully purchased. Here are your package details:
                    </p>
                    
                    <!-- Package Details -->
                    <table width="100%" cellpadding="10" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin: 20px 0;">
                      <tr>
                        <td style="border-bottom: 1px solid #e5e7eb;">
                          <strong style="color: #6b7280;">Package:</strong>
                        </td>
                        <td style="border-bottom: 1px solid #e5e7eb; text-align: right;">
                          <strong>${packageData.total_sessions} Session Bundle</strong>
                        </td>
                      </tr>
                      ${curriculumDetailsHtml}
                      <tr>
                        <td style="border-bottom: 1px solid #e5e7eb;">
                          <strong style="color: #6b7280;">Total Amount:</strong>
                        </td>
                        <td style="border-bottom: 1px solid #e5e7eb; text-align: right;">
                          KES ${packageData.total_amount.toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td style="border-bottom: 1px solid #e5e7eb;">
                          <strong style="color: #6b7280;">Amount Paid:</strong>
                        </td>
                        <td style="border-bottom: 1px solid #e5e7eb; text-align: right; color: #16a34a;">
                          KES ${(packageData.amount_paid || 0).toLocaleString()}
                        </td>
                      </tr>
                      ${isDeposit ? `
                      <tr>
                        <td>
                          <strong style="color: #dc2626;">Balance Due:</strong>
                        </td>
                        <td style="text-align: right; color: #dc2626; font-weight: bold;">
                          KES ${balanceDue.toLocaleString()}
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                    
                    ${isDeposit ? `
                    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                      <p style="color: #991b1b; margin: 0; font-size: 14px;">
                        <strong>⚠️ Balance Due:</strong> Please complete the remaining payment of KES ${balanceDue.toLocaleString()} before scheduling your sessions. You can pay from your Student Dashboard.
                      </p>
                    </div>
                    ` : ''}
                    
                    <!-- How to Redeem Your Sessions -->
                    <h3 style="color: #333; margin: 30px 0 15px 0;">📚 How to Redeem Your Sessions</h3>
                    <div style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                      <ol style="color: #333; padding-left: 20px; margin: 0;">
                        <li style="margin-bottom: 12px;"><strong>Log in</strong> to your <a href="https://lanatutors.africa/student/dashboard#packages" style="color: #7c3aed; text-decoration: underline;">Student Dashboard</a></li>
                        <li style="margin-bottom: 12px;">Go to the <strong>"My Packages"</strong> tab</li>
                        <li style="margin-bottom: 12px;">Find your package and click <strong>"Book a Session"</strong></li>
                        <li style="margin-bottom: 12px;">Select a time slot on ${tutorName}'s calendar</li>
                        <li style="margin-bottom: 12px;">Choose <strong>"Use Package"</strong> as your payment option</li>
                        <li style="margin-bottom: 0;">Confirm your booking - no additional payment needed!</li>
                      </ol>
                    </div>
                    
                    ${isDeposit ? `
                    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                      <p style="color: #991b1b; margin: 0; font-size: 14px;">
                        <strong>⚠️ Important:</strong> Please complete the remaining payment of KES ${balanceDue.toLocaleString()} before scheduling your sessions. You can pay from your Student Dashboard → My Packages.
                      </p>
                    </div>
                    ` : ''}
                    
                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                      <tr>
                        <td align="center">
                          <a href="https://lanatutors.africa/student/dashboard" 
                             style="background-color: #7c3aed; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                            Go to Dashboard →
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="color: #6b7280; font-size: 14px; margin: 30px 0 0 0;">
                      If you have any questions, please contact us at <a href="mailto:info@lanatutors.africa" style="color: #7c3aed;">info@lanatutors.africa</a>
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 12px; margin: 0;">
                      © ${new Date().getFullYear()} LANA Tutors. All rights reserved.
                    </p>
                    <p style="color: #6b7280; font-size: 12px; margin: 5px 0 0 0;">
                      Nairobi, Kenya
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Send email to student via Resend API
    const studentEmailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: "Lana Tutors <info@lanatutors.africa>",
        to: [studentEmail],
        subject: `Package Confirmed: ${packageData.total_sessions} Sessions with ${tutorName}`,
        html: studentEmailHtml,
      }),
    });

    const studentEmailError = !studentEmailRes.ok ? await studentEmailRes.text() : null;

    if (studentEmailError) {
      console.error("Error sending student email:", studentEmailError);
    } else {
      console.log("Student confirmation email sent successfully");
    }

    // Send notification email to tutor
    if (tutorEmail) {
      const tutorEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #7c3aed; padding: 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">LANA Tutors</h1>
                      <p style="color: #e0d4fc; margin: 10px 0 0 0;">New Package Purchase</p>
                    </td>
                  </tr>
                  
                  <!-- Success Banner -->
                  <tr>
                    <td style="background-color: #dcfce7; padding: 20px; text-align: center;">
                      <p style="color: #166534; font-size: 18px; margin: 0; font-weight: bold;">
                        🎉 New Package Sold!
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 30px;">
                      <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">
                        Dear ${tutorName},
                      </p>
                      <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">
                        Great news! <strong>${studentName}</strong> has purchased a tutoring package with you.
                      </p>
                      
                      <!-- Package Details -->
                      <table width="100%" cellpadding="10" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin: 20px 0;">
                        <tr>
                          <td style="border-bottom: 1px solid #e5e7eb;">
                            <strong style="color: #6b7280;">Student:</strong>
                          </td>
                          <td style="border-bottom: 1px solid #e5e7eb; text-align: right;">
                            ${studentName}
                          </td>
                        </tr>
                        <tr>
                          <td style="border-bottom: 1px solid #e5e7eb;">
                            <strong style="color: #6b7280;">Package:</strong>
                          </td>
                          <td style="border-bottom: 1px solid #e5e7eb; text-align: right;">
                            ${packageData.total_sessions} Session Bundle
                          </td>
                        </tr>
                        ${curriculumDetailsHtml}
                      </table>
                      
                      <p style="color: #555; font-size: 14px; margin: 20px 0;">
                        The student will schedule sessions with you soon. Please ensure your availability is up to date.
                      </p>
                      
                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="https://lanatutors.africa/tutor/dashboard" 
                               style="background-color: #7c3aed; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                              View Dashboard →
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="color: #6b7280; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} LANA Tutors. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const tutorEmailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: "Lana Tutors <info@lanatutors.africa>",
          to: [tutorEmail],
          subject: `New Package Purchase: ${packageData.total_sessions} Sessions from ${studentName}`,
          html: tutorEmailHtml,
        }),
      });

      const tutorEmailError = !tutorEmailRes.ok ? await tutorEmailRes.text() : null;

      if (tutorEmailError) {
        console.error("Error sending tutor email:", tutorEmailError);
      } else {
        console.log("Tutor notification email sent successfully");
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-package-confirmation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});