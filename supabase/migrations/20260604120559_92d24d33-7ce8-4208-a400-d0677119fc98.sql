
-- 1) Recreate pg_net in extensions schema (cannot use SET SCHEMA)
CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION pg_net WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- 2) Tighten INSERT policies
DROP POLICY IF EXISTS "Anyone can book consultations" ON public.consultation_bookings;
CREATE POLICY "Anyone can book consultations"
ON public.consultation_bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (
  parent_name IS NOT NULL AND length(btrim(parent_name)) BETWEEN 1 AND 200
  AND email IS NOT NULL AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 254
  AND (phone_number IS NULL OR length(phone_number) BETWEEN 7 AND 25)
);

DROP POLICY IF EXISTS "Anyone can create expert consultation requests" ON public.expert_consultation_requests;
CREATE POLICY "Anyone can create expert consultation requests"
ON public.expert_consultation_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  parent_name IS NOT NULL AND length(btrim(parent_name)) BETWEEN 1 AND 200
  AND email IS NOT NULL AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 254
  AND (phone_number IS NULL OR length(phone_number) BETWEEN 7 AND 25)
);

DROP POLICY IF EXISTS "Anyone can submit tutor application" ON public.tutor_applications;
CREATE POLICY "Anyone can submit tutor application"
ON public.tutor_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (
  full_name IS NOT NULL AND length(btrim(full_name)) BETWEEN 2 AND 200
  AND email IS NOT NULL AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 254
  AND (phone_number IS NULL OR length(phone_number) BETWEEN 7 AND 25)
);

DROP POLICY IF EXISTS "Anyone can create inquiry" ON public.tutor_inquiries;
CREATE POLICY "Anyone can create inquiry"
ON public.tutor_inquiries
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 3) Revoke EXECUTE on internal trigger/helper functions
REVOKE EXECUTE ON FUNCTION public.update_allocation_sessions_remaining() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_package_sessions_remaining()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_slot_as_booked()                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.unmark_slot_on_cancel()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_tutor_rating()                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_package_sessions()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_allocation_on_booking()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_intensive_class_enrollment()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_group_class_enrollment_count()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_tutor_slug(text, uuid)        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_email(uuid)                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_recording_access(uuid, text)       FROM PUBLIC, anon;
