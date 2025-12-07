-- Drop the existing policy that requires authentication
DROP POLICY IF EXISTS "Authenticated users can create application" ON public.tutor_applications;

-- Create new policy that allows anyone to submit an application
CREATE POLICY "Anyone can submit tutor application"
ON public.tutor_applications
FOR INSERT
WITH CHECK (true);