-- Add gender column to tutor_profiles table
ALTER TABLE public.tutor_profiles 
ADD COLUMN gender text;

-- Add a check constraint to ensure valid gender values
ALTER TABLE public.tutor_profiles
ADD CONSTRAINT tutor_profiles_gender_check 
CHECK (gender IS NULL OR gender IN ('male', 'female', 'other', 'prefer_not_to_say'));