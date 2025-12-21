-- Allow admins to insert learning plans
CREATE POLICY "Admins can create learning plans"
ON public.learning_plans
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all learning plans
CREATE POLICY "Admins can view all learning plans"
ON public.learning_plans
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update all learning plans
CREATE POLICY "Admins can update all learning plans"
ON public.learning_plans
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));