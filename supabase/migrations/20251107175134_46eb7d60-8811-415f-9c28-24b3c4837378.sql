-- Add INSERT policy for tutor_profiles to allow users to create their own profile
CREATE POLICY "Users can create own tutor profile"
ON public.tutor_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);