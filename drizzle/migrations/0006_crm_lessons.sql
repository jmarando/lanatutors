-- CRM lessons slice: enrolments, prepaid session packs, lesson reports and the balance views.
-- Safe to run more than once.
-- Spec: docs/superpowers/specs/2026-10-28-crm-redesign-design.md (sections 5 and 6)
--
-- Decisions this migration encodes (checked against production on 2026-10-30):
--  * package_purchases is left alone. It has 13 rows, none paid, no rate per session and no
--    payment reference, and it hangs off a package offer rather than a family. session_packs is new.
--  * bookings.status is never written by the CRM. Production holds only 'confirmed' and 'pending',
--    and send-session-reminders, send-consultation-reminder and send-post-session-emails all filter
--    on 'confirmed' (post-session emails pick confirmed bookings whose slot ended 48 to 49 hours
--    ago), so flipping a booking to 'completed' would skip the feedback email. Delivery is
--    recorded in lesson_reports instead.
--  * Every lesson belongs to an enrolment. A trigger on bookings finds or creates it (family,
--    child, subject, tutor), so BookingCalendar, ManualBookingDialog and any later path are covered
--    without editing them. Confirming a lesson that has none creates it then.
--  * Tutor pay is 70% of the pack's rate per session taken, fixed when the lesson is confirmed.
--    The 70% is a constant (crm_tutor_share). platform_settings.deposit_percentage is the deposit
--    share, not tutor pay, and is not touched.
--  * A student no-show and a late cancellation count as a session taken; a tutor no-show and a
--    cancelled lesson do not.
--  * crm_settings.lessons_from is the cut-over: lessons that ended before it are history (the
--    tracker import carries them as opening balances) and never join "Needs confirming".
--  * sessions_used is not capped at sessions_bought: the team's tracker allows more sessions taken
--    than paid for (the family then owes), and the import has to reproduce that.
--  * Sessions may be fractional: the tracker records half sessions (3.5 taken). A lesson uses one
--    whole session, so a pack with only half a session left is skipped for the next lesson.

-- 70% of the family's rate for each session taken (the tracker's rule).
CREATE OR REPLACE FUNCTION public.crm_tutor_share()
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$ SELECT 0.70::numeric $$;

-- Lower-case, trimmed, inner whitespace collapsed: how names and subjects are compared.
CREATE OR REPLACE FUNCTION public.crm_norm_text(p text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(regexp_replace(btrim(coalesce(p, '')), '\s+', ' ', 'g'))
$$;

-- Lessons that ended before this moment are history. Set to the time this migration was first applied.
ALTER TABLE public.crm_settings ADD COLUMN IF NOT EXISTS lessons_from timestamptz NOT NULL DEFAULT now();

-- One child, one subject, one tutor, for one family: a line of the team's payment tracker.
CREATE TABLE IF NOT EXISTS public.enrolments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  student_name text,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  subject text NOT NULL,
  tutor_id uuid REFERENCES public.tutor_profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  rate_per_session numeric(12,2),
  -- Tutor pay earned before the cut-over, from the tracker import. The tutor payouts slice reads these.
  opening_tutor_pay_kes numeric(12,2),
  opening_tutor_paid_kes numeric(12,2),
  opening_tutor_reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS enrolments_family_idx ON public.enrolments (family_id, status);

-- What a family prepaid for one enrolment. A top-up is a new pack; lessons use the oldest pack with sessions left.
-- paid_on is empty for packs imported from the tracker, which has no payment dates.
CREATE TABLE IF NOT EXISTS public.session_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrolment_id uuid NOT NULL REFERENCES public.enrolments(id) ON DELETE RESTRICT,
  amount_kes numeric(12,2) NOT NULL CHECK (amount_kes >= 0),
  reference text,
  paid_on date DEFAULT ((now() AT TIME ZONE 'Africa/Nairobi')::date),
  sessions_bought numeric(6,2) NOT NULL CHECK (sessions_bought > 0),
  rate_per_session numeric(12,2) NOT NULL CHECK (rate_per_session >= 0),
  sessions_used numeric(6,2) NOT NULL DEFAULT 0 CHECK (sessions_used >= 0),
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS session_packs_enrolment_idx ON public.session_packs (enrolment_id, paid_on);

-- One report per lesson. A trigger fills in the enrolment, the pack and the tutor's pay.
CREATE TABLE IF NOT EXISTS public.lesson_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  enrolment_id uuid REFERENCES public.enrolments(id) ON DELETE RESTRICT,
  attendance text NOT NULL
    CHECK (attendance IN ('delivered', 'student_absent', 'tutor_absent', 'late_cancellation', 'cancelled')),
  covered text,
  homework text,
  engagement integer CHECK (engagement BETWEEN 1 AND 5),
  tutor_pay_kes numeric(12,2),
  pack_id uuid REFERENCES public.session_packs(id) ON DELETE RESTRICT,
  confirmed_by uuid DEFAULT auth.uid(),
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lesson_reports_enrolment_idx ON public.lesson_reports (enrolment_id, confirmed_at DESC);
CREATE INDEX IF NOT EXISTS lesson_reports_pack_idx ON public.lesson_reports (pack_id);

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS enrolment_id uuid REFERENCES public.enrolments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS bookings_enrolment_idx ON public.bookings (enrolment_id);

DROP TRIGGER IF EXISTS update_enrolments_updated_at ON public.enrolments;
CREATE TRIGGER update_enrolments_updated_at BEFORE UPDATE ON public.enrolments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- The tutor of an existing child and subject can be set or changed afterwards (the team often records a
-- payment before a tutor is chosen), but never onto a second entry for the same child, subject and tutor:
-- credit would be split across two entries and lessons would only ever use one.
CREATE OR REPLACE FUNCTION public.crm_enrolments_before_update_tutor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tutor_id IS DISTINCT FROM OLD.tutor_id AND EXISTS (
    SELECT 1 FROM enrolments x
    WHERE x.id <> NEW.id
      AND x.family_id = NEW.family_id
      AND public.crm_norm_text(x.subject) = public.crm_norm_text(NEW.subject)
      AND x.tutor_id IS NOT DISTINCT FROM NEW.tutor_id
      AND (
        (NEW.student_id IS NOT NULL AND x.student_id = NEW.student_id)
        OR (public.crm_norm_text(NEW.student_name) <> ''
            AND public.crm_norm_text(x.student_name) = public.crm_norm_text(NEW.student_name))
      )
  ) THEN
    RAISE EXCEPTION 'There is already an entry for this child, subject and tutor. Record payments there instead.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS crm_enrolments_before_update_tutor ON public.enrolments;
CREATE TRIGGER crm_enrolments_before_update_tutor BEFORE UPDATE OF tutor_id ON public.enrolments
  FOR EACH ROW EXECUTE FUNCTION public.crm_enrolments_before_update_tutor();

-- A pack without a rate gets amount / sessions; the team can type over it.
CREATE OR REPLACE FUNCTION public.crm_session_packs_before_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.rate_per_session IS NULL AND NEW.sessions_bought > 0 THEN
    NEW.rate_per_session := round(NEW.amount_kes / NEW.sessions_bought, 2);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS crm_session_packs_before_insert ON public.session_packs;
CREATE TRIGGER crm_session_packs_before_insert BEFORE INSERT ON public.session_packs
  FOR EACH ROW EXECUTE FUNCTION public.crm_session_packs_before_insert();

-- The family behind a booking account: linked by profile, else matched by phone, else created.
CREATE OR REPLACE FUNCTION public.crm_ensure_family_for_user(p_user uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_family uuid;
  v_phone text;
  v_name text;
  v_email text;
  v_has_profile boolean;
BEGIN
  IF p_user IS NULL THEN RETURN NULL; END IF;
  SELECT id INTO v_family FROM families WHERE parent_profile_id = p_user ORDER BY created_at LIMIT 1;
  IF v_family IS NOT NULL THEN RETURN v_family; END IF;

  SELECT public.crm_normalize_phone(p.phone_number), nullif(btrim(p.full_name), ''), true
  INTO v_phone, v_name, v_has_profile
  FROM profiles p WHERE p.id = p_user;
  -- The email only lives in auth.users; a family without it is still fine.
  BEGIN
    SELECT nullif(lower(btrim(u.email)), '') INTO v_email FROM auth.users u WHERE u.id = p_user;
  EXCEPTION WHEN OTHERS THEN
    v_email := NULL;
  END;

  v_family := public.crm_upsert_family(v_phone, v_name, v_email);
  IF coalesce(v_has_profile, false) THEN
    UPDATE families SET parent_profile_id = p_user WHERE id = v_family AND parent_profile_id IS NULL;
  END IF;
  RETURN v_family;
END $$;

-- The enrolment a lesson belongs to: same family, subject, tutor and child, or a new one.
-- The child matches by record, or by name for enrolments typed in by hand (then it is linked).
-- With no child on the booking, the account holder is the learner.
CREATE OR REPLACE FUNCTION public.crm_ensure_enrolment(b public.bookings)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_family uuid;
  v_student_id uuid := b.student_profile_id;
  v_student_name text;
  v_tutor uuid;
  v_subject text := nullif(btrim(b.subject), '');
  v_enrolment uuid;
BEGIN
  v_family := public.crm_ensure_family_for_user(b.student_id);
  IF v_family IS NULL THEN RETURN NULL; END IF;

  IF v_student_id IS NOT NULL THEN
    SELECT nullif(btrim(s.full_name), '') INTO v_student_name FROM students s WHERE s.id = v_student_id;
  END IF;
  IF v_student_name IS NULL THEN
    SELECT nullif(btrim(p.full_name), '') INTO v_student_name FROM profiles p WHERE p.id = b.student_id;
  END IF;
  SELECT tp.id INTO v_tutor FROM tutor_profiles tp WHERE tp.user_id = b.tutor_id ORDER BY tp.created_at LIMIT 1;

  SELECT e.id INTO v_enrolment
  FROM enrolments e
  WHERE e.family_id = v_family
    AND public.crm_norm_text(e.subject) = public.crm_norm_text(v_subject)
    AND e.tutor_id IS NOT DISTINCT FROM v_tutor
    AND (
      (v_student_id IS NOT NULL AND e.student_id = v_student_id)
      OR (public.crm_norm_text(e.student_name) <> ''
          AND public.crm_norm_text(e.student_name) = public.crm_norm_text(v_student_name)
          AND (e.student_id IS NULL OR e.student_id IS NOT DISTINCT FROM v_student_id))
    )
  ORDER BY (e.student_id IS NOT DISTINCT FROM v_student_id) DESC, (e.status = 'active') DESC, e.created_at
  LIMIT 1;

  IF v_enrolment IS NOT NULL THEN
    UPDATE enrolments
    SET student_id = coalesce(student_id, v_student_id), status = 'active'
    WHERE id = v_enrolment
      AND ((student_id IS NULL AND v_student_id IS NOT NULL) OR status <> 'active');
    RETURN v_enrolment;
  END IF;

  -- A payment saved before a tutor was chosen sits on an entry with no tutor. The first lesson with a
  -- tutor for the same child and subject takes that entry over, so the money is not left on an entry
  -- no lesson will ever find.
  IF v_tutor IS NOT NULL THEN
    SELECT e.id INTO v_enrolment
    FROM enrolments e
    WHERE e.family_id = v_family
      AND e.tutor_id IS NULL
      AND public.crm_norm_text(e.subject) = public.crm_norm_text(v_subject)
      AND (
        (v_student_id IS NOT NULL AND e.student_id = v_student_id)
        OR (public.crm_norm_text(e.student_name) <> ''
            AND public.crm_norm_text(e.student_name) = public.crm_norm_text(v_student_name)
            AND (e.student_id IS NULL OR e.student_id IS NOT DISTINCT FROM v_student_id))
      )
    ORDER BY (e.student_id IS NOT DISTINCT FROM v_student_id) DESC, (e.status = 'active') DESC, e.created_at
    LIMIT 1;
    IF v_enrolment IS NOT NULL THEN
      UPDATE enrolments
      SET tutor_id = v_tutor, student_id = coalesce(student_id, v_student_id), status = 'active'
      WHERE id = v_enrolment;
      RETURN v_enrolment;
    END IF;
  END IF;

  INSERT INTO enrolments (family_id, student_id, student_name, subject, tutor_id)
  VALUES (v_family, v_student_id, v_student_name, coalesce(v_subject, 'Lesson'), v_tutor)
  RETURNING id INTO v_enrolment;
  RETURN v_enrolment;
END $$;

-- Every new lesson is linked to its enrolment, whichever page created it. Never blocks the booking.
CREATE OR REPLACE FUNCTION public.crm_bookings_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    IF NEW.enrolment_id IS NULL THEN
      NEW.enrolment_id := public.crm_ensure_enrolment(NEW);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'CRM: could not link booking % to an enrolment: %', NEW.id, SQLERRM;
    NEW.enrolment_id := NULL;
  END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS crm_bookings_before_insert ON public.bookings;
CREATE TRIGGER crm_bookings_before_insert BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.crm_bookings_before_insert();

-- Confirming a lesson: find its enrolment, take one session from the oldest pack with sessions left
-- (unless the lesson does not count) and fix the tutor's pay. Anything the client sends for those
-- columns is ignored. Never blocks the report: with no pack it is saved unpriced, and a later
-- payment picks it up.
CREATE OR REPLACE FUNCTION public.crm_lesson_reports_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  b public.bookings;
  v_enrolment uuid;
  v_pack public.session_packs;
  v_pack_id uuid;
  v_pay numeric(12,2);
  v_counts boolean := NEW.attendance IN ('delivered', 'student_absent', 'late_cancellation');
BEGIN
  BEGIN
    SELECT * INTO b FROM bookings WHERE id = NEW.booking_id;
    IF FOUND THEN
      v_enrolment := b.enrolment_id;
      IF v_enrolment IS NULL THEN
        v_enrolment := public.crm_ensure_enrolment(b);
        IF v_enrolment IS NOT NULL THEN
          UPDATE bookings SET enrolment_id = v_enrolment WHERE id = b.id;
        END IF;
      END IF;
    END IF;

    IF NOT v_counts THEN
      v_pay := 0;
    ELSIF v_enrolment IS NULL THEN
      RAISE WARNING 'CRM: no enrolment for booking %; the lesson is confirmed without a pack', NEW.booking_id;
    ELSE
      PERFORM pg_advisory_xact_lock(hashtextextended(v_enrolment::text, 0));
      SELECT * INTO v_pack FROM session_packs
      WHERE enrolment_id = v_enrolment AND sessions_bought - sessions_used >= 1
      ORDER BY paid_on NULLS FIRST, created_at, id
      LIMIT 1;
      IF FOUND THEN
        UPDATE session_packs SET sessions_used = sessions_used + 1 WHERE id = v_pack.id;
        v_pack_id := v_pack.id;
        v_pay := round(v_pack.rate_per_session * public.crm_tutor_share(), 2);
      ELSE
        RAISE WARNING 'CRM: no prepaid session left for enrolment %; the lesson is confirmed without a pack', v_enrolment;
      END IF;
    END IF;

    NEW.enrolment_id := v_enrolment;
    NEW.pack_id := v_pack_id;
    NEW.tutor_pay_kes := v_pay;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'CRM: could not apply lesson report for booking %: %', NEW.booking_id, SQLERRM;
    NEW.enrolment_id := NULL;
    NEW.pack_id := NULL;
    NEW.tutor_pay_kes := NULL;
  END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS crm_lesson_reports_before_insert ON public.lesson_reports;
CREATE TRIGGER crm_lesson_reports_before_insert BEFORE INSERT ON public.lesson_reports
  FOR EACH ROW EXECUTE FUNCTION public.crm_lesson_reports_before_insert();

-- Notes can be corrected; the lesson and its outcome cannot, because the pack arithmetic hangs off them.
-- To change attendance, delete the report (the session goes back to the pack) and confirm again.
CREATE OR REPLACE FUNCTION public.crm_lesson_reports_before_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.booking_id IS DISTINCT FROM OLD.booking_id
     OR NEW.enrolment_id IS DISTINCT FROM OLD.enrolment_id
     OR NEW.attendance IS DISTINCT FROM OLD.attendance THEN
    RAISE EXCEPTION 'Undo the confirmation and confirm the lesson again to change what happened';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS crm_lesson_reports_before_update ON public.lesson_reports;
CREATE TRIGGER crm_lesson_reports_before_update BEFORE UPDATE ON public.lesson_reports
  FOR EACH ROW EXECUTE FUNCTION public.crm_lesson_reports_before_update();

-- Undoing a confirmation (or deleting the lesson) gives the session back.
CREATE OR REPLACE FUNCTION public.crm_lesson_reports_after_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    IF OLD.pack_id IS NOT NULL THEN
      UPDATE session_packs SET sessions_used = greatest(sessions_used - 1, 0) WHERE id = OLD.pack_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'CRM: could not release the session of report %: %', OLD.id, SQLERRM;
  END;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS crm_lesson_reports_after_delete ON public.lesson_reports;
CREATE TRIGGER crm_lesson_reports_after_delete AFTER DELETE ON public.lesson_reports
  FOR EACH ROW EXECUTE FUNCTION public.crm_lesson_reports_after_delete();

-- A payment recorded after lessons were confirmed pays for them, oldest lesson first, up to the pack's size.
CREATE OR REPLACE FUNCTION public.crm_session_packs_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
  v_room integer := floor(NEW.sessions_bought - NEW.sessions_used)::integer;
BEGIN
  BEGIN
    IF v_room > 0 THEN
      PERFORM pg_advisory_xact_lock(hashtextextended(NEW.enrolment_id::text, 0));
      FOR r IN
        SELECT lr.id
        FROM lesson_reports lr
        JOIN bookings b ON b.id = lr.booking_id
        JOIN tutor_availability a ON a.id = b.availability_slot_id
        WHERE lr.enrolment_id = NEW.enrolment_id
          AND lr.pack_id IS NULL
          AND lr.attendance IN ('delivered', 'student_absent', 'late_cancellation')
        ORDER BY a.start_time, lr.confirmed_at, lr.id
        LIMIT v_room
      LOOP
        UPDATE lesson_reports
        SET pack_id = NEW.id, tutor_pay_kes = round(NEW.rate_per_session * public.crm_tutor_share(), 2)
        WHERE id = r.id;
        UPDATE session_packs SET sessions_used = sessions_used + 1 WHERE id = NEW.id;
      END LOOP;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'CRM: could not apply pack % to waiting lessons: %', NEW.id, SQLERRM;
  END;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS crm_session_packs_after_insert ON public.session_packs;
CREATE TRIGGER crm_session_packs_after_insert AFTER INSERT ON public.session_packs
  FOR EACH ROW EXECUTE FUNCTION public.crm_session_packs_after_insert();

-- Correcting a payment. Its amount, sessions, rate and child are fixed once recorded: tutor pay is priced
-- from the rate when a lesson is confirmed, so changing money in place would leave pay and balances wrong.
-- The way to change money is to remove the payment and record it again. A typo in the reference or the
-- date can be fixed in place, and the timeline shows what changed. Only sessions_used moves by itself
-- (the lesson triggers), and that is not a correction.
CREATE OR REPLACE FUNCTION public.crm_session_packs_before_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  e enrolments;
  v_changes text[] := ARRAY[]::text[];
BEGIN
  IF NEW.enrolment_id IS DISTINCT FROM OLD.enrolment_id
     OR NEW.amount_kes IS DISTINCT FROM OLD.amount_kes
     OR NEW.sessions_bought IS DISTINCT FROM OLD.sessions_bought
     OR NEW.rate_per_session IS DISTINCT FROM OLD.rate_per_session THEN
    RAISE EXCEPTION 'The amount, sessions, rate and child of a payment cannot be changed. Remove the payment and record it again.';
  END IF;

  IF NEW.reference IS DISTINCT FROM OLD.reference THEN
    v_changes := v_changes || ('ref ' || coalesce(OLD.reference, 'none') || ' → ' || coalesce(NEW.reference, 'none'));
  END IF;
  IF NEW.paid_on IS DISTINCT FROM OLD.paid_on THEN
    v_changes := v_changes || ('paid on ' || coalesce(to_char(OLD.paid_on, 'YYYY-MM-DD'), 'no date')
                               || ' → ' || coalesce(to_char(NEW.paid_on, 'YYYY-MM-DD'), 'no date'));
  END IF;
  IF array_length(v_changes, 1) IS NOT NULL THEN
    BEGIN
      SELECT * INTO e FROM enrolments WHERE id = OLD.enrolment_id;
      INSERT INTO lead_activities (family_id, kind, body, meta)
      VALUES (e.family_id, 'system',
              'Payment corrected (' || coalesce(nullif(btrim(e.student_name), ''), 'child') || ', ' || e.subject
                || ', KES ' || to_char(OLD.amount_kes, 'FM999,999,990') || '): ' || array_to_string(v_changes, '; '),
              jsonb_build_object('pack_id', OLD.id));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'CRM: could not log the correction of payment %: %', OLD.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS crm_session_packs_before_update ON public.session_packs;
CREATE TRIGGER crm_session_packs_before_update BEFORE UPDATE ON public.session_packs
  FOR EACH ROW EXECUTE FUNCTION public.crm_session_packs_before_update();

-- Removing a payment entered by mistake. Once sessions have been taken from it (lessons, or an imported
-- opening balance) it stays; undo those lessons first. The timeline keeps a line saying what was removed.
CREATE OR REPLACE FUNCTION public.crm_session_packs_before_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  e enrolments;
BEGIN
  IF OLD.sessions_used > 0 THEN
    RAISE EXCEPTION 'Sessions have already been taken from this payment, so it cannot be removed. Undo those lessons first.';
  END IF;
  BEGIN
    SELECT * INTO e FROM enrolments WHERE id = OLD.enrolment_id;
    INSERT INTO lead_activities (family_id, kind, body, meta, source_table, source_id)
    VALUES (e.family_id, 'system',
            'Payment removed: KES ' || to_char(OLD.amount_kes, 'FM999,999,990')
              || ' for ' || trim_scale(OLD.sessions_bought)::text
              || CASE WHEN OLD.sessions_bought = 1 THEN ' session' ELSE ' sessions' END
              || ' (' || coalesce(nullif(btrim(e.student_name), ''), 'child') || ', ' || e.subject || ')'
              || CASE WHEN nullif(btrim(OLD.reference), '') IS NULL THEN '' ELSE ', ref ' || btrim(OLD.reference) END,
            jsonb_build_object('pack_id', OLD.id, 'amount_kes', OLD.amount_kes, 'sessions', OLD.sessions_bought),
            'session_packs', OLD.id::text || ':removed')
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'CRM: could not log the removal of payment %: %', OLD.id, SQLERRM;
  END;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS crm_session_packs_before_delete ON public.session_packs;
CREATE TRIGGER crm_session_packs_before_delete BEFORE DELETE ON public.session_packs
  FOR EACH ROW EXECUTE FUNCTION public.crm_session_packs_before_delete();

-- Record payment (admin only): a new pack for an enrolment. The rate defaults to amount / sessions.
-- The payment also lands on the family timeline, and a family that has paid is active.
-- Sessions may be fractional (half sessions), so p_sessions_bought is numeric. The earlier integer
-- signature is dropped so a database that ran an older draft of this file keeps exactly one function.
DROP FUNCTION IF EXISTS public.crm_record_payment(uuid, numeric, text, date, integer, numeric);
CREATE OR REPLACE FUNCTION public.crm_record_payment(
  p_enrolment_id uuid,
  p_amount_kes numeric,
  p_reference text DEFAULT NULL,
  p_paid_on date DEFAULT NULL,
  p_sessions_bought numeric DEFAULT NULL,
  p_rate_per_session numeric DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  e enrolments;
  v_pack uuid;
  v_lead uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can record payments' USING ERRCODE = '42501';
  END IF;
  IF p_amount_kes IS NULL OR p_amount_kes <= 0 THEN
    RAISE EXCEPTION 'Enter the amount that was paid';
  END IF;
  IF p_sessions_bought IS NULL OR p_sessions_bought <= 0 THEN
    RAISE EXCEPTION 'Enter how many sessions were bought';
  END IF;
  IF p_rate_per_session IS NOT NULL AND p_rate_per_session < 0 THEN
    RAISE EXCEPTION 'The rate cannot be negative';
  END IF;
  SELECT * INTO e FROM enrolments WHERE id = p_enrolment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That child and subject does not exist';
  END IF;

  INSERT INTO session_packs (enrolment_id, amount_kes, reference, paid_on, sessions_bought, rate_per_session, created_by)
  VALUES (e.id, p_amount_kes, nullif(btrim(p_reference), ''),
          coalesce(p_paid_on, (now() AT TIME ZONE 'Africa/Nairobi')::date),
          p_sessions_bought, p_rate_per_session, auth.uid())
  RETURNING id INTO v_pack;

  UPDATE families SET status = 'active' WHERE id = e.family_id AND status = 'prospect';

  SELECT id INTO v_lead FROM leads WHERE family_id = e.family_id AND stage NOT IN ('won', 'lost')
  ORDER BY created_at DESC LIMIT 1;
  INSERT INTO lead_activities (family_id, lead_id, kind, body, meta, source_table, source_id, created_by)
  VALUES (e.family_id, v_lead, 'system',
          'Payment recorded: KES ' || to_char(p_amount_kes, 'FM999,999,990')
            || ' for ' || p_sessions_bought || CASE WHEN p_sessions_bought = 1 THEN ' session' ELSE ' sessions' END
            || ' (' || coalesce(nullif(btrim(e.student_name), ''), 'child') || ', ' || e.subject || ')'
            || CASE WHEN nullif(btrim(p_reference), '') IS NULL THEN '' ELSE ', ref ' || btrim(p_reference) END,
          jsonb_build_object('pack_id', v_pack, 'amount_kes', p_amount_kes, 'sessions', p_sessions_bought),
          'session_packs', v_pack::text, auth.uid())
  ON CONFLICT DO NOTHING;
  RETURN v_pack;
END $$;

-- Per enrolment: sessions bought, used and left, what was paid, and the credit the family still holds
-- (the tracker's formula: paid minus sessions used times the rate, pack by pack). Lessons confirmed
-- before a payment was recorded are counted as unpriced until a pack picks them up.
CREATE OR REPLACE VIEW public.crm_enrolment_balances WITH (security_invoker = true) AS
SELECT
  e.id AS enrolment_id,
  e.family_id,
  f.parent_name AS family_name,
  f.phone AS family_phone,
  e.student_name,
  e.subject,
  e.tutor_id,
  CASE WHEN e.tutor_id IS NULL THEN NULL ELSE coalesce(nullif(btrim(tpr.full_name), ''), 'Tutor') END AS tutor_name,
  e.status,
  coalesce(
    (SELECT sp.rate_per_session FROM session_packs sp WHERE sp.enrolment_id = e.id
     ORDER BY sp.paid_on DESC NULLS LAST, sp.created_at DESC LIMIT 1),
    e.rate_per_session) AS rate_per_session,
  coalesce(pk.packs, 0)::integer AS packs,
  coalesce(pk.bought, 0)::numeric(8,2) AS sessions_bought,
  coalesce(pk.used, 0)::numeric(8,2) AS sessions_used,
  (coalesce(pk.bought, 0) - coalesce(pk.used, 0))::numeric(8,2) AS sessions_left,
  coalesce(pk.paid, 0)::numeric(12,2) AS amount_paid,
  coalesce(pk.balance, 0)::numeric(12,2) AS balance,
  coalesce(rp.unpriced, 0)::integer AS unpriced_lessons,
  rp.last_lesson_at
FROM enrolments e
JOIN families f ON f.id = e.family_id
LEFT JOIN tutor_profiles tp ON tp.id = e.tutor_id
LEFT JOIN profiles tpr ON tpr.id = tp.user_id
LEFT JOIN LATERAL (
  SELECT count(*) AS packs,
         sum(sp.sessions_bought) AS bought,
         sum(sp.sessions_used) AS used,
         sum(sp.amount_kes) AS paid,
         sum(sp.amount_kes - sp.sessions_used * sp.rate_per_session) AS balance
  FROM session_packs sp WHERE sp.enrolment_id = e.id
) pk ON true
LEFT JOIN LATERAL (
  SELECT count(*) FILTER (WHERE r.pack_id IS NULL AND r.attendance IN ('delivered', 'student_absent', 'late_cancellation')) AS unpriced,
         max(a.end_time) FILTER (WHERE r.attendance = 'delivered') AS last_lesson_at
  FROM lesson_reports r
  JOIN bookings b ON b.id = r.booking_id
  JOIN tutor_availability a ON a.id = b.availability_slot_id
  WHERE r.enrolment_id = e.id
) rp ON true;

-- Every lesson with its names and, once confirmed, its report: the week view and the "Needs confirming"
-- queue read this. tracked is false for lessons that ended before the cut-over.
CREATE OR REPLACE VIEW public.crm_lessons WITH (security_invoker = true) AS
SELECT
  b.id AS booking_id,
  b.enrolment_id,
  e.family_id,
  f.parent_name AS family_name,
  f.phone AS family_phone,
  coalesce(nullif(btrim(e.student_name), ''), nullif(btrim(st.full_name), ''), nullif(btrim(sp.full_name), '')) AS student_name,
  coalesce(nullif(btrim(e.subject), ''), b.subject) AS subject,
  b.tutor_id AS tutor_user_id,
  tp.id AS tutor_profile_id,
  coalesce(nullif(btrim(tpr.full_name), ''), 'Tutor') AS tutor_name,
  a.start_time AS starts_at,
  a.end_time AS ends_at,
  b.status AS booking_status,
  b.class_type,
  r.id AS report_id,
  r.attendance,
  r.covered,
  r.homework,
  r.engagement,
  r.tutor_pay_kes,
  r.pack_id,
  r.confirmed_at,
  (a.end_time >= s.lessons_from) AS tracked
FROM bookings b
JOIN tutor_availability a ON a.id = b.availability_slot_id
CROSS JOIN crm_settings s
LEFT JOIN enrolments e ON e.id = b.enrolment_id
LEFT JOIN families f ON f.id = e.family_id
LEFT JOIN students st ON st.id = b.student_profile_id
LEFT JOIN profiles sp ON sp.id = b.student_id
LEFT JOIN LATERAL (
  SELECT t.id FROM tutor_profiles t WHERE t.user_id = b.tutor_id ORDER BY t.created_at LIMIT 1
) tp ON true
LEFT JOIN profiles tpr ON tpr.id = b.tutor_id
LEFT JOIN lesson_reports r ON r.booking_id = b.id;

-- Internal helpers stay off the public API; Record payment checks the role itself.
REVOKE ALL ON FUNCTION public.crm_tutor_share() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_norm_text(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_ensure_family_for_user(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_ensure_enrolment(public.bookings) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_bookings_before_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_session_packs_before_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_session_packs_after_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_session_packs_before_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_session_packs_before_delete() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_enrolments_before_update_tutor() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_lesson_reports_before_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_lesson_reports_before_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_lesson_reports_after_delete() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_record_payment(uuid, numeric, text, date, numeric, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_record_payment(uuid, numeric, text, date, numeric, numeric) TO authenticated;

ALTER TABLE public.enrolments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage enrolments" ON public.enrolments;
CREATE POLICY "Admins manage enrolments" ON public.enrolments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage session packs" ON public.session_packs;
CREATE POLICY "Admins manage session packs" ON public.session_packs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage lesson reports" ON public.lesson_reports;
CREATE POLICY "Admins manage lesson reports" ON public.lesson_reports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

REVOKE ALL ON public.enrolments, public.session_packs, public.lesson_reports,
  public.crm_enrolment_balances, public.crm_lessons FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrolments, public.session_packs, public.lesson_reports TO authenticated;
GRANT SELECT ON public.crm_enrolment_balances, public.crm_lessons TO authenticated;
GRANT ALL ON public.enrolments, public.session_packs, public.lesson_reports,
  public.crm_enrolment_balances, public.crm_lessons TO service_role;
