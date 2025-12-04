-- Allow admins to manage all pricing tiers
CREATE POLICY "Admins can manage all pricing tiers"
ON public.tutor_pricing_tiers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Also add admin policy for curriculum_level_tier_assignments if missing
CREATE POLICY "Admins can manage all tier assignments"
ON public.curriculum_level_tier_assignments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));