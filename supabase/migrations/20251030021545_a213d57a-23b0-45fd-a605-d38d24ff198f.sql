-- Fix security definer view warning
DROP VIEW IF EXISTS public.public_tutor_profiles;

CREATE OR REPLACE VIEW public.public_tutor_profiles 
WITH (security_invoker=true) AS
SELECT 
  p.id,
  p.full_name,
  p.curriculum,
  p.avatar_url,
  p.created_at
FROM public.profiles p
INNER JOIN public.tutor_profiles tp ON tp.user_id = p.id
WHERE tp.verified = true;

GRANT SELECT ON public.public_tutor_profiles TO anon, authenticated;