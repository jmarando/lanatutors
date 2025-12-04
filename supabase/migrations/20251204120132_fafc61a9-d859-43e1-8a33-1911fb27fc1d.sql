-- Remove the anon policy that exposes sensitive data
DROP POLICY IF EXISTS "Anon can view verified tutor basic info" ON public.tutor_profiles;

-- The secure approach: anon users can ONLY access through the tutor_profiles_public view
-- which excludes sensitive columns. The view needs a policy on tutor_profiles that 
-- allows the view to read data. We'll use a security definer function for this.

-- Create a secure function to get public tutor data
CREATE OR REPLACE FUNCTION public.get_public_tutor_profiles()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  subjects text[],
  bio text,
  qualifications text[],
  availability text,
  curriculum text[],
  hourly_rate numeric,
  experience_years integer,
  rating numeric,
  total_reviews integer,
  verified boolean,
  created_at timestamptz,
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
  diaspora_friendly boolean,
  education jsonb,
  display_institution boolean,
  institution_years integer,
  graduation_year integer,
  teaching_experience jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id, user_id, subjects, bio, qualifications, availability, curriculum,
    hourly_rate, experience_years, rating, total_reviews, verified, created_at,
    current_institution, services_offered, specializations, teaching_location,
    teaching_mode, tutoring_experience, why_students_love, teaching_levels,
    gender, profile_slug, diaspora_friendly, education, display_institution,
    institution_years, graduation_year, teaching_experience
  FROM public.tutor_profiles
  WHERE verified = true;
$$;