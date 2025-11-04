-- Ensure tutor-cvs bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('tutor-cvs', 'tutor-cvs', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view tutor CVs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can download tutor CVs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can read tutor CVs" ON storage.objects;

-- Create proper admin access policy for tutor CVs
CREATE POLICY "Admins can access tutor CVs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'tutor-cvs' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow users to upload their own CVs during application
CREATE POLICY "Users can upload own CV during application"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tutor-cvs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own CVs
CREATE POLICY "Users can update own CV"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tutor-cvs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);