ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS deposit_percentage integer;

GRANT SELECT, INSERT, UPDATE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;