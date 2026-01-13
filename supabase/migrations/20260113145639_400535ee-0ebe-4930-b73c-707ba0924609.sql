-- Add policy for admins to insert students
CREATE POLICY "Admins can insert students"
ON public.students
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add policy for admins to update students
CREATE POLICY "Admins can update students"
ON public.students
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add policy for admins to delete students
CREATE POLICY "Admins can delete students"
ON public.students
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));