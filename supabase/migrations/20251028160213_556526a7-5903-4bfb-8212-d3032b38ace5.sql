-- Add teaching level and subjects to tutor applications
ALTER TABLE tutor_applications
ADD COLUMN teaching_level TEXT,
ADD COLUMN subjects TEXT[] DEFAULT ARRAY[]::TEXT[];