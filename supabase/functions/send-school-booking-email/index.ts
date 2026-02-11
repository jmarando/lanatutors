import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BookingEmailRequest {
  teacherEmail: string;
  parentEmail: string;
  teacherName: string;
  parentName: string;
  studentName: string;
  className: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  reason?: string;
  schoolName: string;
}

const brandColor = "#8B1A1A";
const brandLight = "#FDF2F2";

function buildTeacherEmail(data: BookingEmailRequest): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
  <!-- Header -->
  <tr><td style="background-color:${brandColor};padding:24px 32px;">
    <h1 style="margin:0;color:#ffffff;font-size:22px;">${data.schoolName}</h1>
    <p style="margin:4px 0 0;color:#FFD700;font-size:13px;">Parent-Teacher Consultation</p>
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:32px;">
    <h2 style="margin:0 0 8px;color:${brandColor};font-size:18px;">New Meeting Booked</h2>
    <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.6;">
      A parent has booked a consultation slot with you. Here are the details:
    </p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background-color:${brandLight};border-radius:6px;border:1px solid #eee;">
      <tr><td style="font-size:13px;color:#888;width:130px;">Parent</td><td style="font-size:14px;font-weight:bold;color:#333;">${data.parentName}</td></tr>
      <tr><td style="font-size:13px;color:#888;border-top:1px solid #eee;">Student</td><td style="font-size:14px;font-weight:bold;color:#333;border-top:1px solid #eee;">${data.studentName} (${data.className})</td></tr>
      <tr><td style="font-size:13px;color:#888;border-top:1px solid #eee;">Date</td><td style="font-size:14px;font-weight:bold;color:#333;border-top:1px solid #eee;">${data.slotDate}</td></tr>
      <tr><td style="font-size:13px;color:#888;border-top:1px solid #eee;">Time</td><td style="font-size:14px;font-weight:bold;color:#333;border-top:1px solid #eee;">${data.startTime} – ${data.endTime}</td></tr>
      ${data.reason ? `<tr><td style="font-size:13px;color:#888;border-top:1px solid #eee;">Reason</td><td style="font-size:14px;color:#333;border-top:1px solid #eee;font-style:italic;">"${data.reason}"</td></tr>` : ''}
    </table>
    <p style="margin:24px 0 0;color:#555;font-size:14px;line-height:1.6;">
      Please ensure you are available at the scheduled time. If you need to reschedule, please contact the school administration.
    </p>
  </td></tr>
  <!-- Footer -->
  <tr><td style="background-color:#f8f8f8;padding:20px 32px;border-top:1px solid #eee;">
    <p style="margin:0;color:#999;font-size:12px;text-align:center;">
      This is an automated notification from ${data.schoolName} · Powered by Lana for Schools
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function buildParentEmail(data: BookingEmailRequest): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
  <!-- Header -->
  <tr><td style="background-color:${brandColor};padding:24px 32px;">
    <h1 style="margin:0;color:#ffffff;font-size:22px;">${data.schoolName}</h1>
    <p style="margin:4px 0 0;color:#FFD700;font-size:13px;">Meeting Confirmation</p>
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:32px;">
    <h2 style="margin:0 0 8px;color:${brandColor};font-size:18px;">Your Meeting is Confirmed! ✓</h2>
    <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.6;">
      Dear ${data.parentName},<br><br>
      Your parent-teacher consultation has been successfully booked. Please find the details below:
    </p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background-color:${brandLight};border-radius:6px;border:1px solid #eee;">
      <tr><td style="font-size:13px;color:#888;width:130px;">Teacher</td><td style="font-size:14px;font-weight:bold;color:#333;">${data.teacherName}</td></tr>
      <tr><td style="font-size:13px;color:#888;border-top:1px solid #eee;">Child</td><td style="font-size:14px;font-weight:bold;color:#333;border-top:1px solid #eee;">${data.studentName} (${data.className})</td></tr>
      <tr><td style="font-size:13px;color:#888;border-top:1px solid #eee;">Date</td><td style="font-size:14px;font-weight:bold;color:#333;border-top:1px solid #eee;">${data.slotDate}</td></tr>
      <tr><td style="font-size:13px;color:#888;border-top:1px solid #eee;">Time</td><td style="font-size:14px;font-weight:bold;color:#333;border-top:1px solid #eee;">${data.startTime} – ${data.endTime}</td></tr>
      ${data.reason ? `<tr><td style="font-size:13px;color:#888;border-top:1px solid #eee;">Your Note</td><td style="font-size:14px;color:#333;border-top:1px solid #eee;font-style:italic;">"${data.reason}"</td></tr>` : ''}
    </table>
    <p style="margin:24px 0 0;color:#555;font-size:14px;line-height:1.6;">
      Please arrive on time for your consultation. If you need to cancel, you can do so from the school portal.
    </p>
  </td></tr>
  <!-- Footer -->
  <tr><td style="background-color:#f8f8f8;padding:20px 32px;border-top:1px solid #eee;">
    <p style="margin:0;color:#999;font-size:12px;text-align:center;">
      This is an automated confirmation from ${data.schoolName} · Powered by Lana for Schools
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: BookingEmailRequest = await req.json();

    const results = await Promise.allSettled([
      resend.emails.send({
        from: "Lana for Schools <info@lanatutors.africa>",
        to: [data.teacherEmail],
        subject: `New Parent Meeting: ${data.parentName} – ${data.slotDate}`,
        html: buildTeacherEmail(data),
      }),
      resend.emails.send({
        from: "Lana for Schools <info@lanatutors.africa>",
        to: [data.parentEmail],
        subject: `Meeting Confirmed with ${data.teacherName} – ${data.slotDate}`,
        html: buildParentEmail(data),
      }),
    ]);

    const summary = results.map((r, i) => ({
      recipient: i === 0 ? "teacher" : "parent",
      status: r.status,
      ...(r.status === "fulfilled" ? { data: r.value } : { error: (r as PromiseRejectedResult).reason?.message }),
    }));

    console.log("Email results:", JSON.stringify(summary));

    return new Response(JSON.stringify({ success: true, results: summary }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending school booking emails:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
