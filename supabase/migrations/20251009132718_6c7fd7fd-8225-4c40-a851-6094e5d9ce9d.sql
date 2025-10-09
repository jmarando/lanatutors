-- Create tutor availability slots table
CREATE TABLE public.tutor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  is_booked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  availability_slot_id UUID NOT NULL REFERENCES public.tutor_availability(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  amount NUMERIC NOT NULL,
  meeting_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tutor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- RLS policies for tutor_availability
CREATE POLICY "Anyone can view available slots"
ON public.tutor_availability
FOR SELECT
USING (true);

CREATE POLICY "Tutors can manage their own availability"
ON public.tutor_availability
FOR ALL
USING (auth.uid() = tutor_id);

-- RLS policies for bookings
CREATE POLICY "Users can view their own bookings"
ON public.bookings
FOR SELECT
USING (auth.uid() = student_id OR auth.uid() = tutor_id);

CREATE POLICY "Students can create bookings"
ON public.bookings
FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Tutors and students can update their bookings"
ON public.bookings
FOR UPDATE
USING (auth.uid() = student_id OR auth.uid() = tutor_id);

-- Triggers for updated_at
CREATE TRIGGER update_tutor_availability_updated_at
BEFORE UPDATE ON public.tutor_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to mark slot as booked when booking is created
CREATE OR REPLACE FUNCTION mark_slot_as_booked()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.tutor_availability
  SET is_booked = true
  WHERE id = NEW.availability_slot_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_booking_created
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION mark_slot_as_booked();

-- Function to unmark slot when booking is cancelled
CREATE OR REPLACE FUNCTION unmark_slot_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE public.tutor_availability
    SET is_booked = false
    WHERE id = NEW.availability_slot_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_booking_cancelled
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION unmark_slot_on_cancel();