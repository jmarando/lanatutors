import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { guardInternal } from "../_shared/auth-guard.ts";
import { PLACEHOLDER_DOMAIN, loginsWithPhone, nairobiToday, readEnrolInput, sameSet } from "../_shared/december.ts";

// The team enrols a child who reserved December classes: it finds or makes the family's login, the child's record and the
// enrolment (which holds a seat in each class), and says so on the family's timeline. It sends nothing to the family; the team
// sends the payment message from the desk. Admin only. The rules are in docs/superpowers/specs/2026-11-03-december-desk-design.md.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const fail = (message: string, error: unknown): Response => {
  console.error(message, error);
  return json(500, { error: `${message}. Nothing more was changed` });
};

const money = (n: number): number => Math.round(n * 100) / 100;
const classLabel = (c: { grade_levels: string[]; subject: string }): string => `${(c.grade_levels ?? []).join(" and ")} ${c.subject}`;
const labels = (list: { grade_levels: string[]; subject: string }[]): string => list.map(classLabel).join(", ");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const guard = await guardInternal(req, { requireAdmin: true });
  if (!guard.ok) return json(guard.status ?? 401, { error: guard.message });

  try {
    let raw: unknown = {};
    try {
      raw = await req.json();
    } catch (_) {
      // an empty body is refused below, field by field
    }
    const parsed = readEnrolInput(raw);
    if (!parsed.ok) return json(400, { error: parsed.error });
    const input = parsed.value;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    // Whether a login's address is a real one, for the answer (a placeholder gets no confirmation and no reminders).
    const emailIsPlaceholder = async (loginId: string): Promise<boolean> => {
      const { data } = await supabase.auth.admin.getUserById(loginId);
      const email = data?.user?.email ?? "";
      return !email || email.endsWith(PLACEHOLDER_DOMAIN);
    };

    // 1. The family, the classes and their program.
    const { data: family, error: familyError } = await supabase
      .from("families")
      .select("id, parent_name, phone, email, parent_profile_id")
      .eq("id", input.familyId)
      .maybeSingle();
    if (familyError) return fail("Could not read the family", familyError);
    if (!family) return json(404, { error: "That family was not found" });
    const phone = input.phone ?? family.phone ?? "";
    if (!phone) return json(400, { error: "This family has no phone number. Add one first" });

    const { data: classRows, error: classError } = await supabase
      .from("intensive_classes")
      .select("id, program_id, subject, curriculum, grade_levels, max_students, current_enrollment, status")
      .in("id", input.classIds);
    if (classError) return fail("Could not read the classes", classError);
    const classes = classRows ?? [];
    if (classes.length !== input.classIds.length) return json(404, { error: "One of those classes was not found" });

    const programId = classes[0].program_id;
    if (classes.some((c) => c.program_id !== programId)) {
      return json(409, { code: "wrong_program", error: "Those classes belong to different programs" });
    }
    const { data: program, error: programError } = await supabase
      .from("intensive_programs")
      .select("id, is_active, end_date")
      .eq("id", programId)
      .maybeSingle();
    if (programError) return fail("Could not read the program", programError);
    if (!program || !program.is_active || String(program.end_date).slice(0, 10) < nairobiToday()) {
      return json(409, { code: "wrong_program", error: "That program is not running or has already ended" });
    }
    const notRunning = classes.filter((c) => c.status !== "confirmed");
    if (notRunning.length > 0) {
      return json(409, { code: "class_not_running", error: `${labels(notRunning)} is not running yet. Open the class on the December desk first` });
    }

    // 2. The family's login, if it has one. Nothing is made yet.
    let loginId: string | null = family.parent_profile_id ?? null;
    if (!loginId) {
      const profiles: { id: string; phone_number: string | null }[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from("profiles").select("id, phone_number").order("id").range(from, from + 999);
        if (error) return fail("Could not look for the family's login", error);
        profiles.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      const matches = loginsWithPhone(profiles, phone);
      if (matches.length > 1) {
        return json(409, { code: "ambiguous_login", error: "More than one login has this phone number. Link the right one in Bootcamp Admin, then try again" });
      }
      // A team member's or a tutor's login is never a family's: their own WhatsApp chats make CRM families too.
      if (matches.length === 1) {
        const { data: staffRoles, error: rolesError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", matches[0])
          .in("role", ["admin", "tutor"]);
        if (rolesError) return fail("Could not check the login's roles", rolesError);
        if ((staffRoles ?? []).length > 0) {
          return json(409, { code: "staff_login", error: "This phone number belongs to a team or tutor login, so it was not linked. Check the family's number, then try again" });
        }
      }
      loginId = matches[0] ?? null;
    }

    // 3. The child's record and enrolment under that login, if they exist.
    let child: { id: string; full_name: string } | null = null;
    let existing: { id: string; enrolled_class_ids: string[]; payment_status: string; total_amount: number } | null = null;
    if (loginId) {
      const { data: kids, error: kidsError } = await supabase.from("students").select("id, full_name").eq("parent_id", loginId);
      if (kidsError) return fail("Could not read the family's children", kidsError);
      child = (kids ?? []).find((k) => String(k.full_name).trim().toLowerCase() === input.childName.toLowerCase()) ?? null;
      if (child) {
        const { data: found, error: foundError } = await supabase
          .from("intensive_enrollments")
          .select("id, enrolled_class_ids, payment_status, total_amount")
          .eq("program_id", programId)
          .eq("student_profile_id", child.id);
        if (foundError) return fail("Could not read the child's enrolment", foundError);
        existing = (found ?? [])[0] ?? null;
      }
    }

    const total = money(input.feePerSubject * input.classIds.length);

    // 4. An enrolment the child already has: the same classes is a repeat, a paid one is not changed, an unpaid one is replaced.
    if (existing && child && loginId && sameSet(existing.enrolled_class_ids ?? [], input.classIds)) {
      return json(200, {
        success: true, enrollmentId: existing.id, loginId, childId: child.id, loginCreated: false,
        emailIsPlaceholder: await emailIsPlaceholder(loginId), alreadyEnrolled: true, replaced: false,
        totalAmount: Number(existing.total_amount),
      });
    }
    if (existing) {
      const { data: payments, error: paymentError } = await supabase
        .from("payments")
        .select("id")
        .eq("reference_id", existing.id)
        .eq("payment_type", "intensive_enrollment")
        .eq("status", "completed");
      if (paymentError) return fail("Could not read the enrolment's payments", paymentError);
      if (existing.payment_status !== "pending" || (payments ?? []).length > 0) {
        return json(409, { code: "already_paid", error: "This child's enrolment has been paid for. Change its classes by hand in Bootcamp Admin" });
      }
    }

    // 5. Room. A seat the child already holds in a class does not count against it.
    const ownSeats = new Set(existing?.enrolled_class_ids ?? []);
    const full = classes.filter((c) => Number(c.current_enrollment ?? 0) - (ownSeats.has(c.id) ? 1 : 0) >= Number(c.max_students));
    if (full.length > 0) return json(409, { code: "class_full", error: `${labels(full)} is full` });

    // 6. The login, made now if the family has none.
    let loginCreated = false;
    let placeholder = false;
    if (!loginId) {
      const email = input.email ?? family.email ?? undefined;
      const response = await fetch(`${supabaseUrl}/functions/v1/create-parent-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: req.headers.get("Authorization") ?? "" },
        body: JSON.stringify({ fullName: input.parentName ?? family.parent_name ?? "Parent", phoneNumber: phone, email, sendWelcomeEmail: false }),
      });
      const made = await response.json().catch(() => ({}));
      if (!response.ok || !made?.userId) {
        return json(502, { error: `Could not make the family's login: ${made?.error ?? response.status}` });
      }
      loginId = String(made.userId);
      loginCreated = true;
      placeholder = !email;
    } else {
      placeholder = await emailIsPlaceholder(loginId);
    }

    // 7. The child's record.
    if (!child) {
      const first = classes[0];
      const { data: made, error: childError } = await supabase
        .from("students")
        .insert({ parent_id: loginId, full_name: input.childName, grade_level: first.grade_levels?.[0] ?? "", curriculum: first.curriculum })
        .select("id, full_name")
        .single();
      if (childError || !made) return fail("Could not save the child's record", childError);
      child = made;
    }

    // 8. The enrolment. An unpaid one in other classes is replaced; if the new one cannot be saved, the old one goes back (without
    // its Pesapal tracking id, which an unpaid enrolment made here does not have).
    let replaced = false;
    if (existing) {
      const { error: deleteError } = await supabase.from("intensive_enrollments").delete().eq("id", existing.id);
      if (deleteError) return fail("Could not replace the earlier enrolment", deleteError);
      replaced = true;
    }
    const { data: enrolment, error: enrolError } = await supabase
      .from("intensive_enrollments")
      .insert({
        program_id: programId,
        student_id: loginId,
        student_profile_id: child.id,
        enrolled_class_ids: input.classIds,
        total_subjects: input.classIds.length,
        total_amount: total,
        payment_status: "pending",
      })
      .select("id")
      .single();
    if (enrolError || !enrolment) {
      if (existing) {
        const { error: restoreError } = await supabase.from("intensive_enrollments").insert({
          id: existing.id,
          program_id: programId,
          student_id: loginId,
          student_profile_id: child.id,
          enrolled_class_ids: existing.enrolled_class_ids,
          total_subjects: (existing.enrolled_class_ids ?? []).length,
          total_amount: existing.total_amount,
          payment_status: existing.payment_status,
        });
        if (restoreError) console.error("Could not put the earlier enrolment back:", restoreError);
      }
      return fail("Could not save the enrolment", enrolError);
    }

    // 9. The family: link the login, and keep an email the team just gave. The enrolment stands if this fails.
    const patch: Record<string, unknown> = {};
    if (!family.parent_profile_id) patch.parent_profile_id = loginId;
    if (input.email && !family.email) patch.email = input.email;
    if (Object.keys(patch).length > 0) {
      const { error: patchError } = await supabase.from("families").update(patch).eq("id", family.id);
      if (patchError) console.error("Could not update the family:", patchError);
    }

    // 10. The timeline. It never starts with DEC26, which the reservation counter would read as a seat.
    const { error: lineError } = await supabase.from("lead_activities").insert({
      family_id: family.id,
      lead_id: null,
      kind: "system",
      created_by: guard.userId ?? null,
      body: `Enrolled ${input.childName} in ${labels(classes)} (KES ${total.toLocaleString("en-US")}, waiting for payment).`,
    });
    if (lineError) console.error("Could not add the timeline line:", lineError);

    return json(200, {
      success: true, enrollmentId: enrolment.id, loginId, childId: child.id, loginCreated,
      emailIsPlaceholder: placeholder, alreadyEnrolled: false, replaced, totalAmount: total,
    });
  } catch (error) {
    console.error("Error enrolling the child:", error);
    return json(500, { error: error instanceof Error ? error.message : "unknown_error" });
  }
});
