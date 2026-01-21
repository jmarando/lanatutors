-- Add admin notes column to students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS admin_notes text;

-- Create student_notes table for tracking progress notes over time
CREATE TABLE IF NOT EXISTS public.student_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL,
  note TEXT NOT NULL,
  note_type TEXT DEFAULT 'progress', -- progress, concern, achievement, general
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;

-- Admins can manage all notes
CREATE POLICY "Admins can manage all student notes" ON public.student_notes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Parents can view their children's notes
CREATE POLICY "Parents can view their children's notes" ON public.student_notes
  FOR SELECT USING (
    student_id IN (SELECT id FROM public.students WHERE parent_id = auth.uid())
  );