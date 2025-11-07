-- Add UPDATE policy for admins on tutor_profiles
CREATE POLICY "Admins can update tutor profiles"
ON public.tutor_profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));