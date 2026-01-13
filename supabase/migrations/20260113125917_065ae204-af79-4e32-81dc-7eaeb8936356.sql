-- Add policy for admins to insert bookings
CREATE POLICY "Admins can create bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add policy for admins to insert availability slots (needed for manual bookings)
CREATE POLICY "Admins can create availability slots"
ON public.tutor_availability
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));