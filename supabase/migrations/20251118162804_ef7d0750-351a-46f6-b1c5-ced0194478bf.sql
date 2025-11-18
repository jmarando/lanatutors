-- Fix search_path by using CREATE OR REPLACE directly
CREATE OR REPLACE FUNCTION public.update_allocation_sessions_remaining()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.sessions_remaining = NEW.sessions_allocated - NEW.sessions_used;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_allocation_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allocation_id UUID;
  v_tutor_profile_id UUID;
BEGIN
  IF NEW.package_purchase_id IS NOT NULL AND NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    SELECT id INTO v_tutor_profile_id
    FROM public.tutor_profiles
    WHERE user_id = NEW.tutor_id
    LIMIT 1;

    SELECT id INTO v_allocation_id
    FROM public.package_subject_allocations
    WHERE package_purchase_id = NEW.package_purchase_id
      AND subject = NEW.subject
      AND tutor_id = v_tutor_profile_id
    LIMIT 1;

    IF v_allocation_id IS NOT NULL THEN
      UPDATE public.package_subject_allocations
      SET sessions_used = sessions_used + 1
      WHERE id = v_allocation_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;