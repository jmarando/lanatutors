-- Remove old restrictive hourly_rate_range constraint
ALTER TABLE public.tutor_profiles
  DROP CONSTRAINT IF EXISTS hourly_rate_range;

-- Add new constraint matching our rate guidance system (1,000 to 15,000 KES)
ALTER TABLE public.tutor_profiles
  ADD CONSTRAINT hourly_rate_range CHECK (hourly_rate >= 1000 AND hourly_rate <= 15000);