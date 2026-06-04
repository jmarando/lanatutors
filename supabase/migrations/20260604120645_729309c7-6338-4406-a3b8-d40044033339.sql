
-- Tighten tutor_inquiries
DROP POLICY IF EXISTS "Anyone can create inquiry" ON public.tutor_inquiries;
CREATE POLICY "Anyone can create inquiry"
ON public.tutor_inquiries
FOR INSERT
TO anon, authenticated
WITH CHECK (
  parent_name IS NOT NULL AND length(btrim(parent_name)) BETWEEN 1 AND 200
  AND parent_email IS NOT NULL AND parent_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(parent_email) <= 254
  AND (parent_phone IS NULL OR length(parent_phone) BETWEEN 7 AND 25)
);

-- Revoke EXECUTE on remaining helper functions from anon/authenticated.
-- They will still work inside RLS evaluation and in edge functions (service_role).
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role)             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_school_role(uuid, uuid, text)     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_school_ids(uuid)            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_recording_access(uuid, text)     FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_user_role(uuid, text)         FROM PUBLIC, anon;
-- assign_user_role still needs to be callable by authenticated users during signup role assignment
-- get_public_tutor_profiles must remain callable by anon for the public tutor directory

-- Scope public buckets so the SELECT policy no longer returns full listings.
-- Direct object URLs continue to work because storage serves objects by exact name.
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'avatars'
  AND coalesce(current_setting('request.method', true), '') <> 'LIST'
);

DROP POLICY IF EXISTS "Public can view blog images" ON storage.objects;
CREATE POLICY "Public can view blog images"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'blog-images'
  AND coalesce(current_setting('request.method', true), '') <> 'LIST'
);
