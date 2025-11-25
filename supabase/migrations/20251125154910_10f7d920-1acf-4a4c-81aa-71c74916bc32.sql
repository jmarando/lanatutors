-- Fix update_package_sessions_remaining function to include search_path
CREATE OR REPLACE FUNCTION public.update_package_sessions_remaining()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.sessions_remaining = NEW.total_sessions - NEW.sessions_used;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Fix increment_package_sessions function to include search_path
CREATE OR REPLACE FUNCTION public.increment_package_sessions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.package_purchase_id IS NOT NULL AND NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    UPDATE public.package_purchases
    SET sessions_used = sessions_used + 1
    WHERE id = NEW.package_purchase_id;
  END IF;
  RETURN NEW;
END;
$function$;