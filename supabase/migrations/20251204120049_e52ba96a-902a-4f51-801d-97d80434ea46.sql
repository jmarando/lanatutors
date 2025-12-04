-- Fix the Security Definer View issue by recreating with SECURITY INVOKER
DROP VIEW IF EXISTS public.tutor_profiles_public;

CREATE VIEW public.tutor_profiles_public 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  subjects,
  bio,
  qualifications,
  availability,
  curriculum,
  hourly_rate,
  experience_years,
  rating,
  total_reviews,
  verified,
  created_at,
  current_institution,
  services_offered,
  specializations,
  teaching_location,
  teaching_mode,
  tutoring_experience,
  why_students_love,
  teaching_levels,
  gender,
  profile_slug,
  diaspora_friendly,
  education,
  display_institution,
  institution_years,
  graduation_year,
  teaching_experience
FROM public.tutor_profiles
WHERE verified = true;

-- Re-grant permissions
GRANT SELECT ON public.tutor_profiles_public TO anon;
GRANT SELECT ON public.tutor_profiles_public TO authenticated;