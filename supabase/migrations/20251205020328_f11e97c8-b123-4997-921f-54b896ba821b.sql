-- Drop the existing function and recreate with proper return type
DROP FUNCTION IF EXISTS public.get_public_tutor_profiles();

CREATE FUNCTION public.get_public_tutor_profiles()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  hourly_rate numeric,
  experience_years integer,
  rating numeric,
  total_reviews integer,
  verified boolean,
  created_at timestamp with time zone,
  diaspora_friendly boolean,
  education jsonb,
  display_institution boolean,
  institution_years integer,
  graduation_year integer,
  teaching_experience jsonb,
  subjects text[],
  bio text,
  qualifications text[],
  availability text,
  curriculum text[],
  current_institution text,
  services_offered text[],
  specializations text,
  teaching_location text,
  teaching_mode text[],
  tutoring_experience text,
  why_students_love text[],
  teaching_levels text[],
  gender text,
  profile_slug text,
  full_name text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tp.id,
    tp.user_id,
    tp.hourly_rate,
    tp.experience_years,
    tp.rating,
    tp.total_reviews,
    tp.verified,
    tp.created_at,
    tp.diaspora_friendly,
    tp.education,
    tp.display_institution,
    tp.institution_years,
    tp.graduation_year,
    tp.teaching_experience,
    tp.subjects,
    tp.bio,
    tp.qualifications,
    tp.availability,
    tp.curriculum,
    tp.current_institution,
    tp.services_offered,
    tp.specializations,
    tp.teaching_location,
    tp.teaching_mode,
    tp.tutoring_experience,
    tp.why_students_love,
    tp.teaching_levels,
    tp.gender,
    tp.profile_slug,
    p.full_name,
    p.avatar_url
  FROM tutor_profiles tp
  LEFT JOIN profiles p ON tp.user_id = p.id
  WHERE tp.verified = true;
END;
$$;