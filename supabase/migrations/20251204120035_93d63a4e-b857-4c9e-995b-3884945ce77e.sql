-- CRITICAL SECURITY FIX 1: Restrict tutor_profiles to hide OAuth tokens from public
-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public can view verified tutor professional info" ON public.tutor_profiles;

-- Create a new policy that only exposes non-sensitive columns via a function-based approach
-- For public viewing, we'll create a secure view instead
CREATE POLICY "Public can view verified tutor basic info" 
ON public.tutor_profiles 
FOR SELECT
USING (
  verified = true 
  AND auth.uid() IS NULL -- Only for unauthenticated users, they get limited access via the view
);

-- Actually, better approach: restrict the policy to authenticated users only for full profile
-- and unauthenticated users can only see verified tutors BUT we need a secure view

-- Let's just restrict it properly - only show to authenticated users or the tutor themselves
DROP POLICY IF EXISTS "Public can view verified tutor basic info" ON public.tutor_profiles;

-- New restrictive policy - only authenticated users can see verified tutors
CREATE POLICY "Authenticated users can view verified tutor profiles" 
ON public.tutor_profiles 
FOR SELECT
TO authenticated
USING (verified = true);

-- Create a secure PUBLIC view for unauthenticated browsing (no sensitive data)
CREATE OR REPLACE VIEW public.tutor_profiles_public AS
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
  -- EXCLUDED: google_oauth_token, google_refresh_token, google_calendar_email, google_token_expires_at, email, referees
FROM public.tutor_profiles
WHERE verified = true;

-- Grant SELECT on the view to anon role (public/unauthenticated users)
GRANT SELECT ON public.tutor_profiles_public TO anon;
GRANT SELECT ON public.tutor_profiles_public TO authenticated;

-- CRITICAL SECURITY FIX 2: Restrict profiles table phone number access
-- Drop the overly permissive policy for verified tutors
DROP POLICY IF EXISTS "Verified tutors can be viewed with limited info" ON public.profiles;

-- Create a new policy that only exposes limited info for verified tutors (no phone)
-- Actually for profiles, we need a view approach too, or just remove the policy entirely
-- Parents/students should only see tutor profiles, not the profiles table directly

-- CRITICAL SECURITY FIX 3: Require authentication for tutor applications
DROP POLICY IF EXISTS "Anyone can create application" ON public.tutor_applications;

-- New policy requiring authentication to submit applications
CREATE POLICY "Authenticated users can create application" 
ON public.tutor_applications 
FOR INSERT
TO authenticated
WITH CHECK (true);

-- SECURITY FIX 4: Add rate limiting marker (actual rate limiting in edge functions)
-- Add a comment to track this requirement
COMMENT ON TABLE public.consultation_bookings IS 'Public form - requires rate limiting at application/edge function level';
COMMENT ON TABLE public.tutor_inquiries IS 'Public form - requires rate limiting at application/edge function level';
COMMENT ON TABLE public.expert_consultation_requests IS 'Public form - requires rate limiting at application/edge function level';