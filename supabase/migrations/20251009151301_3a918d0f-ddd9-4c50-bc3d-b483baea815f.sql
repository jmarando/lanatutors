-- Fix the assign_user_role function to properly cast text to app_role enum
CREATE OR REPLACE FUNCTION public.assign_user_role(_user_id uuid, _role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
  
  -- Insert the role with proper type casting
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;