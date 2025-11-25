-- Allow NULL hourly_rate while enforcing valid range when set
ALTER TABLE public.tutor_profiles
  DROP CONSTRAINT IF EXISTS hourly_rate_range;

ALTER TABLE public.tutor_profiles
  ADD CONSTRAINT hourly_rate_range CHECK (
    hourly_rate IS NULL OR (hourly_rate >= 500 AND hourly_rate <= 15000)
  );