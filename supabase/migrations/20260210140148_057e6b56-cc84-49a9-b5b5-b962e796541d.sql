
-- Fix school_members RLS: the "view own membership" policy should be sufficient for login
-- Drop the circular "same school" policy and recreate it with SECURITY DEFINER function

CREATE OR REPLACE FUNCTION public.get_user_school_ids(p_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT school_id FROM public.school_members WHERE user_id = p_user_id;
$$;

-- Drop and recreate the problematic policy
DROP POLICY IF EXISTS "Members can view same school members" ON public.school_members;
CREATE POLICY "Members can view same school members" ON public.school_members 
  FOR SELECT USING (school_id IN (SELECT public.get_user_school_ids(auth.uid())));

-- Also fix other tables that have the same circular pattern
DROP POLICY IF EXISTS "School members can view students in their school" ON public.school_students;
CREATE POLICY "School members can view students in their school" ON public.school_students 
  FOR SELECT USING (school_id IN (SELECT public.get_user_school_ids(auth.uid())));

DROP POLICY IF EXISTS "School members can view published announcements" ON public.school_announcements;
CREATE POLICY "School members can view published announcements" ON public.school_announcements 
  FOR SELECT USING (published = true AND school_id IN (SELECT public.get_user_school_ids(auth.uid())));

DROP POLICY IF EXISTS "Teachers can view all announcements in their school" ON public.school_announcements;

DROP POLICY IF EXISTS "School members can view events" ON public.school_events;
CREATE POLICY "School members can view events" ON public.school_events 
  FOR SELECT USING (school_id IN (SELECT public.get_user_school_ids(auth.uid())));

DROP POLICY IF EXISTS "School members can view homework" ON public.school_homework;
CREATE POLICY "School members can view homework" ON public.school_homework 
  FOR SELECT USING (school_id IN (SELECT public.get_user_school_ids(auth.uid())));

DROP POLICY IF EXISTS "School members can view results in their school" ON public.school_results;
CREATE POLICY "School members can view results in their school" ON public.school_results 
  FOR SELECT USING (school_id IN (SELECT public.get_user_school_ids(auth.uid())));

-- Fix teacher/admin management policies similarly
DROP POLICY IF EXISTS "School admins can manage their school members" ON public.school_members;

CREATE OR REPLACE FUNCTION public.is_school_role(p_user_id UUID, p_school_id UUID, p_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.school_members WHERE user_id = p_user_id AND school_id = p_school_id AND role = p_role);
$$;

CREATE POLICY "School admins can manage their school members" ON public.school_members 
  FOR ALL USING (public.is_school_role(auth.uid(), school_id, 'admin'));

DROP POLICY IF EXISTS "School admins can manage students" ON public.school_students;
CREATE POLICY "School admins can manage students" ON public.school_students 
  FOR ALL USING (public.is_school_role(auth.uid(), school_id, 'admin'));

DROP POLICY IF EXISTS "Teachers can manage students in their school" ON public.school_students;
CREATE POLICY "Teachers can manage students in their school" ON public.school_students 
  FOR ALL USING (public.is_school_role(auth.uid(), school_id, 'teacher'));

DROP POLICY IF EXISTS "School admins can manage announcements" ON public.school_announcements;
CREATE POLICY "School admins can manage announcements" ON public.school_announcements 
  FOR ALL USING (public.is_school_role(auth.uid(), school_id, 'admin'));

DROP POLICY IF EXISTS "School admins can manage events" ON public.school_events;
CREATE POLICY "School admins can manage events" ON public.school_events 
  FOR ALL USING (public.is_school_role(auth.uid(), school_id, 'admin'));

DROP POLICY IF EXISTS "Teachers can manage homework in their school" ON public.school_homework;
CREATE POLICY "Teachers can manage homework in their school" ON public.school_homework 
  FOR ALL USING (public.is_school_role(auth.uid(), school_id, 'teacher'));

DROP POLICY IF EXISTS "School admins can manage homework" ON public.school_homework;
CREATE POLICY "School admins can manage homework" ON public.school_homework 
  FOR ALL USING (public.is_school_role(auth.uid(), school_id, 'admin'));

DROP POLICY IF EXISTS "Teachers can manage results in their school" ON public.school_results;
CREATE POLICY "Teachers can manage results in their school" ON public.school_results 
  FOR ALL USING (public.is_school_role(auth.uid(), school_id, 'teacher'));

DROP POLICY IF EXISTS "School admins can manage results" ON public.school_results;
CREATE POLICY "School admins can manage results" ON public.school_results 
  FOR ALL USING (public.is_school_role(auth.uid(), school_id, 'admin'));
