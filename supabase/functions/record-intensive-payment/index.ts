import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { guardInternal } from "../_shared/auth-guard.ts";

// Records a holiday-class payment that a family made to the paybill and not through Pesapal. It does what a
// completed Pesapal payment does (pesapal-callback): a row in `payments`, the enrolment's payment_status, and the
// confirmation email. The browser cannot write `payments` (only the backend can), so the admin screen calls this.
//
// Who may call it: a signed-in admin, or another function with the service-role key (the shared guard). A mistake
// here gives a child a place that was not paid for, so it also refuses an M-Pesa reference already used for another
// enrolment, and more than the balance owed.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// An M-Pesa code is ten letters and digits; a bank reference may be a little longer. Nothing with markup gets in.
const REFERENCE = /^[A-Za-z0-9][A-Za-z0-9 _./-]{3,39}$/;
const PAYBILL = "mpesa_paybill";

const money = (n: number): number => Math.round(n * 100) / 100;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const guard = await guardInternal(req, { requireAdmin: true });
  if (!guard.ok) return json(guard.status ?? 401, { error: guard.message });

  try {
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch (_) {
      // an empty body is refused below, field by field
    }

    const enrollmentId = typeof body.enrollmentId === "string" ? body.enrollmentId.trim() : "";
    const amount = money(Number(body.amount));
    const reference = typeof body.reference === "string" ? body.reference.trim() : "";
    const receivedOn = typeof body.receivedOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.receivedOn) ? body.receivedOn : null;

    if (!UUID.test(enrollmentId)) return json(400, { error: "Choose the enrolment this payment is for" });
    if (!Number.isFinite(amount) || amount <= 0) return json(400, { error: "Enter the amount received: more than zero" });
    if (!REFERENCE.test(reference)) return json(400, { error: "Enter the M-Pesa reference: 4 to 40 letters and numbers" });
    const ref = reference.toUpperCase();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: enrollment, error: enrollmentError } = await supabase
      .from("intensive_enrollments")
      .select("id, student_id, total_amount, payment_status")
      .eq("id", enrollmentId)
      .maybeSingle();
    if (enrollmentError) {
      console.error("Error reading the enrolment:", enrollmentError);
      return json(500, { error: "Could not read the enrolment" });
    }
    if (!enrollment) return json(404, { error: "That enrolment was not found" });

    // What this enrolment has paid so far, by any route (Pesapal or an earlier paybill entry).
    const { data: earlier, error: earlierError } = await supabase
      .from("payments")
      .select("id, amount, status, pesapal_payment_method, pesapal_confirmation_code")
      .eq("reference_id", enrollment.id)
      .eq("payment_type", "intensive_enrollment");
    if (earlierError) {
      console.error("Error reading earlier payments:", earlierError);
      return json(500, { error: "Could not read this enrolment's payments" });
    }
    const paidBefore = money(
      (earlier ?? []).filter((p) => p.status === "completed").reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    );
    // The same reference sent again for this same enrolment is a repeat, not a second payment: it only finishes
    // whatever the first attempt did not (the payment may have been written and the enrolment not yet updated).
    const alreadyRecorded = (earlier ?? []).some(
      (p) => p.pesapal_payment_method === PAYBILL && p.pesapal_confirmation_code === ref,
    );

    if (!alreadyRecorded) {
      const { data: used, error: usedError } = await supabase
        .from("payments")
        .select("id, reference_id")
        .eq("pesapal_payment_method", PAYBILL)
        .eq("pesapal_confirmation_code", ref);
      if (usedError) {
        console.error("Error checking the reference:", usedError);
        return json(500, { error: "Could not check the M-Pesa reference" });
      }
      if ((used ?? []).length > 0) {
        return json(409, { error: "That M-Pesa reference is already recorded against another enrolment" });
      }
    }

    const total = money(Number(enrollment.total_amount) || 0);
    if (!alreadyRecorded) {
      if (enrollment.payment_status === "completed" || paidBefore >= total) {
        return json(409, { error: "This enrolment is already paid in full" });
      }
      const balance = money(total - paidBefore);
      if (amount > balance) return json(400, { error: `That is more than the balance of KES ${balance}` });

      const { data: profile } = await supabase
        .from("profiles")
        .select("phone_number")
        .eq("id", enrollment.student_id)
        .maybeSingle();

      const row: Record<string, unknown> = {
        user_id: enrollment.student_id,
        phone_number: profile?.phone_number || "paybill",
        amount,
        currency: "KES",
        payment_type: "intensive_enrollment",
        reference_id: enrollment.id,
        status: "completed",
        pesapal_payment_method: PAYBILL,
        pesapal_confirmation_code: ref,
        pesapal_merchant_reference: `OFFLINE-${enrollment.id}-${ref}`,
      };
      // The day the money arrived, when it was not today (noon in Nairobi, so no time zone moves the date).
      if (receivedOn) row.created_at = `${receivedOn}T12:00:00+03:00`;

      const { error: insertError } = await supabase.from("payments").insert(row);
      if (insertError) {
        console.error("Error recording the payment:", insertError);
        return json(500, { error: "Could not record the payment. Nothing was changed" });
      }
    }

    const paidTotal = money(paidBefore + (alreadyRecorded ? 0 : amount));
    const fullyPaid = paidTotal >= total;
    const nextStatus = fullyPaid ? "completed" : "deposit_paid";
    const changed = enrollment.payment_status !== nextStatus;

    if (changed) {
      const { error: updateError } = await supabase
        .from("intensive_enrollments")
        .update({ payment_status: nextStatus })
        .eq("id", enrollment.id);
      if (updateError) {
        console.error("Error updating the enrolment:", updateError);
        return json(500, {
          error: "The payment was recorded but the enrolment could not be updated. Send the same reference again to finish",
        });
      }
    }

    // The confirmation goes out once, when the last of the money is in. If it fails the payment stands, and the
    // admin is told so they can send it another way.
    let emailSent = false;
    if (fullyPaid && changed && body.sendEmail !== false) {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-intensive-enrollment-confirmation`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify({ enrollmentId: enrollment.id }),
        });
        emailSent = response.ok;
        if (!response.ok) console.error("Confirmation email failed:", response.status, await response.text());
      } catch (error) {
        console.error("Confirmation email failed:", error);
      }
    }

    return json(200, {
      success: true,
      status: nextStatus,
      paid_total: paidTotal,
      balance: money(Math.max(total - paidTotal, 0)),
      email_sent: emailSent,
      already_recorded: alreadyRecorded,
    });
  } catch (error) {
    console.error("Error recording the payment:", error);
    return json(500, { error: error instanceof Error ? error.message : "unknown_error" });
  }
});
