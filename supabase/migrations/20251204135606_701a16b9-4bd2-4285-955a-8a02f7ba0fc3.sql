-- Drop existing function first
DROP FUNCTION IF EXISTS public.get_public_tutor_profiles();

-- Recreate with full_name and avatar_url included
CREATE FUNCTION public.get_public_tutor_profiles()
 RETURNS TABLE(
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
   created_at timestamp with time zone, 
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
   teaching_experience jsonb,
   full_name text,
   avatar_url text
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    tp.id, tp.user_id, tp.subjects, tp.bio, tp.qualifications, tp.availability, tp.curriculum,
    tp.hourly_rate, tp.experience_years, tp.rating, tp.total_reviews, tp.verified, tp.created_at,
    tp.current_institution, tp.services_offered, tp.specializations, tp.teaching_location,
    tp.teaching_mode, tp.tutoring_experience, tp.why_students_love, tp.teaching_levels,
    tp.gender, tp.profile_slug, tp.diaspora_friendly, tp.education, tp.display_institution,
    tp.institution_years, tp.graduation_year, tp.teaching_experience,
    p.full_name,
    p.avatar_url
  FROM public.tutor_profiles tp
  LEFT JOIN public.profiles p ON p.id = tp.user_id
  WHERE tp.verified = true;
$function$