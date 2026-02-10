
-- Teacher consultation slots
CREATE TABLE public.school_teacher_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_member_id UUID NOT NULL REFERENCES public.school_members(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_booked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.school_parent_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES public.school_teacher_slots(id) ON DELETE CASCADE,
  parent_member_id UUID NOT NULL REFERENCES public.school_members(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.school_students(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.school_teacher_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_parent_bookings ENABLE ROW LEVEL SECURITY;

-- Slots policies
CREATE POLICY "School members can view teacher slots"
  ON public.school_teacher_slots FOR SELECT
  USING (school_id IN (SELECT get_user_school_ids(auth.uid())));

CREATE POLICY "Teachers can create slots"
  ON public.school_teacher_slots FOR INSERT
  WITH CHECK (
    school_id IN (SELECT get_user_school_ids(auth.uid()))
    AND teacher_member_id IN (
      SELECT id FROM public.school_members WHERE user_id = auth.uid() AND role = 'teacher'
    )
  );

CREATE POLICY "Teachers can update own slots"
  ON public.school_teacher_slots FOR UPDATE
  USING (
    teacher_member_id IN (
      SELECT id FROM public.school_members WHERE user_id = auth.uid() AND role = 'teacher'
    )
  );

CREATE POLICY "Teachers can delete own unbooked slots"
  ON public.school_teacher_slots FOR DELETE
  USING (
    is_booked = false
    AND teacher_member_id IN (
      SELECT id FROM public.school_members WHERE user_id = auth.uid() AND role = 'teacher'
    )
  );

CREATE POLICY "Admins manage teacher slots"
  ON public.school_teacher_slots FOR ALL
  USING (is_school_role(school_id, auth.uid(), 'admin'));

-- Bookings policies
CREATE POLICY "School members can view parent bookings"
  ON public.school_parent_bookings FOR SELECT
  USING (school_id IN (SELECT get_user_school_ids(auth.uid())));

CREATE POLICY "Parents can create bookings"
  ON public.school_parent_bookings FOR INSERT
  WITH CHECK (
    school_id IN (SELECT get_user_school_ids(auth.uid()))
    AND parent_member_id IN (
      SELECT id FROM public.school_members WHERE user_id = auth.uid() AND role = 'parent'
    )
  );

CREATE POLICY "Parents can update own bookings"
  ON public.school_parent_bookings FOR UPDATE
  USING (
    parent_member_id IN (
      SELECT id FROM public.school_members WHERE user_id = auth.uid() AND role = 'parent'
    )
  );

CREATE POLICY "Admins manage parent bookings"
  ON public.school_parent_bookings FOR ALL
  USING (is_school_role(school_id, auth.uid(), 'admin'));
