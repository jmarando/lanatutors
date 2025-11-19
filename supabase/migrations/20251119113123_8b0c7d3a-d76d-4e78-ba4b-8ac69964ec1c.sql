-- Add currency and timezone preferences to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_currency text DEFAULT 'KES',
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Africa/Nairobi';

-- Add currency fields to bookings
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'KES',
ADD COLUMN IF NOT EXISTS amount_original_currency numeric,
ADD COLUMN IF NOT EXISTS exchange_rate numeric DEFAULT 1.0;

-- Add currency fields to package_purchases  
ALTER TABLE public.package_purchases
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'KES',
ADD COLUMN IF NOT EXISTS amount_original_currency numeric,
ADD COLUMN IF NOT EXISTS exchange_rate numeric DEFAULT 1.0;

-- Add currency fields to payments
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'KES',
ADD COLUMN IF NOT EXISTS amount_original_currency numeric,
ADD COLUMN IF NOT EXISTS exchange_rate numeric DEFAULT 1.0;

-- Add diaspora_friendly flag to tutor profiles
ALTER TABLE public.tutor_profiles
ADD COLUMN IF NOT EXISTS diaspora_friendly boolean DEFAULT true;

-- Create exchange rates cache table
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency text NOT NULL DEFAULT 'KES',
  target_currency text NOT NULL,
  rate numeric NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(base_currency, target_currency)
);

-- Enable RLS on exchange_rates
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view exchange rates
CREATE POLICY "Anyone can view exchange rates"
ON public.exchange_rates
FOR SELECT
TO authenticated, anon
USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies 
ON public.exchange_rates(base_currency, target_currency);