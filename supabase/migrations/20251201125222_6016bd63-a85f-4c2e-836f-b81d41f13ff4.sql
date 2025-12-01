-- Create intensive_programs table
CREATE TABLE public.intensive_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  session_duration_minutes INTEGER NOT NULL DEFAULT 75,
  break_duration_minutes INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create intensive_classes table
CREATE TABLE public.intensive_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.intensive_programs(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  curriculum TEXT NOT NULL,
  grade_levels TEXT[] NOT NULL,
  time_slot TEXT NOT NULL,
  focus_topics TEXT,
  max_students INTEGER NOT NULL DEFAULT 20,
  current_enrollment INTEGER NOT NULL DEFAULT 0,
  tutor_id UUID REFERENCES public.tutor_profiles(id) ON DELETE SET NULL,
  meeting_link TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create intensive_enrollments table
CREATE TABLE public.intensive_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.intensive_programs(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrolled_class_ids UUID[] NOT NULL,
  total_subjects INTEGER NOT NULL,
  total_amount NUMERIC NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  pesapal_order_tracking_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.intensive_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intensive_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intensive_enrollments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for intensive_programs
CREATE POLICY "Anyone can view active programs"
ON public.intensive_programs
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage programs"
ON public.intensive_programs
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for intensive_classes
CREATE POLICY "Anyone can view active classes"
ON public.intensive_classes
FOR SELECT
USING (status = 'active');

CREATE POLICY "Admins can manage classes"
ON public.intensive_classes
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for intensive_enrollments
CREATE POLICY "Students can create their own enrollments"
ON public.intensive_enrollments
FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can view their own enrollments"
ON public.intensive_enrollments
FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Admins can view all enrollments"
ON public.intensive_enrollments
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all enrollments"
ON public.intensive_enrollments
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Deactivate existing group classes
UPDATE public.group_classes SET status = 'archived' WHERE status = 'active';

-- Create trigger to update updated_at
CREATE TRIGGER update_intensive_programs_updated_at
BEFORE UPDATE ON public.intensive_programs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_intensive_classes_updated_at
BEFORE UPDATE ON public.intensive_classes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_intensive_enrollments_updated_at
BEFORE UPDATE ON public.intensive_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to update class enrollment count
CREATE OR REPLACE FUNCTION public.update_intensive_class_enrollment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment enrollment for each class
    UPDATE intensive_classes
    SET current_enrollment = current_enrollment + 1
    WHERE id = ANY(NEW.enrolled_class_ids);
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement enrollment for each class
    UPDATE intensive_classes
    SET current_enrollment = GREATEST(0, current_enrollment - 1)
    WHERE id = ANY(OLD.enrolled_class_ids);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_intensive_enrollment_count
AFTER INSERT OR DELETE ON public.intensive_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.update_intensive_class_enrollment();