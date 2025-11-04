-- Add teaching_levels column to tutor_profiles table
ALTER TABLE public.tutor_profiles 
ADD COLUMN teaching_levels text[];

-- Add comment to explain the column
COMMENT ON COLUMN public.tutor_profiles.teaching_levels IS 'Teaching levels e.g., Early Years, Primary, Middle School/Junior Secondary, Secondary/A-Level';