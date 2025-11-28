-- Create group classes tables

-- 1. Group Classes - Core class definitions
CREATE TABLE public.group_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  curriculum TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  description TEXT,
  hourly_rate NUMERIC DEFAULT 400,
  max_students INTEGER DEFAULT 10,
  current_enrollment INTEGER DEFAULT 0,
  day_of_week TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT DEFAULT 'Africa/Nairobi',
  meeting_link TEXT,
  classroom_id TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tutor Assignments - Multiple tutors per class
CREATE TABLE public.group_class_tutor_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_class_id UUID REFERENCES group_classes(id) ON DELETE CASCADE NOT NULL,
  tutor_id UUID REFERENCES tutor_profiles(id) ON DELETE CASCADE NOT NULL,
  assigned_days TEXT[] DEFAULT '{}',
  is_primary BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_class_id, tutor_id)
);

-- 3. Student Enrollments
CREATE TABLE public.group_class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_class_id UUID REFERENCES group_classes(id) ON DELETE CASCADE NOT NULL,
  student_id UUID NOT NULL,
  enrollment_type TEXT DEFAULT 'weekly',
  amount_paid NUMERIC NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  starts_at DATE NOT NULL,
  expires_at DATE,
  sessions_attended INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_class_id, student_id)
);

-- 4. Attendance Tracking
CREATE TABLE public.group_class_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_class_id UUID REFERENCES group_classes(id) ON DELETE CASCADE NOT NULL,
  student_id UUID NOT NULL,
  tutor_id UUID REFERENCES tutor_profiles(id),
  session_date DATE NOT NULL,
  attended BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.group_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_class_tutor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_class_attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_classes
CREATE POLICY "Public can view active group classes"
  ON public.group_classes FOR SELECT
  USING (status = 'active');

CREATE POLICY "Admins can manage all group classes"
  ON public.group_classes FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for group_class_tutor_assignments
CREATE POLICY "Tutors can view their assignments"
  ON public.group_class_tutor_assignments FOR SELECT
  USING (tutor_id IN (SELECT id FROM tutor_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage tutor assignments"
  ON public.group_class_tutor_assignments FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for group_class_enrollments
CREATE POLICY "Students can view their enrollments"
  ON public.group_class_enrollments FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can create enrollments"
  ON public.group_class_enrollments FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins can manage all enrollments"
  ON public.group_class_enrollments FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for group_class_attendance
CREATE POLICY "Students can view their attendance"
  ON public.group_class_attendance FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Tutors can manage attendance for their classes"
  ON public.group_class_attendance FOR ALL
  USING (tutor_id IN (SELECT id FROM tutor_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all attendance"
  ON public.group_class_attendance FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Trigger to update current_enrollment
CREATE OR REPLACE FUNCTION update_group_class_enrollment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE group_classes 
    SET current_enrollment = current_enrollment + 1
    WHERE id = NEW.group_class_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE group_classes 
    SET current_enrollment = GREATEST(0, current_enrollment - 1)
    WHERE id = OLD.group_class_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_enrollment_count
  AFTER INSERT OR DELETE ON group_class_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_group_class_enrollment_count();