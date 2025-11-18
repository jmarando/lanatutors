-- Create package_subject_allocations table to track tutors per subject
CREATE TABLE public.package_subject_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_purchase_id UUID NOT NULL REFERENCES public.package_purchases(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  tutor_id UUID REFERENCES public.tutor_profiles(id) ON DELETE SET NULL,
  sessions_allocated INTEGER NOT NULL,
  sessions_used INTEGER NOT NULL DEFAULT 0,
  sessions_remaining INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_assignment',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(package_purchase_id, subject)
);

-- Enable RLS
ALTER TABLE public.package_subject_allocations ENABLE ROW LEVEL SECURITY;

-- Students can view their own allocations
CREATE POLICY "Students can view their package allocations"
ON public.package_subject_allocations
FOR SELECT
USING (
  package_purchase_id IN (
    SELECT id FROM public.package_purchases
    WHERE student_id = auth.uid()
  )
);

-- Admins can view all allocations
CREATE POLICY "Admins can view all allocations"
ON public.package_subject_allocations
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update allocations (assign tutors)
CREATE POLICY "Admins can update allocations"
ON public.package_subject_allocations
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Admins can insert allocations
CREATE POLICY "Admins can insert allocations"
ON public.package_subject_allocations
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Tutors can view allocations assigned to them
CREATE POLICY "Tutors can view their allocations"
ON public.package_subject_allocations
FOR SELECT
USING (
  tutor_id IN (
    SELECT id FROM public.tutor_profiles
    WHERE user_id = auth.uid()
  )
);

-- Create trigger to update sessions_remaining
CREATE OR REPLACE FUNCTION public.update_allocation_sessions_remaining()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.sessions_remaining = NEW.sessions_allocated - NEW.sessions_used;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_allocations_sessions_remaining
BEFORE UPDATE ON public.package_subject_allocations
FOR EACH ROW
EXECUTE FUNCTION public.update_allocation_sessions_remaining();

-- Create trigger to decrement allocation sessions when booking is confirmed
CREATE OR REPLACE FUNCTION public.decrement_allocation_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_allocation_id UUID;
BEGIN
  -- Only process if booking has a package and is confirmed
  IF NEW.package_purchase_id IS NOT NULL AND NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    -- Find the allocation for this subject and tutor
    SELECT id INTO v_allocation_id
    FROM public.package_subject_allocations
    WHERE package_purchase_id = NEW.package_purchase_id
      AND subject = NEW.subject
      AND tutor_id IN (
        SELECT id FROM public.tutor_profiles WHERE user_id = NEW.tutor_id
      )
    LIMIT 1;

    -- Increment sessions_used for the allocation
    IF v_allocation_id IS NOT NULL THEN
      UPDATE public.package_subject_allocations
      SET sessions_used = sessions_used + 1
      WHERE id = v_allocation_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER decrement_allocation_sessions
AFTER INSERT OR UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.decrement_allocation_on_booking();

-- Add metadata column to package_purchases to store subject breakdown
ALTER TABLE public.package_purchases
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;