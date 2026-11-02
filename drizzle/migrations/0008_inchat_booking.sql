-- In-chat booking: families book the free assessment call in the WhatsApp chat with Lana.
-- Safe to run more than once.

-- Where a booking came from: null for the website and for bookings made before this, 'whatsapp' for the chat.
ALTER TABLE public.consultation_bookings ADD COLUMN IF NOT EXISTS booked_via text;

-- Two families cannot hold one time. Production holds 11 past times that were booked twice (the latest on 2026-08-18),
-- so a rule over every row would fail to build; this one starts on 2026-11-01 and leaves that history alone. The website
-- gets the same protection, and its booking form shows a clear message when the rule turns a booking down.
CREATE UNIQUE INDEX IF NOT EXISTS consultation_bookings_one_per_slot
  ON public.consultation_bookings (consultation_date, consultation_time)
  WHERE status <> 'cancelled' AND consultation_date >= DATE '2026-11-01';

-- crm_record_assessment_booking as in 0004, plus one thing: a booking made in the WhatsApp chat means the family is
-- waiting for its call, not for a reply, so the lead stops needing one. A website booking leaves the flag alone. Once the
-- flag is down, 0005 clears a leftover "Reply to the WhatsApp hand-off" step by itself.
CREATE OR REPLACE FUNCTION public.crm_record_assessment_booking(p public.consultation_bookings)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_family uuid := public.crm_upsert_family(p.phone_number, p.parent_name, p.email);
  v_at timestamptz := public.crm_assessment_time(p.consultation_date, p.consultation_time);
  v_lead uuid;
  v_quiet text := current_setting('crm.quiet', true);
BEGIN
  v_lead := public.crm_open_lead(v_family, 'assessment_form', 'consultation_bookings', p.id::text, coalesce(p.created_at, now()));
  -- The "Assessment call booked" entry below already says it; skip the generic stage entry.
  PERFORM set_config('crm.quiet', 'on', true);
  UPDATE leads SET
    needs_reply = CASE WHEN p.booked_via = 'whatsapp' THEN false ELSE needs_reply END,
    stage = CASE WHEN stage IN ('new', 'contacted') THEN 'call_booked' ELSE stage END,
    assessment_at = coalesce(v_at, assessment_at),
    next_step = CASE WHEN stage IN ('new', 'contacted', 'call_booked')
      THEN CASE WHEN v_at > now() THEN 'Hold the assessment call' ELSE 'Log the assessment call outcome' END
      ELSE next_step END,
    next_step_at = CASE WHEN stage IN ('new', 'contacted', 'call_booked') THEN v_at ELSE next_step_at END,
    student_name = coalesce(student_name, nullif(btrim(p.student_name), '')),
    grade_level = coalesce(grade_level, nullif(btrim(p.grade_level), '')),
    subjects = CASE WHEN cardinality(subjects) = 0 THEN coalesce(p.subjects_interest, '{}') ELSE subjects END,
    mode = coalesce(mode, p.preferred_mode),
    budget = coalesce(budget, p.budget_range),
    urgency = coalesce(urgency, p.urgency)
  WHERE id = v_lead;
  PERFORM set_config('crm.quiet', coalesce(v_quiet, ''), true);
  INSERT INTO lead_activities (family_id, lead_id, kind, body, source_table, source_id, occurred_at, created_by)
  VALUES (v_family, v_lead, 'assessment',
          'Assessment call booked for ' || coalesce(to_char(v_at AT TIME ZONE 'Africa/Nairobi', 'Dy DD Mon, HH12:MI AM'), 'an unknown time'),
          'consultation_bookings', p.id::text, coalesce(p.created_at, now()), NULL)
  ON CONFLICT DO NOTHING;
  RETURN v_family;
END $$;

REVOKE ALL ON FUNCTION public.crm_record_assessment_booking(public.consultation_bookings) FROM PUBLIC, anon, authenticated;
