-- Add qualifying question fields to consultation_bookings
ALTER TABLE public.consultation_bookings
ADD COLUMN IF NOT EXISTS specific_challenges text,
ADD COLUMN IF NOT EXISTS urgency text,
ADD COLUMN IF NOT EXISTS budget_range text;

-- Add share token to learning_plans for public sharing
ALTER TABLE public.learning_plans
ADD COLUMN IF NOT EXISTS share_token uuid DEFAULT gen_random_uuid() UNIQUE;

-- Update existing learning plans to have share tokens
UPDATE public.learning_plans SET share_token = gen_random_uuid() WHERE share_token IS NULL;

-- Create RLS policy for public learning plan view via share token
CREATE POLICY "Anyone can view learning plans via share token"
ON public.learning_plans
FOR SELECT
USING (share_token IS NOT NULL);