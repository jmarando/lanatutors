-- Update hourly_rate_range constraint to allow minimum of 500 KES
ALTER TABLE public.tutor_profiles
  DROP CONSTRAINT IF EXISTS hourly_rate_range;

ALTER TABLE public.tutor_profiles
  ADD CONSTRAINT hourly_rate_range CHECK (hourly_rate >= 500 AND hourly_rate <= 15000);