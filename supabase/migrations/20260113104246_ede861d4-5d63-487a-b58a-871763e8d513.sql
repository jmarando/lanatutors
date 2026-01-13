-- Drop the old constraint and add one that includes 'manual'
ALTER TABLE public.tutor_availability 
DROP CONSTRAINT tutor_availability_slot_type_check;

ALTER TABLE public.tutor_availability 
ADD CONSTRAINT tutor_availability_slot_type_check 
CHECK (slot_type = ANY (ARRAY['available'::text, 'blocked'::text, 'manual'::text]));