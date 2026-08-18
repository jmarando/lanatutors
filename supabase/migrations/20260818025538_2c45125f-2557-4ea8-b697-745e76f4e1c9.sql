CREATE OR REPLACE FUNCTION public.get_booked_consultation_times(_date date)
RETURNS TABLE(consultation_time text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cb.consultation_time
  FROM public.consultation_bookings cb
  WHERE cb.consultation_date = _date
    AND cb.status <> 'cancelled';
$$;

GRANT EXECUTE ON FUNCTION public.get_booked_consultation_times(date) TO anon, authenticated;