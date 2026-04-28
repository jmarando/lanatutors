-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view available slots" ON public.tutor_availability;

-- Recreate restricted to available slots only
CREATE POLICY "Public can view only available slots"
ON public.tutor_availability
FOR SELECT
TO anon, authenticated
USING (slot_type = 'available' OR slot_type IS NULL);