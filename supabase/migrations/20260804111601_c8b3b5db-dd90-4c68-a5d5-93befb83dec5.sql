CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  source TEXT NOT NULL DEFAULT 'custom',
  parent_name TEXT NOT NULL,
  parent_email TEXT,
  parent_phone TEXT,
  student_name TEXT,
  tutor_name TEXT,
  subject TEXT,
  class_type TEXT,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'KES',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  amount_to_pay NUMERIC NOT NULL DEFAULT 0,
  payment_option TEXT NOT NULL DEFAULT 'full',
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX invoices_invoice_number_key ON public.invoices (invoice_number);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invoices"
ON public.invoices FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();