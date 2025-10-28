-- Update tutor_applications table to support new workflow
-- Add new status values and interview tracking fields
ALTER TABLE tutor_applications 
ADD COLUMN IF NOT EXISTS interview_scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS interview_meet_link TEXT,
ADD COLUMN IF NOT EXISTS interview_notes TEXT;

-- Add comment explaining the status flow
COMMENT ON COLUMN tutor_applications.status IS 
'Status flow: pending -> interview_scheduled -> interview_passed/interview_failed -> approved/rejected';
