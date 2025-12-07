import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface AdminEmailRequest {
  to: string;
  subject: string;
  html?: string;
  message?: string;
  recipientName?: string;
  replyTo?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html, message, recipientName, replyTo }: AdminEmailRequest = await req.json();

    console.log(`Sending admin email to ${to} with subject: ${subject}`);

    let emailHtml: string;

    // If custom HTML is provided, use it directly
    if (html) {
      emailHtml = html;
    } else {
      // Convert plain text message to HTML with line breaks
      const htmlMessage = (message || '').replace(/\n/g, '<br>');

      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 24px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Lana Tutors</h1>
                      <p style="color: #a3c9e8; margin: 8px 0 0 0; font-size: 14px;">Expert Online Tutoring</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 32px 24px;">
                      ${recipientName ? `<p style="margin: 0 0 16px 0;">Hi ${recipientName},</p>` : ''}
                      <div style="color: #333333; font-size: 15px; line-height: 1.6;">
                        ${htmlMessage}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 20px 24px; border-top: 1px solid #e9ecef;">
                      <p style="margin: 0; color: #6c757d; font-size: 12px;">
                        <strong>Lana Tutors</strong><br>
                        📧 info@lanatutors.africa<br>
                        🌐 <a href="https://lanatutors.africa" style="color: #2d5a87;">lanatutors.africa</a>
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
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Lana Tutors <info@lanatutors.africa>",
        to: [to],
        reply_to: replyTo || "info@lanatutors.africa",
        subject: subject,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const result = await emailResponse.json();
    console.log("Email sent successfully:", result);

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending admin email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
