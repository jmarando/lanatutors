-- Add RLS policy for admins to view all tutor profiles (including unverified)
CREATE POLICY "Admins can view all tutor profiles"
ON tutor_profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);