-- Allow anonymous users to view verified tutor profiles (for public learning plan view)
CREATE POLICY "Anyone can view verified tutor profiles"
  ON public.tutor_profiles
  FOR SELECT
  TO anon
  USING (verified = true);

-- Also allow anon to view profiles for learning plan tutor info
CREATE POLICY "Anyone can view profiles for learning plan tutors"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (
    id IN (
      SELECT tp.user_id FROM tutor_profiles tp
      WHERE tp.verified = true
    )
  );