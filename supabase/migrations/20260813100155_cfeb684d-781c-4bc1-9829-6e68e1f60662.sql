CREATE TABLE public.whatsapp_suppressions (
  phone_number text PRIMARY KEY,
  reason text NOT NULL DEFAULT 'opt_out',
  source text,
  created_at timestamp with time zone NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, DELETE ON public.whatsapp_suppressions TO authenticated;
GRANT ALL ON public.whatsapp_suppressions TO service_role;

ALTER TABLE public.whatsapp_suppressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage WhatsApp suppressions"
ON public.whatsapp_suppressions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));