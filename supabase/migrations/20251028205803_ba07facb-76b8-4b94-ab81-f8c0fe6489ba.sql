-- Add conversion tracking columns to consultation_bookings
ALTER TABLE consultation_bookings 
ADD COLUMN IF NOT EXISTS consultation_outcome TEXT,
ADD COLUMN IF NOT EXISTS recommended_tutors TEXT[],
ADD COLUMN IF NOT EXISTS recommended_subjects TEXT[],
ADD COLUMN IF NOT EXISTS follow_up_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS follow_up_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS converted_to_customer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_action TEXT,
ADD COLUMN IF NOT EXISTS next_action_date TIMESTAMP WITH TIME ZONE;

-- Add index for filtering by follow-up status
CREATE INDEX IF NOT EXISTS idx_consultation_follow_up_status ON consultation_bookings(follow_up_status);
CREATE INDEX IF NOT EXISTS idx_consultation_converted ON consultation_bookings(converted_to_customer);

-- Add check constraint for follow_up_status
ALTER TABLE consultation_bookings 
DROP CONSTRAINT IF EXISTS check_follow_up_status;

ALTER TABLE consultation_bookings 
ADD CONSTRAINT check_follow_up_status 
CHECK (follow_up_status IN ('pending', 'follow_up_sent', 'needs_callback', 'converted', 'not_interested'));

COMMENT ON COLUMN consultation_bookings.consultation_outcome IS 'Summary of what was discussed during the consultation';
COMMENT ON COLUMN consultation_bookings.recommended_tutors IS 'Array of tutor IDs or names recommended to the parent';
COMMENT ON COLUMN consultation_bookings.recommended_subjects IS 'Subjects recommended for tutoring';
COMMENT ON COLUMN consultation_bookings.follow_up_status IS 'Tracking status: pending, follow_up_sent, needs_callback, converted, not_interested';
COMMENT ON COLUMN consultation_bookings.next_action IS 'Next step in the conversion journey';
COMMENT ON COLUMN consultation_bookings.next_action_date IS 'When to take the next action';