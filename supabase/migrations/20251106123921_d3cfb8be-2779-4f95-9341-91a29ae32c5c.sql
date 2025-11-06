-- Update payments table to support Pesapal
ALTER TABLE public.payments 
DROP COLUMN IF EXISTS mpesa_receipt_number,
DROP COLUMN IF EXISTS merchant_request_id,
DROP COLUMN IF EXISTS checkout_request_id;

-- Add Pesapal-specific columns
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS pesapal_order_tracking_id text,
ADD COLUMN IF NOT EXISTS pesapal_merchant_reference text,
ADD COLUMN IF NOT EXISTS pesapal_payment_method text,
ADD COLUMN IF NOT EXISTS pesapal_confirmation_code text,
ADD COLUMN IF NOT EXISTS redirect_url text;