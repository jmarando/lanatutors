-- Add slot_type column to tutor_availability to support blocked times
ALTER TABLE public.tutor_availability 
ADD COLUMN slot_type text DEFAULT 'available' CHECK (slot_type IN ('available', 'blocked'));

-- Add index for better query performance
CREATE INDEX idx_tutor_availability_slot_type ON public.tutor_availability(tutor_id, slot_type, start_time);

-- Update existing slots to be marked as 'available'
UPDATE public.tutor_availability SET slot_type = 'available' WHERE slot_type IS NULL;