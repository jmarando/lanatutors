-- Create enum for subscription status
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled');

-- Create enum for payment status
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create recording subscriptions table
CREATE TABLE public.recording_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status subscription_status DEFAULT 'active',
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  amount DECIMAL(10, 2) DEFAULT 500.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.recording_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.recording_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Create individual recording purchases table
CREATE TABLE public.recording_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL,
  amount DECIMAL(10, 2) DEFAULT 200.00,
  purchased_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.recording_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases"
  ON public.recording_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Create payments table to track all transactions
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  mpesa_receipt_number TEXT,
  merchant_request_id TEXT,
  checkout_request_id TEXT,
  status payment_status DEFAULT 'pending',
  payment_type TEXT NOT NULL, -- 'subscription' or 'recording'
  reference_id UUID, -- Links to subscription or purchase
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

-- Function to check if user has access to a recording
CREATE OR REPLACE FUNCTION public.has_recording_access(
  _user_id UUID,
  _class_id TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Check if user has active subscription
  SELECT EXISTS (
    SELECT 1 FROM public.recording_subscriptions
    WHERE user_id = _user_id
      AND status = 'active'
      AND (end_date IS NULL OR end_date > NOW())
  )
  OR
  -- Check if user purchased this specific recording
  EXISTS (
    SELECT 1 FROM public.recording_purchases
    WHERE user_id = _user_id
      AND class_id = _class_id
  )
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();