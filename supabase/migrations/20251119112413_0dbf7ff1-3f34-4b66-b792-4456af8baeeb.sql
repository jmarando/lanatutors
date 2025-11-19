-- Add education field to tutor_profiles table
ALTER TABLE public.tutor_profiles 
ADD COLUMN IF NOT EXISTS education jsonb DEFAULT '[]'::jsonb;