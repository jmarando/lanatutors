-- Update the public access policy to also allow access via url_slug
DROP POLICY IF EXISTS "Anyone can view learning plans via share token" ON public.learning_plans;

CREATE POLICY "Anyone can view learning plans via share token or slug"
  ON public.learning_plans
  FOR SELECT
  TO anon
  USING (share_token IS NOT NULL OR url_slug IS NOT NULL);