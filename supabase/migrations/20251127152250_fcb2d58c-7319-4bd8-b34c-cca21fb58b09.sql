-- Add booking_group_id to track related bookings made together
ALTER TABLE bookings 
ADD COLUMN booking_group_id uuid;

-- Create index for faster grouping queries
CREATE INDEX idx_bookings_group_id ON bookings(booking_group_id);

-- Add comment explaining the field
COMMENT ON COLUMN bookings.booking_group_id IS 'Groups related bookings that were made together in a single transaction. Used to display multiple sessions as a single booking entry in student/tutor dashboards.';