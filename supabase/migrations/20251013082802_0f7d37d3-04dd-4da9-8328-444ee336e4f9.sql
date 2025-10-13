-- Create consultation_bookings table
CREATE TABLE IF NOT EXISTS public.consultation_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_name TEXT NOT NULL,
  student_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT,
  grade_level TEXT NOT NULL,
  subjects_interest TEXT[] NOT NULL,
  preferred_mode TEXT NOT NULL,
  additional_notes TEXT,
  consultation_date DATE NOT NULL,
  consultation_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS
ALTER TABLE public.consultation_bookings ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a consultation booking
CREATE POLICY "Anyone can book consultations"
  ON public.consultation_bookings
  FOR INSERT
  WITH CHECK (true);

-- Only admins can view consultation bookings
CREATE POLICY "Admins can view consultations"
  ON public.consultation_bookings
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_consultation_bookings_updated_at
  BEFORE UPDATE ON public.consultation_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add class_type column to bookings table (online or in-person)
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS class_type TEXT DEFAULT 'online' CHECK (class_type IN ('online', 'in-person'));

-- Add deposit_paid column to bookings table
ALTER TABLE public.bookings  
ADD COLUMN IF NOT EXISTS deposit_paid NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS balance_due NUMERIC DEFAULT 0;