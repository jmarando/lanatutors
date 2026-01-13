-- Allow admins to manage tutor availability for manual bookings
CREATE POLICY "Admins can manage all tutor availability"
ON public.tutor_availability
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));