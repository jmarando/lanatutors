-- Add storage policy for tutor CV uploads during application
CREATE POLICY "Anyone can upload CVs during application"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'tutor-cvs');