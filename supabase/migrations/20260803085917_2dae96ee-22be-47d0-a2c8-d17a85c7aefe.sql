-- 1. Learning plans: remove blanket public read, replace with token-scoped lookup
DROP POLICY IF EXISTS "Anyone can view learning plans via share token or slug" ON public.learning_plans;

CREATE OR REPLACE FUNCTION public.get_learning_plan_by_share(_share_token uuid DEFAULT NULL, _url_slug text DEFAULT NULL)
RETURNS SETOF public.learning_plans
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.learning_plans lp
  WHERE (_share_token IS NOT NULL AND lp.share_token = _share_token)
     OR (_url_slug IS NOT NULL AND lp.url_slug = _url_slug)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_learning_plan_by_share(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_learning_plan_by_share(uuid, text) TO anon, authenticated, service_role;

-- 2. Recording tables: explicit backend-only write policies
DROP POLICY IF EXISTS "Backend only can insert purchases" ON public.recording_purchases;
CREATE POLICY "Backend only can insert purchases"
ON public.recording_purchases FOR INSERT TO anon, authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "Backend only can modify purchases" ON public.recording_purchases;
CREATE POLICY "Backend only can modify purchases"
ON public.recording_purchases FOR UPDATE TO anon, authenticated
USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Backend only can delete purchases" ON public.recording_purchases;
CREATE POLICY "Backend only can delete purchases"
ON public.recording_purchases FOR DELETE TO anon, authenticated
USING (false);

DROP POLICY IF EXISTS "Backend only can insert subscriptions" ON public.recording_subscriptions;
CREATE POLICY "Backend only can insert subscriptions"
ON public.recording_subscriptions FOR INSERT TO anon, authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "Backend only can modify subscriptions" ON public.recording_subscriptions;
CREATE POLICY "Backend only can modify subscriptions"
ON public.recording_subscriptions FOR UPDATE TO anon, authenticated
USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Backend only can delete subscriptions" ON public.recording_subscriptions;
CREATE POLICY "Backend only can delete subscriptions"
ON public.recording_subscriptions FOR DELETE TO anon, authenticated
USING (false);

COMMENT ON POLICY "Backend only can insert purchases" ON public.recording_purchases IS
  'Purchases are created only by the pesapal-callback edge function using the service role key';
COMMENT ON POLICY "Backend only can insert subscriptions" ON public.recording_subscriptions IS
  'Subscriptions are created only by the pesapal-callback edge function using the service role key';

-- 3. Tutor CV bucket: scope anonymous application uploads to applications/<uuid>/
DROP POLICY IF EXISTS "Anyone can upload CVs during application" ON storage.objects;
CREATE POLICY "Applicants can upload CVs to scoped folder"
ON storage.objects FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'tutor-cvs'
  AND (storage.foldername(name))[1] = 'applications'
  AND (storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND array_length(storage.foldername(name), 1) = 2
);