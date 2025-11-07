-- Add foreign key constraint for student_progress to profiles
ALTER TABLE student_progress
DROP CONSTRAINT IF EXISTS student_progress_student_id_fkey;

ALTER TABLE student_progress
ADD CONSTRAINT student_progress_student_id_fkey 
FOREIGN KEY (student_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- Add foreign key constraint for tutor_id to profiles
ALTER TABLE student_progress
DROP CONSTRAINT IF EXISTS student_progress_tutor_id_fkey;

ALTER TABLE student_progress
ADD CONSTRAINT student_progress_tutor_id_fkey 
FOREIGN KEY (tutor_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;