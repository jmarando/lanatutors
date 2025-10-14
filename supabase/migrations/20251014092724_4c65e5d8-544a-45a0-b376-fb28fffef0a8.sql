-- Add tutor tier enum and update tutor_profiles table
CREATE TYPE public.tutor_tier AS ENUM ('bronze', 'silver', 'gold');

-- Add tier column to tutor_profiles
ALTER TABLE public.tutor_profiles 
ADD COLUMN tier public.tutor_tier DEFAULT 'bronze',
ADD COLUMN tier_justification text,
ADD COLUMN tier_last_updated timestamp with time zone DEFAULT now();

-- Update hourly_rate to be calculated based on tier
-- We'll keep the column but it will be auto-set based on tier
-- Gold: 2000, Silver: 1750, Bronze: 1500

-- Create function to get rate based on tier
CREATE OR REPLACE FUNCTION public.get_rate_for_tier(_tier tutor_tier)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE 
    WHEN _tier = 'gold' THEN 2000
    WHEN _tier = 'silver' THEN 1750
    WHEN _tier = 'bronze' THEN 1500
    ELSE 1500
  END;
$$;

-- Create trigger to auto-update hourly_rate based on tier
CREATE OR REPLACE FUNCTION public.update_rate_from_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.hourly_rate = get_rate_for_tier(NEW.tier);
  NEW.tier_last_updated = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_rate_from_tier
  BEFORE INSERT OR UPDATE OF tier ON public.tutor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_rate_from_tier();

-- Update existing tutors to bronze tier with default rate
UPDATE public.tutor_profiles 
SET tier = 'bronze',
    hourly_rate = 1500
WHERE tier IS NULL;