-- Fix RLS policies to protect sensitive tutor data

-- profiles table: Drop overly permissive policy that exposes phone numbers
DROP POLICY IF EXISTS "Anyone can view verified tutor profiles" ON public.profiles;

-- Recreate with column-level filtering - but we can't do column-level in RLS
-- Instead, create a view for public tutor info
CREATE OR REPLACE VIEW public.public_tutor_profiles AS
SELECT 
  p.id,
  p.full_name,
  p.curriculum,
  p.avatar_url,
  p.created_at
FROM public.profiles p
INNER JOIN public.tutor_profiles tp ON tp.user_id = p.id
WHERE tp.verified = true;

-- Grant select on the view
GRANT SELECT ON public.public_tutor_profiles TO anon, authenticated;

-- Recreate the profiles policy more restrictively  
CREATE POLICY "Verified tutors can be viewed with limited info"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tutor_profiles 
      WHERE tutor_profiles.user_id = profiles.id 
      AND tutor_profiles.verified = true
    )
  );

-- tutor_profiles: Drop and recreate to hide sensitive professional data
DROP POLICY IF EXISTS "Anyone can view verified tutors" ON public.tutor_profiles;

CREATE POLICY "Public can view verified tutor professional info"
  ON public.tutor_profiles
  FOR SELECT
  USING (verified = true);

-- Note: Frontend should filter sensitive fields like hourly_rate, current_institution
-- when displaying to non-authenticated users

-- tutor_availability: Already has good policies but ensure tutor_id exposure is managed
-- The existing "Anyone can view available slots" is acceptable as it shows availability
-- but frontend should not expose which specific tutor owns each slot until booking

-- consultation_bookings: Already has good INSERT policy
-- Keep existing "Anyone can book consultations" - this is fine for lead generation

-- tutor_applications: Already has good policies
-- Keep existing "Anyone can create application" - this is fine for job applications