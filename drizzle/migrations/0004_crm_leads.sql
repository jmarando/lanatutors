-- CRM leads slice: one family record and one lead pipeline, fed by WhatsApp chats,
-- assessment bookings and web forms. Safe to run more than once.
-- Spec: docs/superpowers/specs/2026-10-28-crm-redesign-design.md

-- Phone numbers are stored as international digits: 0712 345 678 -> 254712345678.
CREATE OR REPLACE FUNCTION public.crm_normalize_phone(p text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  d text := regexp_replace(coalesce(p, ''), '\D', '', 'g');
BEGIN
  IF left(d, 2) = '00' THEN d := substr(d, 3); END IF;
  IF length(d) = 13 AND left(d, 4) = '2540' THEN d := '254' || substr(d, 5); END IF;
  IF length(d) < 9 THEN RETURN NULL; END IF;
  IF length(d) = 10 AND left(d, 1) = '0' THEN RETURN '254' || right(d, 9); END IF;
  IF length(d) = 9 AND left(d, 1) IN ('7', '1') THEN RETURN '254' || d; END IF;
  RETURN d;
END $$;

-- consultation_bookings keeps the date and a "02:00 PM" style time separately, in Nairobi time.
CREATE OR REPLACE FUNCTION public.crm_assessment_time(p_date date, p_time text)
RETURNS timestamptz LANGUAGE plpgsql STABLE AS $$
BEGIN
  IF p_date IS NULL THEN RETURN NULL; END IF;
  BEGIN
    RETURN (p_date::text || ' ' || coalesce(nullif(btrim(p_time), ''), '09:00'))::timestamp AT TIME ZONE 'Africa/Nairobi';
  EXCEPTION WHEN OTHERS THEN
    RETURN (p_date::text || ' 09:00')::timestamp AT TIME ZONE 'Africa/Nairobi';
  END;
END $$;

CREATE OR REPLACE FUNCTION public.crm_stage_label(p_stage text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_stage
    WHEN 'new' THEN 'New' WHEN 'contacted' THEN 'Contacted' WHEN 'call_booked' THEN 'Call booked'
    WHEN 'call_done' THEN 'Call done' WHEN 'won' THEN 'Won' WHEN 'lost' THEN 'Lost' ELSE p_stage END
$$;

CREATE TABLE IF NOT EXISTS public.families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_name text,
  phone text UNIQUE,
  email text,
  area text,
  parent_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'prospect' CHECK (status IN ('prospect', 'active', 'paused', 'former')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.crm_families_normalize_phone()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.phone IS NOT NULL THEN
    NEW.phone := public.crm_normalize_phone(NEW.phone);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS crm_families_normalize_phone ON public.families;
CREATE TRIGGER crm_families_normalize_phone BEFORE INSERT OR UPDATE OF phone ON public.families
  FOR EACH ROW EXECUTE FUNCTION public.crm_families_normalize_phone();

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'other'
    CHECK (channel IN ('whatsapp', 'assessment_form', 'website_form', 'phone', 'email', 'referral', 'walk_in', 'import', 'other')),
  source_table text,
  source_id text,
  stage text NOT NULL DEFAULT 'new' CHECK (stage IN ('new', 'contacted', 'call_booked', 'call_done', 'won', 'lost')),
  owner_id uuid,
  next_step text,
  next_step_at timestamptz,
  next_step_owner_id uuid,
  needs_reply boolean NOT NULL DEFAULT false,
  student_name text,
  grade_level text,
  curriculum text,
  subjects text[] NOT NULL DEFAULT '{}',
  mode text,
  budget text,
  urgency text,
  assessment_at timestamptz,
  assessment_outcome text,
  recommended_tutor_id uuid REFERENCES public.tutor_profiles(id) ON DELETE SET NULL,
  quoted_rate_kes numeric,
  quoted_package text,
  lost_reason text CHECK (lost_reason IN ('price', 'timing', 'no_reply', 'not_a_fit', 'went_elsewhere', 'stale', 'other')),
  won_at timestamptz,
  lost_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leads_lost_needs_reason CHECK (stage <> 'lost' OR lost_reason IS NOT NULL)
);
-- A family has at most one open lead; a second child or a new term opens a new one after it closes.
CREATE UNIQUE INDEX IF NOT EXISTS leads_one_open_per_family ON public.leads (family_id) WHERE stage NOT IN ('won', 'lost');
CREATE UNIQUE INDEX IF NOT EXISTS leads_source_uidx ON public.leads (source_table, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_family_idx ON public.leads (family_id);
CREATE INDEX IF NOT EXISTS leads_stage_idx ON public.leads (stage, last_activity_at DESC);

CREATE TABLE IF NOT EXISTS public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'note' CHECK (kind IN ('note', 'call', 'whatsapp', 'email', 'stage_change', 'assessment', 'system')),
  body text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_table text,
  source_id text,
  created_by uuid DEFAULT auth.uid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lead_activities_family_idx ON public.lead_activities (family_id, occurred_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS lead_activities_source_uidx ON public.lead_activities (source_table, source_id) WHERE source_id IS NOT NULL;

-- One row: who new leads go to by default.
CREATE TABLE IF NOT EXISTS public.crm_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  default_owner_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.crm_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

ALTER TABLE public.consultation_bookings ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES public.families(id) ON DELETE SET NULL;
ALTER TABLE public.whatsapp_conversations ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES public.families(id) ON DELETE SET NULL;

-- Find the family for a phone number, or create it. Fills in a missing name or email.
CREATE OR REPLACE FUNCTION public.crm_upsert_family(p_phone text, p_name text, p_email text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_phone text := public.crm_normalize_phone(p_phone);
  v_name text := nullif(btrim(p_name), '');
  v_email text := nullif(lower(btrim(p_email)), '');
  v_id uuid;
BEGIN
  IF v_phone IS NULL THEN
    INSERT INTO families (parent_name, email) VALUES (v_name, v_email) RETURNING id INTO v_id;
    RETURN v_id;
  END IF;
  INSERT INTO families (phone, parent_name, email) VALUES (v_phone, v_name, v_email)
  ON CONFLICT (phone) DO UPDATE
    SET parent_name = coalesce(families.parent_name, excluded.parent_name),
        email = coalesce(families.email, excluded.email)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- The family's open lead, created if it has none. A known source record returns its own lead.
CREATE OR REPLACE FUNCTION public.crm_open_lead(p_family_id uuid, p_channel text, p_source_table text, p_source_id text, p_at timestamptz DEFAULT now())
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_source_id IS NOT NULL THEN
    SELECT id INTO v_id FROM leads WHERE source_table = p_source_table AND source_id = p_source_id;
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  END IF;
  SELECT id INTO v_id FROM leads WHERE family_id = p_family_id AND stage NOT IN ('won', 'lost');
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  BEGIN
    INSERT INTO leads (family_id, channel, source_table, source_id, owner_id, created_at, last_activity_at)
    VALUES (p_family_id, coalesce(p_channel, 'other'), p_source_table, p_source_id,
            (SELECT default_owner_id FROM crm_settings WHERE id), coalesce(p_at, now()), coalesce(p_at, now()))
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT id INTO v_id FROM leads WHERE family_id = p_family_id AND stage NOT IN ('won', 'lost');
  END;
  RETURN v_id;
END $$;

-- An assessment call was booked. Returns the family id.
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

CREATE OR REPLACE FUNCTION public.crm_consultation_bookings_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    NEW.family_id := public.crm_record_assessment_booking(NEW);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'CRM: could not record assessment booking %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS crm_consultation_bookings_before_insert ON public.consultation_bookings;
CREATE TRIGGER crm_consultation_bookings_before_insert BEFORE INSERT ON public.consultation_bookings
  FOR EACH ROW EXECUTE FUNCTION public.crm_consultation_bookings_before_insert();

-- WhatsApp: a new chat opens a lead; a hand-off flags it; a team reply clears the flag.
-- New messages are found by timestamp, because one update can append the parent's message and the bot's reply.
CREATE OR REPLACE FUNCTION public.crm_whatsapp_before_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lead uuid;
  v_old_ts text;
  v_inbound boolean;
  v_team_reply boolean;
BEGIN
  BEGIN
    IF NEW.family_id IS NULL THEN
      NEW.family_id := public.crm_upsert_family(NEW.phone_number, NEW.profile_name, NULL);
      -- The chat's key is the phone number, so it cannot identify a single lead;
      -- the family's open lead is the source of truth here.
      PERFORM public.crm_open_lead(NEW.family_id, 'whatsapp', NULL, NULL, coalesce(NEW.created_at, now()));
    END IF;
    IF TG_OP = 'UPDATE' THEN
      v_old_ts := OLD.messages -> -1 ->> 'ts';
      SELECT coalesce(bool_or(m ->> 'role' = 'user'), false), coalesce(bool_or(m ->> 'sent_by' = 'human'), false)
      INTO v_inbound, v_team_reply
      FROM jsonb_array_elements(NEW.messages) m
      WHERE NEW.messages IS DISTINCT FROM OLD.messages AND (v_old_ts IS NULL OR (m ->> 'ts') > v_old_ts);

      SELECT id INTO v_lead FROM leads WHERE family_id = NEW.family_id AND stage NOT IN ('won', 'lost');
      -- A parent who never became a customer writing again is a new enquiry.
      IF v_lead IS NULL AND v_inbound
         AND EXISTS (SELECT 1 FROM families WHERE id = NEW.family_id AND status = 'prospect') THEN
        v_lead := public.crm_open_lead(NEW.family_id, 'whatsapp', NULL, NULL, now());
      END IF;

      IF v_lead IS NOT NULL AND coalesce(NEW.escalated, false) AND NOT coalesce(OLD.escalated, false) THEN
        UPDATE leads SET needs_reply = true,
          next_step = coalesce(next_step, 'Reply to the WhatsApp hand-off'),
          next_step_at = coalesce(next_step_at, now())
        WHERE id = v_lead;
        INSERT INTO lead_activities (family_id, lead_id, kind, body, created_by)
        VALUES (NEW.family_id, v_lead, 'system', 'The chat was handed to the team', NULL);
      END IF;

      IF v_lead IS NOT NULL AND NOT coalesce(NEW.escalated, false) AND coalesce(OLD.escalated, false) THEN
        UPDATE leads SET needs_reply = false WHERE id = v_lead;
      END IF;

      IF v_lead IS NOT NULL AND v_team_reply THEN
        UPDATE leads SET needs_reply = false,
          stage = CASE WHEN stage = 'new' THEN 'contacted' ELSE stage END,
          last_activity_at = now()
        WHERE id = v_lead;
      ELSIF v_lead IS NOT NULL AND v_inbound THEN
        -- While the assistant is paused, a message from the parent waits for the team.
        UPDATE leads SET last_activity_at = now(), needs_reply = needs_reply OR coalesce(NEW.escalated, false)
        WHERE id = v_lead;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'CRM: could not update the lead for WhatsApp chat %: %', NEW.phone_number, SQLERRM;
  END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS crm_whatsapp_before_write ON public.whatsapp_conversations;
CREATE TRIGGER crm_whatsapp_before_write BEFORE INSERT OR UPDATE ON public.whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION public.crm_whatsapp_before_write();

-- Other website forms: tutor inquiry, learning-plan request, expert consultation request.
CREATE OR REPLACE FUNCTION public.crm_web_form_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r jsonb := to_jsonb(NEW);
  v_family uuid;
  v_lead uuid;
  v_subjects text[];
  v_label text;
BEGIN
  BEGIN
    v_family := public.crm_upsert_family(
      coalesce(r ->> 'parent_phone', r ->> 'phone_number'), r ->> 'parent_name', coalesce(r ->> 'parent_email', r ->> 'email'));
    v_lead := public.crm_open_lead(v_family, 'website_form', TG_TABLE_NAME, NEW.id::text, coalesce(NEW.created_at, now()));
    SELECT coalesce(array_agg(s), '{}') INTO v_subjects
    FROM jsonb_array_elements_text(coalesce(r -> 'subjects_needed', r -> 'subjects', r -> 'subjects_of_interest', '[]'::jsonb)) s;
    v_label := CASE TG_TABLE_NAME
      WHEN 'tutor_inquiries' THEN 'Sent a tutor inquiry from the website'
      WHEN 'general_learning_plan_requests' THEN 'Requested a learning plan on the website'
      ELSE 'Requested an expert consultation on the website' END;
    UPDATE leads SET
      student_name = coalesce(student_name, nullif(btrim(r ->> 'student_name'), '')),
      grade_level = coalesce(grade_level, nullif(btrim(coalesce(r ->> 'grade_level', r -> 'grade_levels' ->> 0)), '')),
      curriculum = coalesce(curriculum, nullif(btrim(r ->> 'curriculum'), '')),
      subjects = CASE WHEN cardinality(subjects) = 0 THEN v_subjects ELSE subjects END
    WHERE id = v_lead;
    INSERT INTO lead_activities (family_id, lead_id, kind, body, source_table, source_id, occurred_at, created_by)
    VALUES (v_family, v_lead, 'system', v_label, TG_TABLE_NAME, NEW.id::text, coalesce(NEW.created_at, now()), NULL)
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'CRM: could not record % %: %', TG_TABLE_NAME, NEW.id, SQLERRM;
  END;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS crm_web_form_after_insert ON public.tutor_inquiries;
CREATE TRIGGER crm_web_form_after_insert AFTER INSERT ON public.tutor_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.crm_web_form_after_insert();
DROP TRIGGER IF EXISTS crm_web_form_after_insert ON public.general_learning_plan_requests;
CREATE TRIGGER crm_web_form_after_insert AFTER INSERT ON public.general_learning_plan_requests
  FOR EACH ROW EXECUTE FUNCTION public.crm_web_form_after_insert();
DROP TRIGGER IF EXISTS crm_web_form_after_insert ON public.expert_consultation_requests;
CREATE TRIGGER crm_web_form_after_insert AFTER INSERT ON public.expert_consultation_requests
  FOR EACH ROW EXECUTE FUNCTION public.crm_web_form_after_insert();

-- Lead stage bookkeeping. Set crm.quiet = on to skip the timeline entry (used by the backfill).
CREATE OR REPLACE FUNCTION public.crm_leads_before_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    IF NEW.stage = 'won' THEN NEW.won_at := coalesce(NEW.won_at, now()); END IF;
    IF NEW.stage = 'lost' THEN NEW.lost_at := coalesce(NEW.lost_at, now()); END IF;
    IF NEW.stage IN ('won', 'lost') THEN NEW.needs_reply := false; END IF;
    IF NEW.stage NOT IN ('won', 'lost') THEN
      NEW.won_at := NULL; NEW.lost_at := NULL; NEW.lost_reason := NULL;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS crm_leads_before_update ON public.leads;
CREATE TRIGGER crm_leads_before_update BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.crm_leads_before_update();

CREATE OR REPLACE FUNCTION public.crm_leads_after_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    IF coalesce(current_setting('crm.quiet', true), '') <> 'on' THEN
      INSERT INTO lead_activities (family_id, lead_id, kind, body, meta)
      VALUES (NEW.family_id, NEW.id, 'stage_change', 'Moved to ' || public.crm_stage_label(NEW.stage),
              jsonb_build_object('from', OLD.stage, 'to', NEW.stage, 'lost_reason', NEW.lost_reason));
    END IF;
    IF NEW.stage = 'won' THEN
      UPDATE families SET status = 'active' WHERE id = NEW.family_id AND status = 'prospect';
    END IF;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS crm_leads_after_update ON public.leads;
CREATE TRIGGER crm_leads_after_update AFTER UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.crm_leads_after_update();

-- A logged call, message or email keeps the lead fresh; reaching a New lead makes it Contacted.
CREATE OR REPLACE FUNCTION public.crm_activity_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL THEN
    UPDATE leads SET last_activity_at = greatest(last_activity_at, NEW.occurred_at) WHERE id = NEW.lead_id;
    IF NEW.kind IN ('call', 'whatsapp', 'email') AND coalesce(NEW.meta ->> 'outcome', 'reached') = 'reached' THEN
      UPDATE leads SET needs_reply = false, stage = CASE WHEN stage = 'new' THEN 'contacted' ELSE stage END
      WHERE id = NEW.lead_id AND stage NOT IN ('won', 'lost');
    END IF;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS crm_activity_after_insert ON public.lead_activities;
CREATE TRIGGER crm_activity_after_insert AFTER INSERT ON public.lead_activities
  FOR EACH ROW EXECUTE FUNCTION public.crm_activity_after_insert();

DROP TRIGGER IF EXISTS update_families_updated_at ON public.families;
CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON public.families
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC for the "+ Lead" form. Reuses the family and its open lead when the phone is known.
CREATE OR REPLACE FUNCTION public.crm_create_lead(
  p_phone text,
  p_parent_name text,
  p_channel text DEFAULT 'phone',
  p_student_name text DEFAULT NULL,
  p_grade_level text DEFAULT NULL,
  p_curriculum text DEFAULT NULL,
  p_subjects text[] DEFAULT '{}',
  p_note text DEFAULT NULL,
  p_email text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_family uuid;
  v_lead uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can add leads' USING ERRCODE = '42501';
  END IF;
  IF public.crm_normalize_phone(p_phone) IS NULL AND nullif(btrim(p_parent_name), '') IS NULL THEN
    RAISE EXCEPTION 'Add a phone number or a name';
  END IF;
  v_family := public.crm_upsert_family(p_phone, p_parent_name, p_email);
  v_lead := public.crm_open_lead(v_family, coalesce(p_channel, 'other'), NULL, NULL, now());
  UPDATE leads SET
    owner_id = coalesce(owner_id, auth.uid()),
    student_name = coalesce(student_name, nullif(btrim(p_student_name), '')),
    grade_level = coalesce(grade_level, nullif(btrim(p_grade_level), '')),
    curriculum = coalesce(curriculum, nullif(btrim(p_curriculum), '')),
    subjects = CASE WHEN cardinality(subjects) = 0 THEN coalesce(p_subjects, '{}') ELSE subjects END
  WHERE id = v_lead;
  IF nullif(btrim(p_note), '') IS NOT NULL THEN
    INSERT INTO lead_activities (family_id, lead_id, kind, body, created_by)
    VALUES (v_family, v_lead, 'note', btrim(p_note), auth.uid());
  END IF;
  RETURN v_family;
END $$;

-- Admins, for the owner and "who" pickers. user_roles is only readable row by row otherwise.
CREATE OR REPLACE FUNCTION public.crm_team_members()
RETURNS TABLE (user_id uuid, full_name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ur.user_id, coalesce(nullif(btrim(p.full_name), ''), 'Admin') AS full_name
  FROM user_roles ur LEFT JOIN profiles p ON p.id = ur.user_id
  WHERE ur.role = 'admin' AND public.has_role(auth.uid(), 'admin')
  ORDER BY 2
$$;

CREATE OR REPLACE FUNCTION public.crm_set_default_owner(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change CRM settings' USING ERRCODE = '42501';
  END IF;
  UPDATE crm_settings SET default_owner_id = p_user_id, updated_at = now() WHERE id;
END $$;

-- Internal helpers stay off the public API; the three admin RPCs check the role themselves.
REVOKE ALL ON FUNCTION public.crm_upsert_family(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_open_lead(uuid, text, text, text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_record_assessment_booking(public.consultation_bookings) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_consultation_bookings_before_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_whatsapp_before_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_web_form_after_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_leads_after_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_activity_after_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_families_normalize_phone() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_create_lead(text, text, text, text, text, text, text[], text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.crm_team_members() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.crm_set_default_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_create_lead(text, text, text, text, text, text, text[], text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_team_members() TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_set_default_owner(uuid) TO authenticated;

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage families" ON public.families;
CREATE POLICY "Admins manage families" ON public.families FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage leads" ON public.leads;
CREATE POLICY "Admins manage leads" ON public.leads FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage lead activities" ON public.lead_activities;
CREATE POLICY "Admins manage lead activities" ON public.lead_activities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins read crm settings" ON public.crm_settings;
CREATE POLICY "Admins read crm settings" ON public.crm_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.families, public.leads, public.lead_activities TO authenticated;
GRANT SELECT ON public.crm_settings TO authenticated;
GRANT ALL ON public.families, public.leads, public.lead_activities, public.crm_settings TO service_role;

-- Backfill: replay existing chats and bookings in time order through the same functions,
-- so a number that chatted first and booked later ends up as one family with one lead.
-- updated_at triggers are paused so the original rows keep their timestamps.
ALTER TABLE public.consultation_bookings DISABLE TRIGGER update_consultation_bookings_updated_at;
ALTER TABLE public.whatsapp_conversations DISABLE TRIGGER update_whatsapp_conversations_updated_at;
ALTER TABLE public.whatsapp_conversations DISABLE TRIGGER crm_whatsapp_before_write;

DO $backfill$
DECLARE
  r record;
  w public.whatsapp_conversations;
  b public.consultation_bookings;
  v_family uuid;
  v_lead uuid;
  v_replied boolean;
  -- Anything quiet since before this date is closed as stale; the team's call log starts in September.
  v_cutoff timestamptz := '2026-09-01 00:00:00+03';
BEGIN
  PERFORM set_config('crm.quiet', 'on', true);

  FOR r IN
    SELECT 'wa' AS src, wc.phone_number AS key, wc.created_at AS at FROM public.whatsapp_conversations wc WHERE wc.family_id IS NULL
    UNION ALL
    SELECT 'cb', cb.id::text, coalesce(cb.created_at, now()) FROM public.consultation_bookings cb WHERE cb.family_id IS NULL
    ORDER BY at, src
  LOOP
    IF r.src = 'wa' THEN
      SELECT * INTO w FROM public.whatsapp_conversations WHERE phone_number = r.key;
      v_family := public.crm_upsert_family(w.phone_number, w.profile_name, NULL);
      v_lead := public.crm_open_lead(v_family, 'whatsapp', 'whatsapp_conversations', w.phone_number, w.created_at);
      SELECT EXISTS (SELECT 1 FROM jsonb_array_elements(w.messages) m WHERE m ->> 'sent_by' = 'human') INTO v_replied;
      UPDATE public.leads SET
        stage = CASE WHEN v_replied AND stage = 'new' THEN 'contacted' ELSE stage END,
        needs_reply = coalesce(w.escalated, false) AND (w.messages -> -1 ->> 'role') = 'user',
        next_step = CASE WHEN coalesce(w.escalated, false) AND (w.messages -> -1 ->> 'role') = 'user' AND next_step IS NULL
          THEN 'Reply to the WhatsApp hand-off' ELSE next_step END,
        next_step_at = CASE WHEN coalesce(w.escalated, false) AND (w.messages -> -1 ->> 'role') = 'user' AND next_step_at IS NULL
          THEN coalesce(w.escalated_at, w.last_message_at) ELSE next_step_at END,
        last_activity_at = greatest(last_activity_at, w.last_message_at)
      WHERE id = v_lead;
      UPDATE public.whatsapp_conversations SET family_id = v_family WHERE phone_number = w.phone_number;
    ELSE
      SELECT * INTO b FROM public.consultation_bookings WHERE id = r.key::uuid;
      v_family := public.crm_record_assessment_booking(b);
      UPDATE public.consultation_bookings SET family_id = v_family WHERE id = b.id;
    END IF;
  END LOOP;

  -- Notes the team wrote on assessment calls, and the admin note field.
  INSERT INTO public.lead_activities (family_id, lead_id, kind, body, created_by, occurred_at, source_table, source_id)
  SELECT cb.family_id,
         coalesce((SELECT l.id FROM public.leads l WHERE l.source_table = 'consultation_bookings' AND l.source_id = cb.id::text),
                  (SELECT l.id FROM public.leads l WHERE l.family_id = cb.family_id ORDER BY l.created_at DESC LIMIT 1)),
         'note', n.note, n.created_by, n.created_at, 'consultation_notes', n.id::text
  FROM public.consultation_notes n JOIN public.consultation_bookings cb ON cb.id = n.consultation_id
  WHERE cb.family_id IS NOT NULL
  ON CONFLICT DO NOTHING;
  INSERT INTO public.lead_activities (family_id, lead_id, kind, body, created_by, occurred_at, source_table, source_id)
  SELECT cb.family_id,
         (SELECT l.id FROM public.leads l WHERE l.family_id = cb.family_id ORDER BY l.created_at DESC LIMIT 1),
         'note', 'Admin note: ' || btrim(cb.admin_notes), NULL, coalesce(cb.updated_at, cb.created_at),
         'consultation_bookings.admin_notes', cb.id::text
  FROM public.consultation_bookings cb
  WHERE cb.family_id IS NOT NULL AND nullif(btrim(cb.admin_notes), '') IS NOT NULL
  ON CONFLICT DO NOTHING;

  -- Bookings already marked converted are won.
  UPDATE public.leads l SET stage = 'won', won_at = coalesce(cb.converted_at, cb.updated_at, now()),
    next_step = NULL, next_step_at = NULL
  FROM public.consultation_bookings cb
  WHERE cb.family_id = l.family_id AND cb.converted_to_customer AND l.stage NOT IN ('won', 'lost');

  -- Quiet since before the cutoff, with no call booked after it: closed as stale, still searchable.
  UPDATE public.leads l SET stage = 'lost', lost_reason = 'stale', lost_at = now(), next_step = NULL, next_step_at = NULL
  WHERE l.stage NOT IN ('won', 'lost') AND l.last_activity_at < v_cutoff
    AND NOT EXISTS (SELECT 1 FROM public.consultation_bookings cb
                    WHERE cb.family_id = l.family_id AND cb.consultation_date >= v_cutoff::date);
END
$backfill$;

ALTER TABLE public.consultation_bookings ENABLE TRIGGER update_consultation_bookings_updated_at;
ALTER TABLE public.whatsapp_conversations ENABLE TRIGGER update_whatsapp_conversations_updated_at;
ALTER TABLE public.whatsapp_conversations ENABLE TRIGGER crm_whatsapp_before_write;
