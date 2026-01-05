-- Add admin_notes column to consultation_bookings table
ALTER TABLE public.consultation_bookings 
ADD COLUMN IF NOT EXISTS admin_notes text;