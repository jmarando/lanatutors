
-- ============================================
-- LANA FOR SCHOOLS: Database Schema
-- ============================================

-- 1. Schools table
CREATE TABLE public.schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#8B0000',
  secondary_color TEXT DEFAULT '#DAA520',
  tagline TEXT,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view schools" ON public.schools FOR SELECT USING (true);
CREATE POLICY "Admins can manage schools" ON public.schools FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. School members table
CREATE TABLE public.school_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'parent')),
  full_name TEXT NOT NULL,
  class_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.school_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own membership" ON public.school_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Members can view same school members" ON public.school_members FOR SELECT USING (
  school_id IN (SELECT sm.school_id FROM public.school_members sm WHERE sm.user_id = auth.uid())
);
CREATE POLICY "Admins can manage school members" ON public.school_members FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "School admins can manage their school members" ON public.school_members FOR ALL USING (
  school_id IN (SELECT sm.school_id FROM public.school_members sm WHERE sm.user_id = auth.uid() AND sm.role = 'admin')
);

-- 3. School students table
CREATE TABLE public.school_students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  parent_member_id UUID REFERENCES public.school_members(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.school_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members can view students in their school" ON public.school_students FOR SELECT USING (
  school_id IN (SELECT sm.school_id FROM public.school_members sm WHERE sm.user_id = auth.uid())
);
CREATE POLICY "Admins can manage school students" ON public.school_students FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "School admins can manage students" ON public.school_students FOR ALL USING (
  school_id IN (SELECT sm.school_id FROM public.school_members sm WHERE sm.user_id = auth.uid() AND sm.role = 'admin')
);
CREATE POLICY "Teachers can manage students in their school" ON public.school_students FOR ALL USING (
  school_id IN (SELECT sm.school_id FROM public.school_members sm WHERE sm.user_id = auth.uid() AND sm.role = 'teacher')
);

-- 4. School announcements
CREATE TABLE public.school_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'academic', 'sports', 'events')),
  author_id UUID REFERENCES public.school_members(id) ON DELETE SET NULL,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.school_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members can view published announcements" ON public.school_announcements FOR SELECT USING (
  published = true AND school_id IN (SELECT sm.school_id FROM public.school_members sm WHERE sm.user_id = auth.uid())
);
CREATE POLICY "School admins can manage announcements" ON public.school_announcements FOR ALL USING (
  school_id IN (SELECT sm.school_id FROM public.school_members sm WHERE sm.user_id = auth.uid() AND sm.role = 'admin')
);
CREATE POLICY "Teachers can view all announcements in their school" ON public.school_announcements FOR SELECT USING (
  school_id IN (SELECT sm.school_id FROM public.school_members sm WHERE sm.user_id = auth.uid() AND sm.role = 'teacher')
);
CREATE POLICY "Admins can manage all announcements" ON public.school_announcements FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. School events
CREATE TABLE public.school_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  location TEXT,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.school_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members can view events" ON public.school_events FOR SELECT USING (
  school_id IN (SELECT sm.school_id FROM public.school_members sm WHERE sm.user_id = auth.uid())
);
CREATE POLICY "School admins can manage events" ON public.school_events FOR ALL USING (
  school_id IN (SELECT sm.school_id FROM public.school_members sm WHERE sm.user_id = auth.uid() AND sm.role = 'admin')
);
CREATE POLICY "Admins can manage all events" ON public.school_events FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. School homework
CREATE TABLE public.school_homework (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.school_members(id) ON DELETE SET NULL,
  class_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.school_homework ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members can view homework" ON public.school_homework FOR SELECT USING (
  school_id IN (SELECT sm.school_id FROM public.school_members sm WHERE sm.user_id = auth.uid())
);
CREATE POLICY "Teachers can manage homework in their school" ON public.school_homework FOR ALL USING (
  school_id IN (SELECT sm.school_id FROM public.school_members sm WHERE sm.user_id = auth.uid() AND sm.role = 'teacher')
);
CREATE POLICY "School admins can manage homework" ON public.school_homework FOR ALL USING (
  school_id IN (SELECT sm.school_id FROM public.school_members sm WHERE sm.user_id = auth.uid() AND sm.role = 'admin')
);
CREATE POLICY "Admins can manage all homework" ON public.school_homework FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 7. School results
CREATE TABLE public.school_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_student_id UUID NOT NULL REFERENCES public.school_students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  term TEXT NOT NULL,
  year INTEGER NOT NULL,
  score NUMERIC NOT NULL,
  max_score NUMERIC NOT NULL DEFAULT 100,
  grade TEXT,
  teacher_comments TEXT,
  teacher_id UUID REFERENCES public.school_members(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.school_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members can view results in their school" ON public.school_results FOR SELECT USING (
  school_id IN (SELECT sm.school_id FROM public.school_members sm WHERE sm.user_id = auth.uid())
);
CREATE POLICY "Teachers can manage results in their school" ON public.school_results FOR ALL USING (
  school_id IN (SELECT sm.school_id FROM public.school_members sm WHERE sm.user_id = auth.uid() AND sm.role = 'teacher')
);
CREATE POLICY "School admins can manage results" ON public.school_results FOR ALL USING (
  school_id IN (SELECT sm.school_id FROM public.school_members sm WHERE sm.user_id = auth.uid() AND sm.role = 'admin')
);
CREATE POLICY "Admins can manage all results" ON public.school_results FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
