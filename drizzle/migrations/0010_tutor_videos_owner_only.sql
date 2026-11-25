DROP POLICY IF EXISTS "Verified tutors' videos are viewable by anyone" ON storage.objects;
CREATE POLICY "Tutors can view their own videos" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'tutor-videos' AND (storage.foldername(name))[1] = (select auth.uid()::text));