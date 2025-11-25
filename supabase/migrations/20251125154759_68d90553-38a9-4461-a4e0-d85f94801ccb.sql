-- Create security definer function to get user email safely
CREATE OR REPLACE FUNCTION public.get_user_email(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email::text FROM auth.users WHERE id = _user_id;
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Parents can view own inquiries" ON public.tutor_inquiries;

-- Recreate the policy using the security definer function
CREATE POLICY "Parents can view own inquiries"
ON public.tutor_inquiries
FOR SELECT
USING (
  (parent_id = auth.uid()) 
  OR 
  (parent_email = public.get_user_email(auth.uid()))
);