-- Create table for tutor applications (pre-approval stage)
CREATE TABLE public.tutor_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  current_school TEXT NOT NULL,
  years_of_experience INTEGER NOT NULL,
  cv_url TEXT,
  agreed_to_terms BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tutor_applications ENABLE ROW LEVEL SECURITY;

-- Users can view their own application
CREATE POLICY "Users can view own application"
ON public.tutor_applications
FOR SELECT
USING (auth.uid() = user_id OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Anyone can create an application (for pre-signup)
CREATE POLICY "Anyone can create application"
ON public.tutor_applications
FOR INSERT
WITH CHECK (true);

-- Admins can view all applications
CREATE POLICY "Admins can view all applications"
ON public.tutor_applications
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update applications
CREATE POLICY "Admins can update applications"
ON public.tutor_applications
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for CVs
INSERT INTO storage.buckets (id, name, public)
VALUES ('tutor-cvs', 'tutor-cvs', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for CV bucket
CREATE POLICY "Users can upload their own CV"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'tutor-cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own CV"
ON storage.objects
FOR SELECT
USING (bucket_id = 'tutor-cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all CVs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'tutor-cvs' AND has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_tutor_applications_updated_at
BEFORE UPDATE ON public.tutor_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();