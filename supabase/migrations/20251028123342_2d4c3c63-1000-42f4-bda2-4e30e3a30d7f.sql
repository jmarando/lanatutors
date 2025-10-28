-- Fix RLS policy for tutor_applications to avoid referencing auth.users
-- This resolves "permission denied for table users" when selecting pending applications

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view own application" ON public.tutor_applications;

-- Recreate policy using JWT claims for email instead of selecting from auth.users
CREATE POLICY "Users can view own application"
ON public.tutor_applications
FOR SELECT
TO authenticated
USING (
  (auth.uid() = user_id)
  OR (
    email = (current_setting('request.jwt.claims', true)::jsonb ->> 'email')
  )
);

-- Ensure realtime emits full row data for changes to tutor_applications
ALTER TABLE public.tutor_applications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tutor_applications;