-- Add Google Classroom fields to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS classroom_id text,
ADD COLUMN IF NOT EXISTS classroom_link text;

COMMENT ON COLUMN bookings.classroom_id IS 'Google Classroom course ID for this booking';
COMMENT ON COLUMN bookings.classroom_link IS 'Direct link to the Google Classroom';