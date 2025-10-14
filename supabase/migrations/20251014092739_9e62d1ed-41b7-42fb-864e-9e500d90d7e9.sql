-- Fix search path for get_rate_for_tier function
CREATE OR REPLACE FUNCTION public.get_rate_for_tier(_tier tutor_tier)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN _tier = 'gold' THEN 2000
    WHEN _tier = 'silver' THEN 1750
    WHEN _tier = 'bronze' THEN 1500
    ELSE 1500
  END;
$$;