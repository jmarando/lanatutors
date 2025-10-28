-- Remove tier-related triggers and functions with CASCADE
DROP FUNCTION IF EXISTS public.update_rate_from_tier() CASCADE;
DROP FUNCTION IF EXISTS public.get_rate_for_tier(_tier tutor_tier) CASCADE;

-- Modify tutor_profiles table
ALTER TABLE public.tutor_profiles 
  DROP COLUMN IF EXISTS tier CASCADE,
  DROP COLUMN IF EXISTS tier_last_updated,
  DROP COLUMN IF EXISTS tier_justification;

-- Update existing rates that are below 2000 to 2000 (minimum)
UPDATE public.tutor_profiles 
SET hourly_rate = 2000 
WHERE hourly_rate < 2000;

-- Make hourly_rate nullable temporarily
ALTER TABLE public.tutor_profiles 
  ALTER COLUMN hourly_rate DROP NOT NULL;

-- Add constraint to ensure hourly_rate is between 2000 and 6000
ALTER TABLE public.tutor_profiles
  ADD CONSTRAINT hourly_rate_range CHECK (hourly_rate >= 2000 AND hourly_rate <= 6000);

-- Add column to track if tutor wants to display their school/institution
ALTER TABLE public.tutor_profiles
  ADD COLUMN IF NOT EXISTS display_institution boolean DEFAULT false;

-- Drop the tutor_tier enum type
DROP TYPE IF EXISTS tutor_tier;