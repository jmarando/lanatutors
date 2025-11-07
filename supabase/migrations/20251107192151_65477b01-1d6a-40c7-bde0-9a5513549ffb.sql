-- Create student_progress table for tracking student learning progress
CREATE TABLE IF NOT EXISTS public.student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL,
  student_id UUID NOT NULL,
  subject TEXT NOT NULL,
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  notes TEXT,
  total_sessions INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tutor_id, student_id, subject)
);

-- Enable RLS
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;

-- Tutors can view and manage progress for their students
CREATE POLICY "Tutors can view their students' progress"
  ON public.student_progress
  FOR SELECT
  USING (
    tutor_id IN (
      SELECT user_id FROM tutor_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tutors can insert progress for their students"
  ON public.student_progress
  FOR INSERT
  WITH CHECK (
    tutor_id IN (
      SELECT user_id FROM tutor_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tutors can update their students' progress"
  ON public.student_progress
  FOR UPDATE
  USING (
    tutor_id IN (
      SELECT user_id FROM tutor_profiles WHERE user_id = auth.uid()
    )
  );

-- Students can view their own progress
CREATE POLICY "Students can view their own progress"
  ON public.student_progress
  FOR SELECT
  USING (auth.uid() = student_id);

-- Create index for faster queries
CREATE INDEX idx_student_progress_tutor ON public.student_progress(tutor_id);
CREATE INDEX idx_student_progress_student ON public.student_progress(student_id);

-- Add trigger to auto-update last_updated timestamp
CREATE TRIGGER update_student_progress_updated_at
  BEFORE UPDATE ON public.student_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();