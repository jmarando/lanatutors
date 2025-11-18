-- Allow admins to update consultation bookings (e.g. set meeting_link)
CREATE POLICY "Admins can update consultations"
ON public.consultation_bookings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));