-- Create policy for admin read access (no IF NOT EXISTS)
CREATE POLICY "Admins can view central calendar config"
ON public.central_calendar_config
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
