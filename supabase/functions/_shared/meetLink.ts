// Returns the existing Google Meet link already used for the same
// student + tutor + subject, so each pair keeps one permanent link.
// deno-lint-ignore no-explicit-any
export async function findExistingMeetLink(supabase: any, bookingId: string): Promise<string | null> {
  const { data: booking } = await supabase
    .from("bookings")
    .select("student_id, tutor_id, subject")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return null;

  const { data: prior } = await supabase
    .from("bookings")
    .select("meeting_link")
    .eq("student_id", booking.student_id)
    .eq("tutor_id", booking.tutor_id)
    .eq("subject", booking.subject)
    .neq("id", bookingId)
    .like("meeting_link", "https://meet.google.com/%")
    .order("created_at", { ascending: true })
    .limit(1);

  return prior?.[0]?.meeting_link ?? null;
}
