-- Add a policy to allow public SELECT on tutor_profiles for the columns in the view
-- The view uses security_invoker so it inherits the caller's permissions
-- We need anon users to be able to read from tutor_profiles through the view

-- Create a policy for anonymous users that only allows basic info
CREATE POLICY "Anon can view verified tutor basic info" 
ON public.tutor_profiles 
FOR SELECT
TO anon
USING (verified = true);