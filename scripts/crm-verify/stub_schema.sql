-- Stand-ins for the production objects the CRM migrations touch, for a throw-away Postgres.
-- Column lists, constraints, policies and the booking triggers were read from production with
-- information_schema / pg_policy / pg_get_functiondef on 2026-10-30. Only what the migrations and
-- the tests need is here; this file is never applied to a real database.
\set ON_ERROR_STOP on

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;

CREATE TYPE public.app_role AS ENUM ('student', 'tutor', 'admin');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
GRANT SELECT ON public.user_roles TO authenticated;

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated, service_role;

CREATE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$;

-- ------------------------------------------------------------------ people
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number text,
  full_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  age int,
  grade_level text,
  subjects_struggling text[],
  learning_goals text,
  preferred_learning_style text,
  curriculum text,
  avatar_url text,
  must_reset_password boolean NOT NULL DEFAULT false,
  preferred_currency text DEFAULT 'KES',
  timezone text DEFAULT 'Africa/Nairobi',
  account_type text DEFAULT 'student'
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  age int,
  curriculum text NOT NULL,
  grade_level text NOT NULL,
  email text,
  subjects_of_interest text[],
  learning_goals text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  admin_notes text
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can delete students" ON public.students FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert students" ON public.students FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update students" ON public.students FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all students" ON public.students FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Parents can CRUD their own students" ON public.students FOR ALL TO authenticated USING (parent_id = auth.uid());

CREATE TABLE public.tutor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subjects text[] NOT NULL,
  hourly_rate numeric,
  verified boolean DEFAULT false,
  email text,
  is_listed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.tutor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view all tutor profiles" ON public.tutor_profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can view verified tutor profiles" ON public.tutor_profiles FOR SELECT TO authenticated USING (verified = true);
CREATE POLICY "Tutors can view own profile" ON public.tutor_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.tutor_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  is_booked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  slot_type text DEFAULT 'available'
);
ALTER TABLE public.tutor_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage all tutor availability" ON public.tutor_availability FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can view only available slots" ON public.tutor_availability FOR SELECT USING (slot_type = 'available' OR slot_type IS NULL);
CREATE POLICY "Tutors can manage their own availability" ON public.tutor_availability FOR ALL TO authenticated USING (auth.uid() = tutor_id);

-- ------------------------------------------------------------------ lessons
CREATE TABLE public.package_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  tutor_id uuid NOT NULL,
  package_offer_id uuid,
  total_sessions int NOT NULL,
  sessions_used int DEFAULT 0,
  sessions_remaining int NOT NULL,
  total_amount numeric NOT NULL,
  amount_paid numeric DEFAULT 0,
  payment_status text DEFAULT 'pending',
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  currency text DEFAULT 'KES',
  amount_original_currency numeric,
  exchange_rate numeric DEFAULT 1.0,
  student_profile_id uuid
);
CREATE TABLE public.package_subject_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_purchase_id uuid,
  subject text,
  tutor_id uuid,
  sessions_used int DEFAULT 0
);

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tutor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  availability_slot_id uuid NOT NULL REFERENCES public.tutor_availability(id) ON DELETE CASCADE,
  subject text NOT NULL,
  notes text,
  status text DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending', 'confirmed', 'cancelled', 'completed'])),
  amount numeric NOT NULL,
  meeting_link text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  class_type text DEFAULT 'online' CHECK (class_type = ANY (ARRAY['online', 'in-person'])),
  deposit_paid numeric DEFAULT 0,
  balance_due numeric DEFAULT 0,
  package_purchase_id uuid REFERENCES public.package_purchases(id) ON DELETE SET NULL,
  payment_option text DEFAULT 'deposit' CHECK (payment_option = ANY (ARRAY['deposit', 'full', 'package'])),
  currency text DEFAULT 'KES',
  amount_original_currency numeric,
  exchange_rate numeric DEFAULT 1.0,
  classroom_id text,
  classroom_link text,
  booking_group_id uuid,
  student_profile_id uuid REFERENCES public.students(id),
  booking_source text DEFAULT 'online' CHECK (booking_source = ANY (ARRAY['online', 'manual', 'phone', 'whatsapp']))
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can create bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all bookings" ON public.bookings FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can create bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Tutors and students can update their bookings" ON public.bookings FOR UPDATE TO authenticated USING (auth.uid() = student_id OR auth.uid() = tutor_id);
CREATE POLICY "Users can view their own bookings" ON public.bookings FOR SELECT TO authenticated USING (auth.uid() = student_id OR auth.uid() = tutor_id);

CREATE FUNCTION public.decrement_allocation_on_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_allocation_id UUID;
  v_tutor_profile_id UUID;
BEGIN
  IF NEW.package_purchase_id IS NOT NULL AND NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    SELECT id INTO v_tutor_profile_id FROM public.tutor_profiles WHERE user_id = NEW.tutor_id LIMIT 1;
    SELECT id INTO v_allocation_id FROM public.package_subject_allocations
    WHERE package_purchase_id = NEW.package_purchase_id AND subject = NEW.subject AND tutor_id = v_tutor_profile_id LIMIT 1;
    IF v_allocation_id IS NOT NULL THEN
      UPDATE public.package_subject_allocations SET sessions_used = sessions_used + 1 WHERE id = v_allocation_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE FUNCTION public.increment_package_sessions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.package_purchase_id IS NOT NULL AND NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    UPDATE public.package_purchases SET sessions_used = sessions_used + 1 WHERE id = NEW.package_purchase_id;
  END IF;
  RETURN NEW;
END $$;
CREATE FUNCTION public.mark_slot_as_booked()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.tutor_availability SET is_booked = true WHERE id = NEW.availability_slot_id;
  RETURN NEW;
END $$;
CREATE FUNCTION public.unmark_slot_on_cancel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE public.tutor_availability SET is_booked = false WHERE id = NEW.availability_slot_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER decrement_allocation_sessions AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.decrement_allocation_on_booking();
CREATE TRIGGER increment_package_sessions_trigger AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.increment_package_sessions();
CREATE TRIGGER on_booking_cancelled AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.unmark_slot_on_cancel();
CREATE TRIGGER on_booking_created AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.mark_slot_as_booked();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------------ lead sources (migration 0004)
CREATE TABLE public.consultation_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_name text,
  email text,
  phone_number text,
  student_name text,
  grade_level text,
  consultation_date date,
  consultation_time text,
  status text DEFAULT 'pending',
  subjects_interest text[],
  preferred_mode text,
  budget_range text,
  urgency text,
  meeting_link text,
  admin_notes text,
  converted_to_customer boolean DEFAULT false,
  converted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.consultation_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid REFERENCES public.consultation_bookings(id) ON DELETE CASCADE,
  note text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE public.whatsapp_conversations (
  phone_number text PRIMARY KEY,
  profile_name text,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  escalated boolean NOT NULL DEFAULT false,
  escalated_at timestamptz,
  last_message_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TRIGGER update_consultation_bookings_updated_at BEFORE UPDATE ON public.consultation_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_whatsapp_conversations_updated_at BEFORE UPDATE ON public.whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.tutor_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_name text, parent_email text, parent_phone text, student_name text,
  grade_level text, curriculum text, subjects_needed jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE public.general_learning_plan_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_name text, parent_email text, parent_phone text, student_name text,
  grade_level text, curriculum text, subjects jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE public.expert_consultation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_name text, email text, phone_number text, student_name text,
  grade_level text, curriculum text, subjects_of_interest jsonb,
  created_at timestamptz DEFAULT now()
);

-- Grants as in drizzle/migrations/0001_crm_grants.sql, plus the tables the lessons views read.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultation_bookings, public.tutor_inquiries,
  public.general_learning_plan_requests, public.expert_consultation_requests, public.profiles,
  public.students, public.bookings, public.package_purchases, public.whatsapp_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutor_availability TO authenticated;
GRANT SELECT ON public.tutor_profiles TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
