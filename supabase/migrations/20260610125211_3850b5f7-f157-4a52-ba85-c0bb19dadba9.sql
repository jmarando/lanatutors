GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_school_role(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_school_ids(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_recording_access(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_tutor_profiles() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_email(uuid) TO authenticated, service_role;