-- Add email column to tutor_profiles table
ALTER TABLE public.tutor_profiles
ADD COLUMN IF NOT EXISTS email text;

-- Add index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_email ON public.tutor_profiles(email);