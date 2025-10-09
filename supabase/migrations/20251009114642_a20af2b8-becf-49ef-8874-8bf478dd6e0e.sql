-- Add INSERT policy to payments table to prevent unauthorized payment creation
-- Only service role (used by backend functions) can insert payments
-- This policy will deny INSERT for all authenticated users
-- Backend edge functions use service role which bypasses RLS

CREATE POLICY "Only backend can insert payments"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Add comment explaining the security model
COMMENT ON POLICY "Only backend can insert payments" ON public.payments IS 
'Prevents direct payment insertion by users. Payments can only be created by backend edge functions using service role, which bypasses RLS policies.';
