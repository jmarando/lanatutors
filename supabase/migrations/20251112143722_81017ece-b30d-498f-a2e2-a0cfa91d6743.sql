-- 1) Ensure FK relationships so embedded selects work
-- Use conditional DO blocks to avoid errors if constraints already exist

-- tutor_profiles.user_id -> profiles.id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tutor_profiles_user_id_fkey'
  ) THEN
    ALTER TABLE public.tutor_profiles
      ADD CONSTRAINT tutor_profiles_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

-- tutor_reviews.student_id -> profiles.id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tutor_reviews_student_id_fkey'
  ) THEN
    ALTER TABLE public.tutor_reviews
      ADD CONSTRAINT tutor_reviews_student_id_fkey
      FOREIGN KEY (student_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

-- bookings.student_id -> profiles.id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_student_id_fkey'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_student_id_fkey
      FOREIGN KEY (student_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

-- Optional but helpful: bookings.tutor_id -> tutor_profiles.id (improves embeds)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_tutor_id_fkey'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_tutor_id_fkey
      FOREIGN KEY (tutor_id)
      REFERENCES public.tutor_profiles(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

-- 2) Indexes to keep joins fast
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_user_id ON public.tutor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_tutor_reviews_student_id ON public.tutor_reviews(student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_student_id ON public.bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tutor_id ON public.bookings(tutor_id);

-- 3) RLS: allow admins to view necessary data
-- Admins must be able to SELECT profiles for unapproved tutors
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Admins can view all profiles'
  ) THEN
    CREATE POLICY "Admins can view all profiles"
    ON public.profiles
    FOR SELECT
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Admins must be able to view bookings data in dashboard
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bookings' AND policyname='Admins can view all bookings'
  ) THEN
    CREATE POLICY "Admins can view all bookings"
    ON public.bookings
    FOR SELECT
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;
