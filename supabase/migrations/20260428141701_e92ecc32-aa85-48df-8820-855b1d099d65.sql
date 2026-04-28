-- Remove the overly permissive anon policy that exposes all profile data
-- Public tutor info is already served via the get_public_tutor_profiles() security definer function
DROP POLICY IF EXISTS "Anyone can view profiles for learning plan tutors" ON public.profiles;