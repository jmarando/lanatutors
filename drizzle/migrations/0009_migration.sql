DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;
CREATE POLICY "Anyone can read the global platform setting" ON public.platform_settings
  FOR SELECT TO anon, authenticated USING (id = 'global');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND ((storage.foldername(name))[1] = (select auth.uid()::text) OR public.has_role((select auth.uid()), 'admin')));
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND ((storage.foldername(name))[1] = (select auth.uid()::text) OR public.has_role((select auth.uid()), 'admin')))
  WITH CHECK (bucket_id = 'avatars' AND ((storage.foldername(name))[1] = (select auth.uid()::text) OR public.has_role((select auth.uid()), 'admin')));
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND ((storage.foldername(name))[1] = (select auth.uid()::text) OR public.has_role((select auth.uid()), 'admin')));

DROP POLICY IF EXISTS "Verified tutors' videos are viewable by anyone" ON storage.objects;
CREATE POLICY "Verified tutors' videos are viewable by anyone" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'tutor-videos' AND (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.tutor_profiles tp
               WHERE tp.user_id::text = (storage.foldername(name))[1] AND tp.verified AND tp.is_listed)));