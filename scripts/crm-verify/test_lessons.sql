-- Behaviour tests for drizzle/migrations/0006_crm_lessons.sql.
-- Run by run.sh after the migration; every block raises on failure, so psql stops at the first one.
-- Cases T01-T10 are the plan's (docs/superpowers/plans/2026-10-29-crm-lessons-slice.md, Task 1),
-- amended: confirming a lesson never changes bookings.status. T11 onwards cover the booking
-- trigger, late payments, undo and the cut-over.
\set ON_ERROR_STOP on

CREATE SCHEMA IF NOT EXISTS crm_test;
GRANT USAGE ON SCHEMA crm_test TO PUBLIC;

CREATE OR REPLACE FUNCTION crm_test.id(n int) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
  SELECT ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
$$;
CREATE OR REPLACE FUNCTION crm_test.assert(ok boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT coalesce(ok, false) THEN RAISE EXCEPTION 'ASSERT FAILED: %', msg; END IF;
END $$;
CREATE OR REPLACE FUNCTION crm_test.as_user(p_user uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_user::text, true);
  SET LOCAL ROLE authenticated;
END $$;
CREATE OR REPLACE FUNCTION crm_test.as_admin() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM crm_test.as_user(crm_test.id(1));
END $$;
-- A free slot for a tutor, then a booking on it (run as the table owner).
CREATE OR REPLACE FUNCTION crm_test.slot(p_tutor uuid, p_start timestamptz) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v uuid;
BEGIN
  INSERT INTO public.tutor_availability (tutor_id, start_time, end_time, slot_type)
  VALUES (p_tutor, p_start, p_start + interval '1 hour', 'manual') RETURNING id INTO v;
  RETURN v;
END $$;
CREATE OR REPLACE FUNCTION crm_test.book(p_parent uuid, p_tutor uuid, p_child uuid, p_subject text,
                                         p_start timestamptz, p_status text DEFAULT 'confirmed')
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v uuid;
BEGIN
  INSERT INTO public.bookings (student_id, tutor_id, availability_slot_id, subject, amount, status, student_profile_id, booking_source)
  VALUES (p_parent, p_tutor, crm_test.slot(p_tutor, p_start), p_subject, 3000, p_status, p_child, 'manual')
  RETURNING id INTO v;
  RETURN v;
END $$;
CREATE TABLE IF NOT EXISTS crm_test.ctx (key text PRIMARY KEY, val uuid);
GRANT SELECT ON crm_test.ctx TO PUBLIC;
CREATE OR REPLACE FUNCTION crm_test.get(p_key text) RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT val FROM crm_test.ctx WHERE key = p_key
$$;

-- ------------------------------------------------------------------ fixtures
INSERT INTO auth.users (id, email) VALUES
  (crm_test.id(1), 'admin@example.test'), (crm_test.id(11), 'parent1@example.test'),
  (crm_test.id(12), 'parent2@example.test'), (crm_test.id(13), 'parent3@example.test'),
  (crm_test.id(21), 'tutor1@example.test'), (crm_test.id(22), 'tutor2@example.test');
INSERT INTO public.profiles (id, full_name, phone_number) VALUES
  (crm_test.id(1), 'Admin One', NULL), (crm_test.id(11), 'Parent One', '0712 000 001'),
  (crm_test.id(12), 'Parent Two', '+254 712 000 002'), (crm_test.id(13), 'Parent Three', NULL),
  (crm_test.id(21), 'Tutor One', '0722 000 001'), (crm_test.id(22), 'Tutor Two', '0722 000 002');
INSERT INTO public.user_roles (user_id, role) VALUES
  (crm_test.id(1), 'admin'), (crm_test.id(21), 'tutor'), (crm_test.id(22), 'tutor');
INSERT INTO public.tutor_profiles (id, user_id, subjects, verified, is_listed) VALUES
  (crm_test.id(31), crm_test.id(21), '{Maths}', true, true),
  (crm_test.id(32), crm_test.id(22), '{English}', true, true);
INSERT INTO public.students (id, parent_id, full_name, curriculum, grade_level) VALUES
  (crm_test.id(41), crm_test.id(11), 'Amani Kamau', 'CBC', 'Grade 6'),
  (crm_test.id(42), crm_test.id(11), 'Zuri Kamau', 'CBC', 'Grade 4'),
  (crm_test.id(43), crm_test.id(12), 'Baraka Otieno', 'IGCSE', 'Year 9');

-- ------------------------------------------------------------------ T00 constants
DO $$
BEGIN
  PERFORM crm_test.assert(public.crm_tutor_share() = 0.70, 'T00 tutor share is a constant 70%');
  RAISE NOTICE 'T00 ok';
END $$;

-- ------------------------------------------------------------------ T01 a pack of 8 at KES 3,000
DO $$
DECLARE f uuid; e uuid; p uuid; r record;
BEGIN
  f := public.crm_upsert_family('0712 000 001', 'Parent One', 'parent1@example.test');
  INSERT INTO public.enrolments (family_id, student_id, student_name, subject, tutor_id)
  VALUES (f, crm_test.id(41), 'Amani Kamau', 'Maths', crm_test.id(31)) RETURNING id INTO e;
  INSERT INTO public.session_packs (enrolment_id, amount_kes, reference, paid_on, sessions_bought)
  VALUES (e, 24000, 'PACK-A1', DATE '2026-10-01', 8) RETURNING id INTO p;
  SELECT * INTO r FROM public.crm_enrolment_balances WHERE enrolment_id = e;
  PERFORM crm_test.assert(r.sessions_left = 8, 'T01 sessions_left is 8, got ' || r.sessions_left);
  PERFORM crm_test.assert(r.balance = 24000, 'T01 balance is 24,000, got ' || r.balance);
  PERFORM crm_test.assert(r.rate_per_session = 3000, 'T01 the rate defaults to amount / sessions, got ' || r.rate_per_session);
  PERFORM crm_test.assert(r.amount_paid = 24000 AND r.sessions_bought = 8 AND r.sessions_used = 0, 'T01 totals');
  INSERT INTO crm_test.ctx VALUES ('f1', f), ('e1', e), ('pack1', p);
  RAISE NOTICE 'T01 ok';
END $$;

-- ------------------------------------------------------------------ T02 a delivered lesson uses the oldest pack
DO $$
DECLARE e uuid := crm_test.get('e1'); b uuid; rep public.lesson_reports; used int; st text; r record;
BEGIN
  b := crm_test.book(crm_test.id(11), crm_test.id(21), crm_test.id(41), 'Maths', now() - interval '3 days');
  PERFORM crm_test.assert((SELECT enrolment_id FROM public.bookings WHERE id = b) = e,
    'T02 the booking trigger linked the lesson to the existing enrolment');
  PERFORM crm_test.as_admin();
  INSERT INTO public.lesson_reports (booking_id, attendance, covered, homework, engagement)
  VALUES (b, 'delivered', 'Fractions', 'Page 14', 4) RETURNING * INTO rep;
  RESET ROLE;
  PERFORM crm_test.assert(rep.pack_id = crm_test.get('pack1'), 'T02 the lesson used pack 1');
  PERFORM crm_test.assert(rep.tutor_pay_kes = 2100, 'T02 tutor pay is 70% of KES 3,000, got ' || coalesce(rep.tutor_pay_kes::text, 'null'));
  PERFORM crm_test.assert(rep.enrolment_id = e, 'T02 the report carries the enrolment');
  SELECT sessions_used INTO used FROM public.session_packs WHERE id = crm_test.get('pack1');
  PERFORM crm_test.assert(used = 1, 'T02 pack 1 has one session used');
  SELECT status INTO st FROM public.bookings WHERE id = b;
  PERFORM crm_test.assert(st = 'confirmed', 'T02 bookings.status is left alone (the reminder and feedback emails filter on confirmed), got ' || st);
  SELECT * INTO r FROM public.crm_enrolment_balances WHERE enrolment_id = e;
  PERFORM crm_test.assert(r.sessions_left = 7 AND r.balance = 21000, 'T02 balance after one lesson');
  INSERT INTO crm_test.ctx VALUES ('b_t2', b);
  RAISE NOTICE 'T02 ok';
END $$;

-- ------------------------------------------------------------------ T03 a later pack is not touched while the first has sessions left
DO $$
DECLARE e uuid := crm_test.get('e1'); b uuid; rep public.lesson_reports; p2 uuid; u1 int; u2 int;
BEGIN
  INSERT INTO public.session_packs (enrolment_id, amount_kes, reference, paid_on, sessions_bought)
  VALUES (e, 10000, 'PACK-A2', DATE '2026-10-20', 4) RETURNING id INTO p2;
  b := crm_test.book(crm_test.id(11), crm_test.id(21), crm_test.id(41), 'Maths', now() - interval '2 days');
  PERFORM crm_test.as_admin();
  INSERT INTO public.lesson_reports (booking_id, attendance) VALUES (b, 'delivered') RETURNING * INTO rep;
  RESET ROLE;
  SELECT sessions_used INTO u1 FROM public.session_packs WHERE id = crm_test.get('pack1');
  SELECT sessions_used INTO u2 FROM public.session_packs WHERE id = p2;
  PERFORM crm_test.assert(u1 = 2 AND u2 = 0, 'T03 the second pack is untouched, got ' || u1 || '/' || u2);
  PERFORM crm_test.assert(rep.pack_id = crm_test.get('pack1') AND rep.tutor_pay_kes = 2100, 'T03 priced from pack 1');
  INSERT INTO crm_test.ctx VALUES ('pack2', p2), ('b_t3', b);

  -- When the oldest pack is full the next one is used, at its own rate.
  DECLARE e2 uuid; x uuid; y uuid; b1 uuid; b2 uuid; r1 public.lesson_reports; r2 public.lesson_reports; f uuid := crm_test.get('f1');
  BEGIN
    INSERT INTO public.enrolments (family_id, student_name, subject, tutor_id)
    VALUES (f, 'Zuri Kamau', 'English', crm_test.id(32)) RETURNING id INTO e2;
    INSERT INTO public.session_packs (enrolment_id, amount_kes, sessions_bought, paid_on) VALUES (e2, 2000, 1, DATE '2026-10-01') RETURNING id INTO x;
    INSERT INTO public.session_packs (enrolment_id, amount_kes, sessions_bought, paid_on) VALUES (e2, 6000, 3, DATE '2026-10-10') RETURNING id INTO y;
    b1 := crm_test.book(crm_test.id(11), crm_test.id(22), crm_test.id(42), 'English', now() - interval '6 days');
    b2 := crm_test.book(crm_test.id(11), crm_test.id(22), crm_test.id(42), 'English', now() - interval '5 days');
    PERFORM crm_test.assert((SELECT enrolment_id FROM public.bookings WHERE id = b1) = e2
      AND (SELECT enrolment_id FROM public.bookings WHERE id = b2) = e2, 'T03b both lessons matched the hand-made Zuri / English enrolment');
    PERFORM crm_test.as_admin();
    INSERT INTO public.lesson_reports (booking_id, attendance) VALUES (b1, 'delivered') RETURNING * INTO r1;
    INSERT INTO public.lesson_reports (booking_id, attendance) VALUES (b2, 'delivered') RETURNING * INTO r2;
    RESET ROLE;
    PERFORM crm_test.assert(r1.pack_id = x AND r1.tutor_pay_kes = 1400, 'T03b the first lesson used the one-session pack at 70% of 2,000');
    PERFORM crm_test.assert(r2.pack_id = y AND r2.tutor_pay_kes = 1400, 'T03b the second lesson moved on to the next pack at 70% of 2,000 (6,000 / 3 = 2,000 as well)');
  END;
  RAISE NOTICE 'T03 ok';
END $$;

-- ------------------------------------------------------------------ T04 which attendance uses a session
DO $$
DECLARE e uuid := crm_test.get('e1'); b uuid; rep public.lesson_reports; before_used int; after_used int; att text; i int := 0;
BEGIN
  SELECT sessions_used INTO before_used FROM public.session_packs WHERE id = crm_test.get('pack1');
  FOREACH att IN ARRAY ARRAY['student_absent', 'late_cancellation', 'tutor_absent', 'cancelled'] LOOP
    i := i + 1;
    b := crm_test.book(crm_test.id(11), crm_test.id(21), crm_test.id(41), 'Maths', now() - (i || ' hours')::interval - interval '1 day');
    PERFORM crm_test.as_admin();
    INSERT INTO public.lesson_reports (booking_id, attendance) VALUES (b, att) RETURNING * INTO rep;
    RESET ROLE;
    IF att IN ('student_absent', 'late_cancellation') THEN
      PERFORM crm_test.assert(rep.pack_id = crm_test.get('pack1') AND rep.tutor_pay_kes = 2100, 'T04 ' || att || ' counts as a session taken and the tutor is paid');
    ELSE
      PERFORM crm_test.assert(rep.pack_id IS NULL AND rep.tutor_pay_kes = 0, 'T04 ' || att || ' uses no session and pays nothing, got ' || coalesce(rep.tutor_pay_kes::text, 'null'));
    END IF;
  END LOOP;
  SELECT sessions_used INTO after_used FROM public.session_packs WHERE id = crm_test.get('pack1');
  PERFORM crm_test.assert(after_used = before_used + 2, 'T04 exactly two of the four consumed a session, got +' || (after_used - before_used));
  RAISE NOTICE 'T04 ok';
END $$;

-- ------------------------------------------------------------------ T05 one report per lesson
DO $$
DECLARE b uuid := crm_test.get('b_t2');
BEGIN
  BEGIN
    PERFORM crm_test.as_admin();
    INSERT INTO public.lesson_reports (booking_id, attendance) VALUES (b, 'delivered');
    RESET ROLE;
    RAISE EXCEPTION 'ASSERT FAILED: T05 a second report for the same lesson was accepted';
  EXCEPTION WHEN unique_violation THEN
    RESET ROLE;
  END;
  RAISE NOTICE 'T05 ok';
END $$;

-- ------------------------------------------------------------------ T06 a family with no pack: the report is still saved
DO $$
DECLARE b uuid; rep public.lesson_reports; e uuid; r record;
BEGIN
  b := crm_test.book(crm_test.id(12), crm_test.id(22), crm_test.id(43), 'English', now() - interval '5 days');
  e := (SELECT enrolment_id FROM public.bookings WHERE id = b);
  PERFORM crm_test.assert(e IS NOT NULL, 'T06 the booking trigger created an enrolment for a new family');
  PERFORM crm_test.assert((SELECT phone FROM public.families f JOIN public.enrolments en ON en.family_id = f.id WHERE en.id = e) = '254712000002',
    'T06 the family was found or created by the parent''s normalised phone');
  PERFORM crm_test.as_admin();
  INSERT INTO public.lesson_reports (booking_id, attendance) VALUES (b, 'delivered') RETURNING * INTO rep;
  RESET ROLE;
  PERFORM crm_test.assert(rep.id IS NOT NULL AND rep.pack_id IS NULL AND rep.tutor_pay_kes IS NULL,
    'T06 saved with no pack and no pay');
  SELECT * INTO r FROM public.crm_enrolment_balances WHERE enrolment_id = e;
  PERFORM crm_test.assert(r.unpriced_lessons = 1 AND r.sessions_bought = 0, 'T06 the lesson shows as waiting for a payment');
  INSERT INTO crm_test.ctx VALUES ('e3', e), ('b_t6', b);
  RAISE NOTICE 'T06 ok';
END $$;

-- ------------------------------------------------------------------ T07 a pack recorded later picks up the lessons, oldest first
DO $$
DECLARE e uuid := crm_test.get('e3'); b2 uuid; p uuid; q uuid; r1 public.lesson_reports; r2 public.lesson_reports; r record; u int;
BEGIN
  b2 := crm_test.book(crm_test.id(12), crm_test.id(22), crm_test.id(43), 'English', now() - interval '4 days');
  PERFORM crm_test.as_admin();
  INSERT INTO public.lesson_reports (booking_id, attendance) VALUES (b2, 'delivered');
  RESET ROLE;
  INSERT INTO public.session_packs (enrolment_id, amount_kes, sessions_bought, paid_on) VALUES (e, 3000, 1, DATE '2026-11-01') RETURNING id INTO p;
  SELECT * INTO r1 FROM public.lesson_reports WHERE booking_id = crm_test.get('b_t6');
  SELECT * INTO r2 FROM public.lesson_reports WHERE booking_id = b2;
  PERFORM crm_test.assert(r1.pack_id = p AND r1.tutor_pay_kes = 2100, 'T07 the older lesson took the new pack and is now priced');
  PERFORM crm_test.assert(r2.pack_id IS NULL AND r2.tutor_pay_kes IS NULL, 'T07 the pack has one session, so the newer lesson still waits');
  SELECT sessions_used INTO u FROM public.session_packs WHERE id = p;
  PERFORM crm_test.assert(u = 1, 'T07 the pack is full');
  INSERT INTO public.session_packs (enrolment_id, amount_kes, sessions_bought, paid_on) VALUES (e, 4000, 2, DATE '2026-11-02') RETURNING id INTO q;
  SELECT * INTO r2 FROM public.lesson_reports WHERE booking_id = b2;
  PERFORM crm_test.assert(r2.pack_id = q AND r2.tutor_pay_kes = 1400, 'T07 the second pack priced the other lesson at its own rate (2,000)');
  SELECT * INTO r FROM public.crm_enrolment_balances WHERE enrolment_id = e;
  -- pack 1: 3,000 paid, 1 used at 3,000 -> 0 left;  pack 2: 4,000 paid, 1 used at 2,000 -> 2,000 left
  PERFORM crm_test.assert(r.unpriced_lessons = 0 AND r.sessions_left = 1 AND r.balance = 2000, 'T07 balances after the late payments, got ' || r.sessions_left || ' / ' || r.balance);
  RAISE NOTICE 'T07 ok';
END $$;

-- ------------------------------------------------------------------ T08 only admins see or change any of it
DO $$
DECLARE n int; failed boolean;
BEGIN
  PERFORM crm_test.as_user(crm_test.id(11));  -- a parent
  SELECT count(*) INTO n FROM public.enrolments;               PERFORM crm_test.assert(n = 0, 'T08 non-admin sees no enrolments');
  SELECT count(*) INTO n FROM public.session_packs;            PERFORM crm_test.assert(n = 0, 'T08 non-admin sees no packs');
  SELECT count(*) INTO n FROM public.lesson_reports;           PERFORM crm_test.assert(n = 0, 'T08 non-admin sees no reports');
  SELECT count(*) INTO n FROM public.crm_enrolment_balances;   PERFORM crm_test.assert(n = 0, 'T08 non-admin sees no balances');
  SELECT count(*) INTO n FROM public.crm_lessons;              PERFORM crm_test.assert(n = 0, 'T08 non-admin sees no CRM lessons');
  failed := false;
  BEGIN
    INSERT INTO public.session_packs (enrolment_id, amount_kes, sessions_bought) VALUES (crm_test.get('e1'), 1, 1);
  EXCEPTION WHEN insufficient_privilege THEN failed := true;
  END;
  PERFORM crm_test.assert(failed, 'T08 non-admin cannot add a pack');
  RESET ROLE;

  PERFORM crm_test.as_admin();
  SELECT count(*) INTO n FROM public.enrolments;               PERFORM crm_test.assert(n >= 3, 'T08 admin sees the enrolments');
  SELECT count(*) INTO n FROM public.session_packs;            PERFORM crm_test.assert(n >= 4, 'T08 admin sees the packs');
  SELECT count(*) INTO n FROM public.lesson_reports;           PERFORM crm_test.assert(n >= 5, 'T08 admin sees the reports');
  SELECT count(*) INTO n FROM public.crm_enrolment_balances;   PERFORM crm_test.assert(n >= 3, 'T08 admin sees the balances');
  SELECT count(*) INTO n FROM public.crm_lessons;              PERFORM crm_test.assert(n >= 5, 'T08 admin sees the CRM lessons');
  RESET ROLE;

  SET LOCAL ROLE anon;
  failed := false;
  BEGIN PERFORM count(*) FROM public.enrolments; EXCEPTION WHEN insufficient_privilege THEN failed := true; END;
  PERFORM crm_test.assert(failed, 'T08 anon cannot read enrolments');
  failed := false;
  BEGIN PERFORM public.crm_record_payment(crm_test.get('e1'), 100, 'X', CURRENT_DATE, 1, NULL); EXCEPTION WHEN insufficient_privilege THEN failed := true; END;
  PERFORM crm_test.assert(failed, 'T08 anon cannot record a payment');
  RESET ROLE;
  RAISE NOTICE 'T08 ok';
END $$;

-- ------------------------------------------------------------------ T09 Record payment (admin RPC)
DO $$
DECLARE e uuid := crm_test.get('e3'); p uuid; pk public.session_packs; failed boolean; st text; n int; f uuid;
BEGIN
  PERFORM crm_test.as_user(crm_test.id(11));
  failed := false;
  BEGIN PERFORM public.crm_record_payment(e, 7000, 'MPESA-XYZ', DATE '2026-11-03', 3, NULL); EXCEPTION WHEN insufficient_privilege THEN failed := true; END;
  RESET ROLE;
  PERFORM crm_test.assert(failed, 'T09 a non-admin is refused');

  PERFORM crm_test.as_admin();
  p := public.crm_record_payment(e, 7000, 'MPESA-XYZ', DATE '2026-11-03', 3, NULL);
  RESET ROLE;
  SELECT * INTO pk FROM public.session_packs WHERE id = p;
  PERFORM crm_test.assert(pk.enrolment_id = e AND pk.amount_kes = 7000 AND pk.reference = 'MPESA-XYZ' AND pk.sessions_bought = 3 AND pk.sessions_used = 0,
    'T09 the pack holds what was typed');
  PERFORM crm_test.assert(pk.rate_per_session = 2333.33, 'T09 the rate defaults to amount / sessions, got ' || pk.rate_per_session);
  PERFORM crm_test.assert(pk.paid_on = DATE '2026-11-03', 'T09 paid_on is kept');
  f := (SELECT family_id FROM public.enrolments WHERE id = e);
  SELECT status INTO st FROM public.families WHERE id = f;
  PERFORM crm_test.assert(st = 'active', 'T09 a family that has paid is active, got ' || st);
  SELECT count(*) INTO n FROM public.lead_activities WHERE family_id = f AND source_table = 'session_packs' AND source_id = p::text;
  PERFORM crm_test.assert(n = 1, 'T09 the payment is on the family timeline');

  PERFORM crm_test.as_admin();
  p := public.crm_record_payment(e, 9000, NULL, NULL, 3, 3000);
  RESET ROLE;
  SELECT * INTO pk FROM public.session_packs WHERE id = p;
  PERFORM crm_test.assert(pk.rate_per_session = 3000, 'T09 an explicit rate wins');
  PERFORM crm_test.assert(pk.paid_on = (now() AT TIME ZONE 'Africa/Nairobi')::date, 'T09 paid_on defaults to today in Nairobi');

  PERFORM crm_test.as_admin();
  failed := false; BEGIN PERFORM public.crm_record_payment(e, 0, 'Z', CURRENT_DATE, 3, NULL); EXCEPTION WHEN raise_exception THEN failed := true; END;
  PERFORM crm_test.assert(failed, 'T09 an amount of zero is refused');
  failed := false; BEGIN PERFORM public.crm_record_payment(e, 100, 'Z', CURRENT_DATE, 0, NULL); EXCEPTION WHEN raise_exception THEN failed := true; END;
  PERFORM crm_test.assert(failed, 'T09 zero sessions is refused');
  failed := false; BEGIN PERFORM public.crm_record_payment(crm_test.id(999), 100, 'Z', CURRENT_DATE, 1, NULL); EXCEPTION WHEN raise_exception THEN failed := true; END;
  PERFORM crm_test.assert(failed, 'T09 an unknown enrolment is refused');
  RESET ROLE;
  RAISE NOTICE 'T09 ok';
END $$;

-- ------------------------------------------------------------------ T10 a failing trigger never blocks the report
DO $$
DECLARE b uuid; n int;
BEGIN
  b := crm_test.book(crm_test.id(11), crm_test.id(21), crm_test.id(41), 'Maths', now() - interval '20 hours');
  BEGIN
    ALTER TABLE public.session_packs RENAME TO session_packs_broken;
    PERFORM crm_test.as_admin();
    INSERT INTO public.lesson_reports (booking_id, attendance) VALUES (b, 'delivered');
    RESET ROLE;
    SELECT count(*) INTO n FROM public.lesson_reports WHERE booking_id = b;
    PERFORM crm_test.assert(n = 1, 'T10 the report was saved although the pack table is broken');
    RAISE EXCEPTION 'rollback-marker';
  EXCEPTION WHEN raise_exception THEN
    RESET ROLE;
    IF SQLERRM <> 'rollback-marker' THEN RAISE; END IF;
  END;
  PERFORM crm_test.assert(to_regclass('public.session_packs') IS NOT NULL, 'T10 the rename was rolled back');
  RAISE NOTICE 'T10 ok';
END $$;

-- ------------------------------------------------------------------ T11 the booking trigger finds or creates family, child, subject and tutor
DO $$
DECLARE e_before int; e_after int; slot uuid; b uuid; fam uuid; en public.enrolments; fams_before int; fams_after int;
BEGIN
  -- (a) an existing family books another subject through the public flow (RLS applies to the parent)
  SELECT count(*) INTO e_before FROM public.enrolments;
  SELECT count(*) INTO fams_before FROM public.families;
  slot := crm_test.slot(crm_test.id(22), now() - interval '9 days');
  PERFORM crm_test.as_user(crm_test.id(11));
  INSERT INTO public.bookings (student_id, tutor_id, availability_slot_id, subject, amount, status, student_profile_id)
  VALUES (crm_test.id(11), crm_test.id(22), slot, 'Science', 3000, 'pending', crm_test.id(41)) RETURNING id INTO b;
  RESET ROLE;
  SELECT * INTO en FROM public.enrolments WHERE id = (SELECT enrolment_id FROM public.bookings WHERE id = b);
  PERFORM crm_test.assert(en.id IS NOT NULL, 'T11a the booking got an enrolment');
  PERFORM crm_test.assert(en.family_id = crm_test.get('f1') AND en.student_id = crm_test.id(41) AND en.student_name = 'Amani Kamau'
    AND en.subject = 'Science' AND en.tutor_id = crm_test.id(32) AND en.status = 'active', 'T11a family, child, subject and tutor are filled in');
  SELECT count(*) INTO e_after FROM public.enrolments;
  SELECT count(*) INTO fams_after FROM public.families;
  PERFORM crm_test.assert(e_after = e_before + 1 AND fams_after = fams_before, 'T11a one new enrolment, no new family');

  -- (b) the same child, subject and tutor again, with different case and spacing: reused
  b := crm_test.book(crm_test.id(11), crm_test.id(22), crm_test.id(41), '  science ', now() - interval '8 days');
  PERFORM crm_test.assert((SELECT enrolment_id FROM public.bookings WHERE id = b) = en.id, 'T11b the same enrolment is reused');
  -- a sibling is a different enrolment
  b := crm_test.book(crm_test.id(11), crm_test.id(22), crm_test.id(42), 'Science', now() - interval '7 days');
  PERFORM crm_test.assert((SELECT enrolment_id FROM public.bookings WHERE id = b) <> en.id, 'T11b a sibling gets their own enrolment');
  -- a different tutor is a different enrolment
  b := crm_test.book(crm_test.id(11), crm_test.id(21), crm_test.id(41), 'Science', now() - interval '6 days');
  PERFORM crm_test.assert((SELECT enrolment_id FROM public.bookings WHERE id = b) <> en.id, 'T11b a different tutor gets their own enrolment');

  -- (c) a parent with no phone: the family is created and remembered by account
  b := crm_test.book(crm_test.id(13), crm_test.id(22), NULL, 'English', now() - interval '9 days');
  SELECT f.id INTO fam FROM public.families f WHERE f.parent_profile_id = crm_test.id(13);
  PERFORM crm_test.assert(fam IS NOT NULL, 'T11c a family was created for the parent without a phone');
  PERFORM crm_test.assert((SELECT parent_name FROM public.families WHERE id = fam) = 'Parent Three', 'T11c with the parent''s name');
  PERFORM crm_test.assert((SELECT email FROM public.families WHERE id = fam) = 'parent3@example.test', 'T11c and email');
  SELECT * INTO en FROM public.enrolments WHERE id = (SELECT enrolment_id FROM public.bookings WHERE id = b);
  PERFORM crm_test.assert(en.student_name = 'Parent Three' AND en.student_id IS NULL, 'T11c with no child recorded the account holder is the learner');
  b := crm_test.book(crm_test.id(13), crm_test.id(22), NULL, 'English', now() - interval '8 days');
  PERFORM crm_test.assert((SELECT enrolment_id FROM public.bookings WHERE id = b) = en.id, 'T11c the second booking reuses the family and enrolment');
  PERFORM crm_test.assert((SELECT count(*) FROM public.families WHERE parent_profile_id = crm_test.id(13)) = 1, 'T11c still one family');

  -- (d) an enrolment typed in by hand (name only, as the tracker import makes them) is matched and linked to the child
  INSERT INTO public.enrolments (family_id, student_name, subject, tutor_id)
  VALUES (crm_test.get('f1'), 'zuri  kamau', 'HISTORY', crm_test.id(31)) RETURNING id INTO fam;
  b := crm_test.book(crm_test.id(11), crm_test.id(21), crm_test.id(42), 'History', now() - interval '7 days');
  PERFORM crm_test.assert((SELECT enrolment_id FROM public.bookings WHERE id = b) = fam, 'T11d a hand-made enrolment is matched by child name, subject and tutor');
  PERFORM crm_test.assert((SELECT student_id FROM public.enrolments WHERE id = fam) = crm_test.id(42), 'T11d and linked to the child record');
  RAISE NOTICE 'T11 ok';
END $$;

-- ------------------------------------------------------------------ T12 a failing booking trigger never blocks the booking
DO $$
DECLARE slot uuid; b uuid; en uuid;
BEGIN
  slot := crm_test.slot(crm_test.id(21), now() - interval '12 hours');
  BEGIN
    ALTER TABLE public.enrolments RENAME TO enrolments_broken;
    PERFORM crm_test.as_user(crm_test.id(11));
    INSERT INTO public.bookings (student_id, tutor_id, availability_slot_id, subject, amount, status, student_profile_id)
    VALUES (crm_test.id(11), crm_test.id(21), slot, 'Maths', 3000, 'pending', crm_test.id(41)) RETURNING id, enrolment_id INTO b, en;
    RESET ROLE;
    PERFORM crm_test.assert(b IS NOT NULL AND en IS NULL, 'T12 the booking was saved without an enrolment');
    RAISE EXCEPTION 'rollback-marker';
  EXCEPTION WHEN raise_exception THEN
    RESET ROLE;
    IF SQLERRM <> 'rollback-marker' THEN RAISE; END IF;
  END;
  PERFORM crm_test.assert(to_regclass('public.enrolments') IS NOT NULL, 'T12 the rename was rolled back');
  RAISE NOTICE 'T12 ok';
END $$;

-- ------------------------------------------------------------------ T13 confirming a lesson that has no enrolment creates one
DO $$
DECLARE b uuid; rep public.lesson_reports; en uuid;
BEGIN
  BEGIN
    ALTER TABLE public.bookings DISABLE TRIGGER crm_bookings_before_insert;
    b := crm_test.book(crm_test.id(12), crm_test.id(22), crm_test.id(43), 'English', now() - interval '30 hours');
    ALTER TABLE public.bookings ENABLE TRIGGER crm_bookings_before_insert;
    PERFORM crm_test.assert((SELECT enrolment_id FROM public.bookings WHERE id = b) IS NULL, 'T13 the lesson starts without an enrolment');
    PERFORM crm_test.as_admin();
    INSERT INTO public.lesson_reports (booking_id, attendance) VALUES (b, 'delivered') RETURNING * INTO rep;
    RESET ROLE;
    en := (SELECT enrolment_id FROM public.bookings WHERE id = b);
    PERFORM crm_test.assert(en IS NOT NULL AND rep.enrolment_id = en, 'T13 confirming created and linked the enrolment');
    PERFORM crm_test.assert(en = crm_test.get('e3'), 'T13 and it is the family''s existing enrolment');
    RAISE EXCEPTION 'rollback-marker';
  EXCEPTION WHEN raise_exception THEN
    RESET ROLE;
    IF SQLERRM <> 'rollback-marker' THEN RAISE; END IF;
  END;
  RAISE NOTICE 'T13 ok';
END $$;

-- ------------------------------------------------------------------ T14 undoing a confirmation gives the session back
DO $$
DECLARE b uuid; rep public.lesson_reports; u_before int; u_after int; failed boolean;
BEGIN
  b := crm_test.book(crm_test.id(11), crm_test.id(21), crm_test.id(41), 'Maths', now() - interval '40 hours');
  SELECT sessions_used INTO u_before FROM public.session_packs WHERE id = crm_test.get('pack1');
  PERFORM crm_test.as_admin();
  INSERT INTO public.lesson_reports (booking_id, attendance, covered) VALUES (b, 'delivered', 'Decimals') RETURNING * INTO rep;
  RESET ROLE;
  SELECT sessions_used INTO u_after FROM public.session_packs WHERE id = crm_test.get('pack1');
  PERFORM crm_test.assert(u_after = u_before + 1, 'T14 the lesson used a session');

  -- notes can be corrected; the outcome cannot
  PERFORM crm_test.as_admin();
  UPDATE public.lesson_reports SET covered = 'Decimals and percentages', engagement = 5 WHERE id = rep.id;
  failed := false;
  BEGIN UPDATE public.lesson_reports SET attendance = 'student_absent' WHERE id = rep.id; EXCEPTION WHEN raise_exception THEN failed := true; END;
  PERFORM crm_test.assert(failed, 'T14 attendance cannot be edited in place');
  failed := false;
  BEGIN UPDATE public.lesson_reports SET booking_id = crm_test.get('b_t2') WHERE id = rep.id; EXCEPTION WHEN raise_exception OR unique_violation THEN failed := true; END;
  PERFORM crm_test.assert(failed, 'T14 the lesson cannot be swapped in place');
  DELETE FROM public.lesson_reports WHERE id = rep.id;
  RESET ROLE;
  SELECT sessions_used INTO u_after FROM public.session_packs WHERE id = crm_test.get('pack1');
  PERFORM crm_test.assert(u_after = u_before, 'T14 undoing the confirmation released the session, got ' || u_after || ' vs ' || u_before);

  -- confirming again uses the freed session, then deleting the lesson itself releases it too
  PERFORM crm_test.as_admin();
  INSERT INTO public.lesson_reports (booking_id, attendance) VALUES (b, 'delivered');
  RESET ROLE;
  SELECT sessions_used INTO u_after FROM public.session_packs WHERE id = crm_test.get('pack1');
  PERFORM crm_test.assert(u_after = u_before + 1, 'T14 confirmed again');
  DELETE FROM public.bookings WHERE id = b;
  SELECT sessions_used INTO u_after FROM public.session_packs WHERE id = crm_test.get('pack1');
  PERFORM crm_test.assert(u_after = u_before, 'T14 deleting the lesson released its session');
  RAISE NOTICE 'T14 ok';
END $$;

-- ------------------------------------------------------------------ T15 the cut-over: only lessons after it are to be confirmed
DO $$
DECLARE b_old uuid; b_new uuid; was timestamptz; r record; n int;
BEGIN
  SELECT lessons_from INTO was FROM public.crm_settings WHERE id;
  PERFORM crm_test.assert(was IS NOT NULL AND was <= now(), 'T15 the cut-over is set when the migration is applied');
  UPDATE public.crm_settings SET lessons_from = now() - interval '4 days' WHERE id;
  b_old := crm_test.book(crm_test.id(11), crm_test.id(21), crm_test.id(41), 'Maths', now() - interval '10 days');
  b_new := crm_test.book(crm_test.id(11), crm_test.id(21), crm_test.id(41), 'Maths', now() - interval '1 day' - interval '5 hours');
  SELECT * INTO r FROM public.crm_lessons WHERE booking_id = b_old;
  PERFORM crm_test.assert(r.tracked = false AND r.report_id IS NULL, 'T15 a lesson before the cut-over is history');
  SELECT * INTO r FROM public.crm_lessons WHERE booking_id = b_new;
  PERFORM crm_test.assert(r.tracked = true AND r.report_id IS NULL AND r.subject = 'Maths' AND r.student_name = 'Amani Kamau'
    AND r.family_name = 'Parent One' AND r.tutor_name = 'Tutor One' AND r.ends_at - r.starts_at = interval '1 hour', 'T15 a lesson after it is to be confirmed, with names filled in');
  SELECT count(*) INTO n FROM public.crm_lessons WHERE tracked AND report_id IS NULL AND booking_status <> 'cancelled' AND ends_at < now();
  PERFORM crm_test.assert(n >= 1, 'T15 the queue query finds it');
  PERFORM crm_test.assert((SELECT tutor_pay_kes FROM public.crm_lessons WHERE booking_id = crm_test.get('b_t2')) = 2100, 'T15 a confirmed lesson carries its report');
  UPDATE public.crm_settings SET lessons_from = was WHERE id;
  RAISE NOTICE 'T15 ok';
END $$;

-- ------------------------------------------------------------------ T16 opening balances may exceed what was paid (the tracker allows it)
DO $$
DECLARE f uuid := crm_test.get('f1'); e uuid; p uuid; r record; b uuid; rep public.lesson_reports;
BEGIN
  INSERT INTO public.enrolments (family_id, student_name, subject, tutor_id, opening_tutor_pay_kes, opening_tutor_paid_kes, opening_tutor_reference)
  VALUES (f, 'Amani Kamau', 'Chemistry', crm_test.id(32), 2310, 0, 'UNPAID') RETURNING id INTO e;
  INSERT INTO public.session_packs (enrolment_id, amount_kes, sessions_bought, sessions_used, rate_per_session, paid_on)
  VALUES (e, 2000, 2, 3, 1100, NULL) RETURNING id INTO p;
  SELECT * INTO r FROM public.crm_enrolment_balances WHERE enrolment_id = e;
  PERFORM crm_test.assert(r.sessions_left = -1, 'T16 one session over is shown as -1, got ' || r.sessions_left);
  PERFORM crm_test.assert(r.balance = 2000 - 3 * 1100, 'T16 the family owes KES 1,300, got ' || r.balance);
  -- a new lesson does not push the over-used pack further
  b := crm_test.book(crm_test.id(11), crm_test.id(22), crm_test.id(41), 'Chemistry', now() - interval '50 hours');
  PERFORM crm_test.assert((SELECT enrolment_id FROM public.bookings WHERE id = b) = e, 'T16 the lesson matched the imported enrolment by child name');
  PERFORM crm_test.as_admin();
  INSERT INTO public.lesson_reports (booking_id, attendance) VALUES (b, 'delivered') RETURNING * INTO rep;
  RESET ROLE;
  PERFORM crm_test.assert(rep.pack_id IS NULL AND (SELECT sessions_used FROM public.session_packs WHERE id = p) = 3, 'T16 an over-used pack is never picked');
  RAISE NOTICE 'T16 ok';
END $$;

-- ------------------------------------------------------------------ T17 money records are not deleted by accident
DO $$
DECLARE failed boolean := false; f uuid; e uuid;
BEGIN
  -- a family that has paid cannot be deleted from under its packs
  BEGIN
    DELETE FROM public.families WHERE id = crm_test.get('f1');
  EXCEPTION WHEN foreign_key_violation THEN failed := true;
  END;
  PERFORM crm_test.assert(failed, 'T17 a family with a pack cannot be deleted');
  -- a throw-away family with only an enrolment can; its bookings fall back to no enrolment
  f := public.crm_upsert_family('0799 111 222', 'Throwaway', NULL);
  INSERT INTO public.enrolments (family_id, student_name, subject) VALUES (f, 'Test', 'Maths') RETURNING id INTO e;
  DELETE FROM public.families WHERE id = f;
  PERFORM crm_test.assert(NOT EXISTS (SELECT 1 FROM public.enrolments WHERE id = e), 'T17 an enrolment with no money goes with its family');
  RAISE NOTICE 'T17 ok';
END $$;

-- ------------------------------------------------------------------ T19 the client cannot choose the enrolment, the pack or the pay
-- (a tutor will write these reports in the payouts slice; what they send for those columns is ignored)
DO $$
DECLARE b uuid; rep public.lesson_reports;
BEGIN
  b := crm_test.book(crm_test.id(11), crm_test.id(21), crm_test.id(41), 'Maths', now() - interval '60 hours');
  PERFORM crm_test.as_admin();
  INSERT INTO public.lesson_reports (booking_id, attendance, tutor_pay_kes, pack_id, enrolment_id)
  VALUES (b, 'delivered', 99999, crm_test.get('pack2'), crm_test.get('e3')) RETURNING * INTO rep;
  RESET ROLE;
  PERFORM crm_test.assert(rep.enrolment_id = crm_test.get('e1'), 'T19 the enrolment comes from the booking, not from the client');
  PERFORM crm_test.assert(rep.pack_id = crm_test.get('pack1') AND rep.tutor_pay_kes = 2100,
    'T19 pack and pay are worked out by the database, got ' || coalesce(rep.tutor_pay_kes::text, 'null'));

  b := crm_test.book(crm_test.id(11), crm_test.id(21), crm_test.id(41), 'Maths', now() - interval '61 hours');
  PERFORM crm_test.as_admin();
  INSERT INTO public.lesson_reports (booking_id, attendance, tutor_pay_kes, pack_id)
  VALUES (b, 'tutor_absent', 5000, crm_test.get('pack1')) RETURNING * INTO rep;
  RESET ROLE;
  PERFORM crm_test.assert(rep.pack_id IS NULL AND rep.tutor_pay_kes = 0, 'T19 a lesson that does not count cannot be given pay');
  RAISE NOTICE 'T19 ok';
END $$;

-- ------------------------------------------------------------------ T20 half sessions (the tracker records 3.5 taken)
DO $$
DECLARE f uuid := crm_test.get('f1'); e uuid; p uuid; q uuid; b uuid; rep public.lesson_reports; r record; p_used numeric;
BEGIN
  INSERT INTO public.enrolments (family_id, student_name, subject, tutor_id)
  VALUES (f, 'Amani Kamau', 'Art', crm_test.id(32)) RETURNING id INTO e;
  INSERT INTO public.session_packs (enrolment_id, amount_kes, sessions_bought, sessions_used, rate_per_session, paid_on)
  VALUES (e, 5800, 4, 3.5, 1450, NULL) RETURNING id INTO p;
  SELECT * INTO r FROM public.crm_enrolment_balances WHERE enrolment_id = e;
  PERFORM crm_test.assert(r.sessions_used = 3.5 AND r.sessions_left = 0.5, 'T20 half sessions are kept, got ' || r.sessions_used || ' / ' || r.sessions_left);
  PERFORM crm_test.assert(r.balance = 5800 - 3.5 * 1450, 'T20 the family still holds KES 725, got ' || r.balance);

  -- a lesson needs a whole session: the half left over is not used
  b := crm_test.book(crm_test.id(11), crm_test.id(22), crm_test.id(41), 'Art', now() - interval '70 hours');
  PERFORM crm_test.assert((SELECT enrolment_id FROM public.bookings WHERE id = b) = e, 'T20 the lesson matched the imported enrolment');
  PERFORM crm_test.as_admin();
  INSERT INTO public.lesson_reports (booking_id, attendance) VALUES (b, 'delivered') RETURNING * INTO rep;
  RESET ROLE;
  PERFORM crm_test.assert(rep.pack_id IS NULL AND rep.tutor_pay_kes IS NULL, 'T20 half a session left is not enough for a lesson');
  SELECT sessions_used INTO p_used FROM public.session_packs WHERE id = p;
  PERFORM crm_test.assert(p_used = 3.5, 'T20 the old pack is untouched');

  -- the next payment prices that lesson, at its own rate
  INSERT INTO public.session_packs (enrolment_id, amount_kes, sessions_bought, paid_on) VALUES (e, 2900, 2, DATE '2026-11-05') RETURNING id INTO q;
  SELECT * INTO rep FROM public.lesson_reports WHERE booking_id = b;
  PERFORM crm_test.assert(rep.pack_id = q AND rep.tutor_pay_kes = 1015, 'T20 the new pack priced the lesson, got ' || coalesce(rep.tutor_pay_kes::text, 'null'));
  SELECT * INTO r FROM public.crm_enrolment_balances WHERE enrolment_id = e;
  PERFORM crm_test.assert(r.sessions_left = 1.5 AND r.balance = 725 + 2900 - 1450, 'T20 balances after the new pack, got ' || r.sessions_left || ' / ' || r.balance);

  -- a payment with only half a session of room does not pick up a waiting lesson either
  INSERT INTO public.enrolments (family_id, student_name, subject, tutor_id)
  VALUES (f, 'Amani Kamau', 'Music', crm_test.id(32)) RETURNING id INTO e;
  b := crm_test.book(crm_test.id(11), crm_test.id(22), crm_test.id(41), 'Music', now() - interval '71 hours');
  PERFORM crm_test.as_admin();
  INSERT INTO public.lesson_reports (booking_id, attendance) VALUES (b, 'delivered');
  RESET ROLE;
  INSERT INTO public.session_packs (enrolment_id, amount_kes, sessions_bought, sessions_used, rate_per_session, paid_on)
  VALUES (e, 5800, 4, 3.5, 1450, DATE '2026-11-06');
  SELECT * INTO rep FROM public.lesson_reports WHERE booking_id = b;
  PERFORM crm_test.assert(rep.pack_id IS NULL, 'T20 half a session of room does not pick up a waiting lesson');
  RAISE NOTICE 'T20 ok';
END $$;

-- ------------------------------------------------------------------ T23 a payment's reference and date can be corrected, and the timeline shows it
-- (info@ types M-Pesa codes by hand; a typo must be fixable without touching the money)
DO $$
DECLARE f uuid := crm_test.get('f1'); e uuid; p uuid; pk public.session_packs; n int; v_body text;
BEGIN
  INSERT INTO public.enrolments (family_id, student_name, subject, tutor_id)
  VALUES (f, 'Zuri Kamau', 'Geography', crm_test.id(32)) RETURNING id INTO e;
  PERFORM crm_test.as_admin();
  p := public.crm_record_payment(e, 9000, 'MPESA-TYPO', DATE '2026-11-02', 3, NULL);
  UPDATE public.session_packs SET reference = 'MPESA-RIGHT', paid_on = DATE '2026-11-01' WHERE id = p;
  RESET ROLE;
  SELECT * INTO pk FROM public.session_packs WHERE id = p;
  PERFORM crm_test.assert(pk.reference = 'MPESA-RIGHT' AND pk.paid_on = DATE '2026-11-01', 'T23 the reference and date were corrected');
  PERFORM crm_test.assert(pk.amount_kes = 9000 AND pk.sessions_bought = 3 AND pk.rate_per_session = 3000, 'T23 the money is untouched');
  SELECT count(*) INTO n FROM public.lead_activities WHERE family_id = f AND kind = 'system' AND body LIKE 'Payment corrected%';
  PERFORM crm_test.assert(n = 1, 'T23 one correction on the timeline (lessons using up sessions are not corrections), got ' || n);
  SELECT body INTO v_body FROM public.lead_activities WHERE family_id = f AND kind = 'system' AND body LIKE 'Payment corrected%';
  PERFORM crm_test.assert(v_body LIKE '%MPESA-TYPO%' AND v_body LIKE '%MPESA-RIGHT%', 'T23 the timeline shows the old and new reference, got ' || coalesce(v_body, 'nothing'));
  PERFORM crm_test.assert(v_body LIKE '%2026-11-02%' AND v_body LIKE '%2026-11-01%', 'T23 and the old and new date, got ' || coalesce(v_body, 'nothing'));
  INSERT INTO crm_test.ctx VALUES ('e_geo', e), ('p_geo', p);
  RAISE NOTICE 'T23 ok';
END $$;

-- ------------------------------------------------------------------ T24 amount, sessions, rate and child are fixed once recorded
-- (tutor pay is priced from the rate when a lesson is confirmed; the way to change money is remove and record again)
DO $$
DECLARE e uuid := crm_test.get('e_geo'); p uuid := crm_test.get('p_geo'); failed boolean; pk public.session_packs;
BEGIN
  PERFORM crm_test.as_admin();
  failed := false; BEGIN UPDATE public.session_packs SET amount_kes = 900 WHERE id = p; EXCEPTION WHEN raise_exception THEN failed := true; END;
  PERFORM crm_test.assert(failed, 'T24 the amount cannot be changed');
  failed := false; BEGIN UPDATE public.session_packs SET sessions_bought = 4 WHERE id = p; EXCEPTION WHEN raise_exception THEN failed := true; END;
  PERFORM crm_test.assert(failed, 'T24 the sessions bought cannot be changed');
  failed := false; BEGIN UPDATE public.session_packs SET rate_per_session = 100 WHERE id = p; EXCEPTION WHEN raise_exception THEN failed := true; END;
  PERFORM crm_test.assert(failed, 'T24 the rate cannot be changed');
  failed := false; BEGIN UPDATE public.session_packs SET enrolment_id = crm_test.get('e1') WHERE id = p; EXCEPTION WHEN raise_exception THEN failed := true; END;
  PERFORM crm_test.assert(failed, 'T24 the payment cannot be moved to another child');
  RESET ROLE;
  SELECT * INTO pk FROM public.session_packs WHERE id = p;
  PERFORM crm_test.assert(pk.amount_kes = 9000 AND pk.sessions_bought = 3 AND pk.rate_per_session = 3000 AND pk.enrolment_id = e, 'T24 nothing changed');
  RAISE NOTICE 'T24 ok';
END $$;

-- ------------------------------------------------------------------ T25 an unused payment can be removed; one that sessions came from cannot
DO $$
DECLARE e uuid := crm_test.get('e_geo'); f uuid := crm_test.get('f1'); p uuid; kept uuid; failed boolean; v_body text;
BEGIN
  PERFORM crm_test.as_admin();
  p := public.crm_record_payment(e, 6000, 'MPESA-WRONG-FAMILY', DATE '2026-11-03', 2, NULL);
  DELETE FROM public.session_packs WHERE id = p;
  RESET ROLE;
  PERFORM crm_test.assert(NOT EXISTS (SELECT 1 FROM public.session_packs WHERE id = p), 'T25 an unused payment was removed');
  SELECT body INTO v_body FROM public.lead_activities WHERE family_id = f AND kind = 'system' AND body LIKE 'Payment removed%';
  PERFORM crm_test.assert(v_body LIKE '%6,000%' AND v_body LIKE '%MPESA-WRONG-FAMILY%' AND v_body LIKE '%Geography%',
    'T25 the timeline says what was removed, got ' || coalesce(v_body, 'nothing'));
  -- sessions already taken from a payment (lessons, or an imported opening balance): it stays
  INSERT INTO public.session_packs (enrolment_id, amount_kes, sessions_bought, sessions_used, rate_per_session, paid_on)
  VALUES (e, 3000, 2, 1, 1500, DATE '2026-11-04') RETURNING id INTO kept;
  PERFORM crm_test.as_admin();
  failed := false; BEGIN DELETE FROM public.session_packs WHERE id = kept; EXCEPTION WHEN raise_exception THEN failed := true; END;
  RESET ROLE;
  PERFORM crm_test.assert(failed, 'T25 a payment that sessions were taken from cannot be removed');
  PERFORM crm_test.assert(EXISTS (SELECT 1 FROM public.session_packs WHERE id = kept), 'T25 and it is still there');
  PERFORM crm_test.assert((SELECT count(*) FROM public.lead_activities WHERE family_id = f AND body LIKE 'Payment removed%') = 1,
    'T25 only the real removal is on the timeline');
  RAISE NOTICE 'T25 ok';
END $$;

-- ------------------------------------------------------------------ T26 a payment saved before a tutor was chosen is adopted by the first lesson with a tutor
-- (parents often pay before a tutor is assigned; the money must not sit on an entry no lesson will ever find)
DO $$
DECLARE f uuid := (SELECT family_id FROM public.enrolments WHERE id = crm_test.get('e3')); e uuid; p uuid; b uuid;
        rep public.lesson_reports; n int;
BEGIN
  INSERT INTO public.enrolments (family_id, student_id, student_name, subject, tutor_id)
  VALUES (f, crm_test.id(43), 'Baraka Otieno', 'Physics', NULL) RETURNING id INTO e;
  PERFORM crm_test.as_admin();
  p := public.crm_record_payment(e, 15000, 'MPESA-NOTUTOR', DATE '2026-11-02', 6, NULL);
  RESET ROLE;
  -- another subject for the same child does not take the tutor-less entry
  b := crm_test.book(crm_test.id(12), crm_test.id(22), crm_test.id(43), 'Biology', now() - interval '5 days');
  PERFORM crm_test.assert((SELECT enrolment_id FROM public.bookings WHERE id = b) <> e, 'T26 a different subject does not take the tutor-less entry');
  PERFORM crm_test.assert((SELECT tutor_id FROM public.enrolments WHERE id = e) IS NULL, 'T26 and the entry still has no tutor');
  -- the same family, same subject, but a different learner (the account holder, no child recorded), does not take it either
  b := crm_test.book(crm_test.id(12), crm_test.id(22), NULL, 'Physics', now() - interval '4 days');
  PERFORM crm_test.assert((SELECT enrolment_id FROM public.bookings WHERE id = b) <> e, 'T26 another learner''s Physics lesson does not take it');
  PERFORM crm_test.assert((SELECT tutor_id FROM public.enrolments WHERE id = e) IS NULL, 'T26 and the entry still has no tutor after that');
  -- the first Physics lesson for this child with a tutor joins it
  b := crm_test.book(crm_test.id(12), crm_test.id(22), crm_test.id(43), 'physics', now() - interval '3 days');
  PERFORM crm_test.assert((SELECT enrolment_id FROM public.bookings WHERE id = b) = e, 'T26 the lesson joined the entry the payment was recorded on');
  PERFORM crm_test.assert((SELECT tutor_id FROM public.enrolments WHERE id = e) = crm_test.id(32), 'T26 the entry now has the lesson''s tutor');
  SELECT count(*) INTO n FROM public.enrolments
  WHERE family_id = f AND public.crm_norm_text(subject) = 'physics' AND public.crm_norm_text(student_name) = 'baraka otieno';
  PERFORM crm_test.assert(n = 1, 'T26 no second Physics entry for the child, got ' || n);
  -- and the payment pays for it
  PERFORM crm_test.as_admin();
  INSERT INTO public.lesson_reports (booking_id, attendance) VALUES (b, 'delivered') RETURNING * INTO rep;
  RESET ROLE;
  PERFORM crm_test.assert(rep.pack_id = p AND rep.tutor_pay_kes = 1750,
    'T26 the lesson used the payment; tutor pay is 70% of KES 2,500, got ' || coalesce(rep.tutor_pay_kes::text, 'null'));
  INSERT INTO crm_test.ctx VALUES ('f_baraka', f);
  RAISE NOTICE 'T26 ok';
END $$;

-- ------------------------------------------------------------------ T27 the tutor can be set after the payment, but never onto a duplicate
DO $$
DECLARE f uuid := crm_test.get('f_baraka'); e uuid; dup uuid; failed boolean; b uuid;
BEGIN
  -- a tutor-less entry (a payment saved as "not chosen yet") gets its tutor later
  INSERT INTO public.enrolments (family_id, student_id, student_name, subject, tutor_id)
  VALUES (f, crm_test.id(43), 'Baraka Otieno', 'Chemistry', NULL) RETURNING id INTO e;
  PERFORM crm_test.as_admin();
  UPDATE public.enrolments SET tutor_id = crm_test.id(31) WHERE id = e;
  RESET ROLE;
  PERFORM crm_test.assert((SELECT tutor_id FROM public.enrolments WHERE id = e) = crm_test.id(31), 'T27 the tutor was set');
  b := crm_test.book(crm_test.id(12), crm_test.id(21), crm_test.id(43), 'Chemistry', now() - interval '2 days');
  PERFORM crm_test.assert((SELECT enrolment_id FROM public.bookings WHERE id = b) = e, 'T27 a lesson with that tutor joins the entry');

  -- the same child, subject and tutor already exist on another entry: refused, so credit is never split in two
  INSERT INTO public.enrolments (family_id, student_id, student_name, subject, tutor_id)
  VALUES (f, crm_test.id(43), 'baraka  otieno', 'CHEMISTRY', NULL) RETURNING id INTO dup;
  PERFORM crm_test.as_admin();
  failed := false; BEGIN UPDATE public.enrolments SET tutor_id = crm_test.id(31) WHERE id = dup; EXCEPTION WHEN raise_exception THEN failed := true; END;
  RESET ROLE;
  PERFORM crm_test.assert(failed, 'T27 a second entry for the same child, subject and tutor is refused');
  PERFORM crm_test.assert((SELECT tutor_id FROM public.enrolments WHERE id = dup) IS NULL, 'T27 and that entry kept no tutor');
  -- a different tutor for it is fine
  PERFORM crm_test.as_admin();
  UPDATE public.enrolments SET tutor_id = crm_test.id(32) WHERE id = dup;
  RESET ROLE;
  PERFORM crm_test.assert((SELECT tutor_id FROM public.enrolments WHERE id = dup) = crm_test.id(32), 'T27 a different tutor is accepted');
  -- changing something else about an entry is never blocked by the tutor check
  PERFORM crm_test.as_admin();
  UPDATE public.enrolments SET status = 'paused' WHERE id = dup;
  RESET ROLE;
  PERFORM crm_test.assert((SELECT status FROM public.enrolments WHERE id = dup) = 'paused', 'T27 other edits still work');
  RAISE NOTICE 'T27 ok';
END $$;

-- ------------------------------------------------------------------ T28 Record payment accepts half sessions
-- (the tracker has half sessions; a family can also buy 3.5 at a time)
DO $$
DECLARE e uuid := crm_test.get('e_geo'); p uuid; pk public.session_packs; failed boolean; v_body text;
BEGIN
  PERFORM crm_test.as_admin();
  p := public.crm_record_payment(e, 10500, 'MPESA-HALF', DATE '2026-11-05', 3.5, NULL);
  RESET ROLE;
  SELECT * INTO pk FROM public.session_packs WHERE id = p;
  PERFORM crm_test.assert(pk.sessions_bought = 3.5 AND pk.rate_per_session = 3000,
    'T28 3.5 sessions at KES 3,000, got ' || pk.sessions_bought || ' at ' || pk.rate_per_session);
  SELECT body INTO v_body FROM public.lead_activities WHERE source_table = 'session_packs' AND source_id = p::text;
  PERFORM crm_test.assert(v_body LIKE '%for 3.5 sessions%', 'T28 the timeline says 3.5 sessions, got ' || coalesce(v_body, 'nothing'));
  PERFORM crm_test.as_admin();
  failed := false; BEGIN PERFORM public.crm_record_payment(e, 100, 'Z', CURRENT_DATE, 0.0, NULL); EXCEPTION WHEN raise_exception THEN failed := true; END;
  PERFORM crm_test.assert(failed, 'T28 zero sessions is still refused');
  failed := false; BEGIN PERFORM public.crm_record_payment(e, 100, 'Z', CURRENT_DATE, -1, NULL); EXCEPTION WHEN raise_exception THEN failed := true; END;
  PERFORM crm_test.assert(failed, 'T28 negative sessions is refused');
  RESET ROLE;
  RAISE NOTICE 'T28 ok';
END $$;

-- ------------------------------------------------------------------ snapshot for the second-apply check
DO $$
BEGIN
  CREATE TABLE crm_test.snapshot AS
  SELECT
    (SELECT count(*) FROM public.enrolments) AS enrolments,
    (SELECT count(*) FROM public.session_packs) AS packs,
    (SELECT coalesce(sum(sessions_used), 0) FROM public.session_packs) AS used,
    (SELECT count(*) FROM public.lesson_reports) AS reports,
    (SELECT coalesce(sum(tutor_pay_kes), 0) FROM public.lesson_reports) AS pay,
    (SELECT coalesce(sum(balance), 0) FROM public.crm_enrolment_balances) AS balance,
    (SELECT count(*) FROM public.bookings WHERE enrolment_id IS NOT NULL) AS linked,
    (SELECT lessons_from FROM public.crm_settings WHERE id) AS lessons_from,
    (SELECT count(*) FROM public.families) AS families;
  RAISE NOTICE 'snapshot taken';
END $$;
