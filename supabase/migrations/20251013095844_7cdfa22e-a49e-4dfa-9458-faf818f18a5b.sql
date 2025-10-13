-- Add TSC number column to tutor_applications table
ALTER TABLE public.tutor_applications
ADD COLUMN tsc_number text;