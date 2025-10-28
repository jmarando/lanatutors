-- Create storage bucket for tutor videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('tutor-videos', 'tutor-videos', false);

-- Create RLS policies for tutor videos
CREATE POLICY "Tutors can upload their own videos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'tutor-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Tutors can update their own videos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'tutor-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all tutor videos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'tutor-videos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Verified tutors' videos are viewable by anyone"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'tutor-videos'
  AND EXISTS (
    SELECT 1 FROM tutor_profiles
    WHERE tutor_profiles.user_id::text = (storage.foldername(name))[1]
      AND tutor_profiles.verified = true
  )
);