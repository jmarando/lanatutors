DROP POLICY IF EXISTS "Users can view own expert consultation requests" ON public.expert_consultation_requests;
CREATE POLICY "Users can view own expert consultation requests" ON public.expert_consultation_requests
  FOR SELECT TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Users can view own package recommendations via consultation" ON public.package_recommendations;
CREATE POLICY "Users can view own package recommendations via consultation" ON public.package_recommendations
  FOR SELECT TO authenticated
  USING (consultation_booking_id IN (
    SELECT cb.id FROM public.consultation_bookings cb
    WHERE lower(cb.email) = lower(auth.jwt() ->> 'email')
  ));