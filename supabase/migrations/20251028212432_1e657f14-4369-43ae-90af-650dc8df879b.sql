-- Add meeting_link column to consultation_bookings table
ALTER TABLE consultation_bookings 
ADD COLUMN IF NOT EXISTS meeting_link TEXT;