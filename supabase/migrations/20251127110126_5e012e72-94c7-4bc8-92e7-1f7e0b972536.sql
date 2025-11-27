-- Ensure proper storage policies for avatars bucket

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

-- Allow users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (auth.uid())::text = (storage.foldername(name))[1] OR
  name LIKE (auth.uid())::text || '%'
);

-- Allow users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (auth.uid())::text = (storage.foldername(name))[1] OR
  name LIKE (auth.uid())::text || '%'
)
WITH CHECK (
  bucket_id = 'avatars' AND
  (auth.uid())::text = (storage.foldername(name))[1] OR
  name LIKE (auth.uid())::text || '%'
);

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (auth.uid())::text = (storage.foldername(name))[1] OR
  name LIKE (auth.uid())::text || '%'
);

-- Allow public read access to avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');