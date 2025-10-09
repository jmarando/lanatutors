-- Prevent direct role insertion from client
CREATE POLICY "No direct role insertion"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Create secure function to assign roles during signup
-- This function runs with elevated privileges (SECURITY DEFINER)
-- and only allows assigning 'student' or 'tutor' roles
CREATE OR REPLACE FUNCTION public.assign_user_role(
  _user_id uuid,
  _role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate that only student or tutor roles can be assigned
  IF _role NOT IN ('student', 'tutor') THEN
    RAISE EXCEPTION 'Invalid role. Only student or tutor roles can be assigned.';
  END IF;
  
  -- Validate that the user_id matches the authenticated user
  IF _user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot assign role to another user.';
  END IF;
  
  -- Insert the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Add comment explaining the security model
COMMENT ON FUNCTION public.assign_user_role IS 'Securely assigns student or tutor role during signup. Uses SECURITY DEFINER to bypass RLS while enforcing role validation.';