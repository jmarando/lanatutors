-- Add field for student testimonials/highlights
ALTER TABLE tutor_profiles
ADD COLUMN IF NOT EXISTS why_students_love text[];