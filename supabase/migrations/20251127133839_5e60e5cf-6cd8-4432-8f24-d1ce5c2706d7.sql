-- Add desired duration field to tutor_inquiries table
ALTER TABLE tutor_inquiries 
ADD COLUMN desired_duration_weeks integer,
ADD COLUMN available_time_per_week text;

COMMENT ON COLUMN tutor_inquiries.desired_duration_weeks IS 'How many weeks the parent wants tutoring to last';
COMMENT ON COLUMN tutor_inquiries.available_time_per_week IS 'Description of student available time at home for studying';