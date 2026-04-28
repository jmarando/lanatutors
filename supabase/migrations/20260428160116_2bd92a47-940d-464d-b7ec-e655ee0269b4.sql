-- 1) Create private tutor calendar credentials table
CREATE TABLE IF NOT EXISTS public.tutor_calendar_credentials (
  tutor_id uuid PRIMARY KEY REFERENCES public.tutor_profiles(id) ON DELETE CASCADE,
  google_oauth_token text,
  google_refresh_token text,
  google_token_expires_at timestamptz,
  google_calendar_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tutor_calendar_credentials ENABLE ROW LEVEL SECURITY;

-- No public/anon/authenticated SELECT policies - only service role (edge functions) can read.
-- Admins can view metadata but not tokens (we just deny everything for safety).
CREATE POLICY "Admins can view calendar credentials metadata"
  ON public.tutor_calendar_credentials FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Migrate existing token data
INSERT INTO public.tutor_calendar_credentials (tutor_id, google_oauth_token, google_refresh_token, google_token_expires_at, google_calendar_email)
SELECT id, google_oauth_token, google_refresh_token, google_token_expires_at, google_calendar_email
FROM public.tutor_profiles
WHERE google_oauth_token IS NOT NULL OR google_refresh_token IS NOT NULL
ON CONFLICT (tutor_id) DO UPDATE SET
  google_oauth_token = EXCLUDED.google_oauth_token,
  google_refresh_token = EXCLUDED.google_refresh_token,
  google_token_expires_at = EXCLUDED.google_token_expires_at,
  google_calendar_email = EXCLUDED.google_calendar_email,
  updated_at = now();

-- Drop sensitive token columns from publicly-readable tutor_profiles
ALTER TABLE public.tutor_profiles DROP COLUMN IF EXISTS google_oauth_token;
ALTER TABLE public.tutor_profiles DROP COLUMN IF EXISTS google_refresh_token;
ALTER TABLE public.tutor_profiles DROP COLUMN IF EXISTS google_token_expires_at;
-- Keep google_calendar_email and google_calendar_connected on tutor_profiles? Email is PII; move it too.
ALTER TABLE public.tutor_profiles DROP COLUMN IF EXISTS google_calendar_email;

-- 2) Fix school_teacher_slots admin policy (swapped args)
DROP POLICY IF EXISTS "Admins manage teacher slots" ON public.school_teacher_slots;
CREATE POLICY "Admins manage teacher slots"
  ON public.school_teacher_slots
  FOR ALL
  TO authenticated
  USING (public.is_school_role(auth.uid(), school_id, 'admin'::text))
  WITH CHECK (public.is_school_role(auth.uid(), school_id, 'admin'::text));

-- 3) Remove tutor_applications from realtime publication (sensitive applicant PII)
ALTER PUBLICATION supabase_realtime DROP TABLE public.tutor_applications;