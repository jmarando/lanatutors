-- Add must_reset_password flag to user profiles so we can force a change on first login
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS must_reset_password boolean NOT NULL DEFAULT false;