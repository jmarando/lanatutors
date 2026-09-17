CREATE OR REPLACE FUNCTION public.set_tutor_profile_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  IF NEW.profile_slug IS NULL OR trim(NEW.profile_slug) = '' THEN
    SELECT full_name INTO v_name FROM public.profiles WHERE id = NEW.user_id;
    IF v_name IS NULL OR trim(v_name) = '' THEN
      v_name := 'tutor';
    END IF;
    NEW.profile_slug := public.generate_tutor_slug(v_name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_tutor_profile_slug_trigger ON public.tutor_profiles;
CREATE TRIGGER set_tutor_profile_slug_trigger
BEFORE INSERT OR UPDATE ON public.tutor_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_tutor_profile_slug();

UPDATE public.tutor_profiles
SET profile_slug = NULL
WHERE profile_slug IS NULL OR trim(profile_slug) = '';