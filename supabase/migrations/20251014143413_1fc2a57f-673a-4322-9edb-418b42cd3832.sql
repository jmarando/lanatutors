-- Create package_offers table for predefined tutor packages
CREATE TABLE IF NOT EXISTS public.package_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id UUID NOT NULL REFERENCES public.tutor_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  session_count INTEGER NOT NULL CHECK (session_count > 0),
  total_price NUMERIC NOT NULL CHECK (total_price > 0),
  discount_percentage NUMERIC DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  validity_days INTEGER DEFAULT 90 CHECK (validity_days > 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create package_purchases table to track student package purchases
CREATE TABLE IF NOT EXISTS public.package_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  tutor_id UUID NOT NULL REFERENCES public.tutor_profiles(id) ON DELETE CASCADE,
  package_offer_id UUID REFERENCES public.package_offers(id) ON DELETE SET NULL,
  total_sessions INTEGER NOT NULL,
  sessions_used INTEGER DEFAULT 0,
  sessions_remaining INTEGER NOT NULL,
  total_amount NUMERIC NOT NULL,
  amount_paid NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'completed')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Link bookings to packages
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS package_purchase_id UUID REFERENCES public.package_purchases(id) ON DELETE SET NULL;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS payment_option TEXT DEFAULT 'deposit' CHECK (payment_option IN ('deposit', 'full', 'package'));

-- Enable RLS
ALTER TABLE public.package_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for package_offers
CREATE POLICY "Anyone can view active package offers"
ON public.package_offers FOR SELECT
USING (is_active = true);

CREATE POLICY "Tutors can manage their own packages"
ON public.package_offers FOR ALL
USING (auth.uid() IN (SELECT user_id FROM public.tutor_profiles WHERE id = tutor_id));

-- RLS Policies for package_purchases
CREATE POLICY "Students can view their own package purchases"
ON public.package_purchases FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Students can create package purchases"
ON public.package_purchases FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own package purchases"
ON public.package_purchases FOR UPDATE
USING (auth.uid() = student_id);

CREATE POLICY "Tutors can view packages purchased for their sessions"
ON public.package_purchases FOR SELECT
USING (auth.uid() IN (SELECT user_id FROM public.tutor_profiles WHERE id = tutor_id));

-- Create trigger to update sessions_remaining when sessions_used changes
CREATE OR REPLACE FUNCTION update_package_sessions_remaining()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sessions_remaining = NEW.total_sessions - NEW.sessions_used;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_package_sessions_remaining_trigger
BEFORE UPDATE OF sessions_used ON public.package_purchases
FOR EACH ROW
EXECUTE FUNCTION update_package_sessions_remaining();

-- Create trigger to increment sessions_used when booking is confirmed with package
CREATE OR REPLACE FUNCTION increment_package_sessions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.package_purchase_id IS NOT NULL AND NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    UPDATE public.package_purchases
    SET sessions_used = sessions_used + 1
    WHERE id = NEW.package_purchase_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_package_sessions_trigger
AFTER INSERT OR UPDATE OF status ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION increment_package_sessions();

-- Insert default packages for existing tutors (example)
INSERT INTO public.package_offers (tutor_id, name, description, session_count, total_price, discount_percentage, validity_days)
SELECT 
  id as tutor_id,
  '5-Session Package',
  'Save 10% with 5 sessions',
  5,
  hourly_rate * 5 * 0.9,
  10,
  60
FROM public.tutor_profiles
WHERE verified = true
ON CONFLICT DO NOTHING;

INSERT INTO public.package_offers (tutor_id, name, description, session_count, total_price, discount_percentage, validity_days)
SELECT 
  id as tutor_id,
  '10-Session Package',
  'Save 15% with 10 sessions',
  10,
  hourly_rate * 10 * 0.85,
  15,
  90
FROM public.tutor_profiles
WHERE verified = true
ON CONFLICT DO NOTHING;