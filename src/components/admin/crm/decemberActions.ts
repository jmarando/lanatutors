import { supabase } from "@/integrations/supabase/client";

/** A function that refuses says why in its response; the invoke error only carries the response, so read the message out of it. */
export async function messageFrom(error: unknown): Promise<string> {
  const response = (error as { context?: Response } | null)?.context;
  if (response && typeof response.json === "function") {
    try {
      const body = await response.json();
      if (body?.error) return String(body.error);
    } catch {
      // not JSON: fall through to the generic message
    }
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

export type ClassStatus = "active" | "confirmed" | "archived";

/**
 * Opens a class (confirmed), archives it, or puts it back to taking reservations. Admins already have full rights on
 * intensive_classes. Archiving or taking a class back to reservations is refused while an enrolment includes it, even if the
 * button was shown as usable on a stale screen. Opening never blocks.
 */
export async function setClassStatus(classId: string, status: ClassStatus): Promise<string | null> {
  if (status !== "confirmed") {
    const { data: held, error: heldError } = await supabase
      .from("intensive_enrollments")
      .select("id")
      .contains("enrolled_class_ids", [classId])
      .limit(1);
    if (heldError) return heldError.message;
    if ((held ?? []).length > 0) return "This class has enrolments. Release them first";
  }
  const { error } = await supabase.from("intensive_classes").update({ status }).eq("id", classId);
  return error ? error.message : null;
}

/**
 * Frees the seat of an enrolment that is still unpaid. The delete carries the `pending` filter, so a payment that lands in
 * between stops it, and a completed payment row stops it before that.
 */
export async function releaseSeat(enrolmentId: string): Promise<string | null> {
  const { data: payments, error: paymentError } = await supabase
    .from("payments")
    .select("id")
    .eq("reference_id", enrolmentId)
    .eq("payment_type", "intensive_enrollment")
    .eq("status", "completed");
  if (paymentError) return paymentError.message;
  if ((payments ?? []).length > 0) return "A payment has been recorded for this enrolment, so the seat cannot be released";
  const { data, error } = await supabase
    .from("intensive_enrollments")
    .delete()
    .eq("id", enrolmentId)
    .eq("payment_status", "pending")
    .select("id");
  if (error) return error.message;
  return (data ?? []).length === 0 ? "This enrolment is no longer unpaid, so it was not released" : null;
}

export interface EnrolRequest {
  familyId: string;
  childName: string;
  classIds: string[];
  feePerSubject: number;
  parentName?: string;
  phone?: string;
  email?: string;
}

export interface EnrolResult {
  enrollmentId: string;
  loginId: string;
  childId: string;
  loginCreated: boolean;
  emailIsPlaceholder: boolean;
  alreadyEnrolled: boolean;
  replaced: boolean;
  totalAmount: number;
}

/** Calls enrol-december-family. The message is the function's own sentence when it refused. */
export async function enrolFamily(request: EnrolRequest): Promise<{ result: EnrolResult } | { error: string }> {
  const { data, error } = await supabase.functions.invoke("enrol-december-family", { body: request });
  if (error) return { error: await messageFrom(error) };
  return { result: data as EnrolResult };
}
