-- Fix search_path for security definer functions
CREATE OR REPLACE FUNCTION mark_slot_as_booked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tutor_availability
  SET is_booked = true
  WHERE id = NEW.availability_slot_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION unmark_slot_on_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE public.tutor_availability
    SET is_booked = false
    WHERE id = NEW.availability_slot_id;
  END IF;
  RETURN NEW;
END;
$$;