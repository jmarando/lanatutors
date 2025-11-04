-- Add storage policies for admin access to tutor CVs

-- Allow admins to read tutor CVs
CREATE POLICY "Admins can view tutor CVs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'tutor-cvs' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to download tutor CVs (needed for signed URLs)
CREATE POLICY "Admins can download tutor CVs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'tutor-cvs'
  AND has_role(auth.uid(), 'admin'::app_role)
);