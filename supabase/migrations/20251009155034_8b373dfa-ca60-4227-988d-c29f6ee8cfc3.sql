-- Add new fields to tutor_profiles for enhanced information
ALTER TABLE public.tutor_profiles
ADD COLUMN IF NOT EXISTS services_offered TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS specializations TEXT,
ADD COLUMN IF NOT EXISTS teaching_location TEXT,
ADD COLUMN IF NOT EXISTS teaching_mode TEXT[] DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN public.tutor_profiles.services_offered IS 'Services like extra tuition, homeschooling, exam prep, etc.';
COMMENT ON COLUMN public.tutor_profiles.specializations IS 'Specific topics or areas of expertise';
COMMENT ON COLUMN public.tutor_profiles.teaching_location IS 'Current teaching station or preferred location';
COMMENT ON COLUMN public.tutor_profiles.teaching_mode IS 'Online, in-person, home visits, etc.';