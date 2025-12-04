-- Create students table for parent-managed student profiles
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  age INTEGER,
  curriculum TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  email TEXT,
  subjects_of_interest TEXT[],
  learning_goals TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Add student_profile_id to bookings FIRST (before creating policy that references it)
ALTER TABLE public.bookings 
ADD COLUMN student_profile_id UUID REFERENCES public.students(id);

-- Add student_profile_id to package_purchases
ALTER TABLE public.package_purchases
ADD COLUMN student_profile_id UUID REFERENCES public.students(id);

-- Add student_profile_id to intensive_enrollments
ALTER TABLE public.intensive_enrollments
ADD COLUMN student_profile_id UUID REFERENCES public.students(id);

-- Add student_profile_id to group_class_enrollments
ALTER TABLE public.group_class_enrollments
ADD COLUMN student_profile_id UUID REFERENCES public.students(id);

-- NOW create RLS policies
-- Parents can manage their own students
CREATE POLICY "Parents can CRUD their own students"
ON public.students FOR ALL
USING (parent_id = auth.uid());

-- Admins can view all students
CREATE POLICY "Admins can view all students"
ON public.students FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Tutors can view students from their bookings
CREATE POLICY "Tutors can view students from their bookings"
ON public.students FOR SELECT
USING (
  id IN (
    SELECT b.student_profile_id FROM public.bookings b
    WHERE b.tutor_id = auth.uid() AND b.student_profile_id IS NOT NULL
  )
);

-- Add account_type to profiles
ALTER TABLE public.profiles 
ADD COLUMN account_type TEXT DEFAULT 'student' 
CHECK (account_type IN ('parent', 'student'));

-- Create trigger for updated_at
CREATE TRIGGER update_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();