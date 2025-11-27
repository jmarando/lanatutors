-- Remove hourly rate range constraint to allow flexible pricing
-- Warnings will be shown in the UI but submissions won't be blocked
ALTER TABLE public.tutor_profiles 
DROP CONSTRAINT IF EXISTS hourly_rate_range;