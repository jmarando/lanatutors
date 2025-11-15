-- Add holiday_revision package type to the package_type enum
ALTER TYPE package_type ADD VALUE IF NOT EXISTS 'holiday_revision';

-- Create a table for holiday package configurations
CREATE TABLE IF NOT EXISTS public.holiday_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  holiday_period text NOT NULL, -- 'december', 'april', 'august'
  curriculum text NOT NULL,
  candidate_levels text[] NOT NULL, -- e.g., ['Form 4', 'Year 13']
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.holiday_packages ENABLE ROW LEVEL SECURITY;

-- Anyone can view active holiday packages
CREATE POLICY "Anyone can view active holiday packages"
ON public.holiday_packages
FOR SELECT
USING (is_active = true);

-- Admins can manage holiday packages
CREATE POLICY "Admins can manage holiday packages"
ON public.holiday_packages
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_holiday_packages_updated_at
BEFORE UPDATE ON public.holiday_packages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert December 2025 holiday packages for candidate years
INSERT INTO public.holiday_packages (year, holiday_period, curriculum, candidate_levels, starts_at, ends_at)
VALUES 
  (2025, 'december', '8-4-4', ARRAY['Form 4'], '2025-12-01', '2026-01-15'),
  (2025, 'december', 'CBC', ARRAY['Grade 6', 'Grade 9'], '2025-12-01', '2026-01-15'),
  (2025, 'december', 'British Curriculum', ARRAY['Year 9', 'Year 11', 'Year 12', 'Year 13'], '2025-12-01', '2026-01-15'),
  (2025, 'december', 'IB', ARRAY['Year 11 (Pre-IB)', 'Year 12 (IB1)', 'Year 13 (IB2)'], '2025-12-01', '2026-01-15'),
  (2025, 'december', 'American', ARRAY['Grade 12'], '2025-12-01', '2026-01-15')
ON CONFLICT DO NOTHING;