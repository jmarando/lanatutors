-- Create pricing tiers table
CREATE TABLE public.tutor_pricing_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id UUID NOT NULL REFERENCES public.tutor_profiles(id) ON DELETE CASCADE,
  tier_name TEXT NOT NULL CHECK (tier_name IN ('standard', 'advanced')),
  online_hourly_rate NUMERIC NOT NULL CHECK (online_hourly_rate > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tutor_id, tier_name)
);

-- Create curriculum-level tier assignments table
CREATE TABLE public.curriculum_level_tier_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id UUID NOT NULL REFERENCES public.tutor_profiles(id) ON DELETE CASCADE,
  curriculum TEXT NOT NULL,
  level TEXT NOT NULL,
  tier_id UUID NOT NULL REFERENCES public.tutor_pricing_tiers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tutor_id, curriculum, level)
);

-- Enable RLS
ALTER TABLE public.tutor_pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_level_tier_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tutor_pricing_tiers
CREATE POLICY "Tutors can manage their own pricing tiers"
  ON public.tutor_pricing_tiers
  FOR ALL
  USING (
    tutor_id IN (
      SELECT id FROM tutor_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view pricing tiers for verified tutors"
  ON public.tutor_pricing_tiers
  FOR SELECT
  USING (
    tutor_id IN (
      SELECT id FROM tutor_profiles WHERE verified = true
    )
  );

-- RLS Policies for curriculum_level_tier_assignments
CREATE POLICY "Tutors can manage their own tier assignments"
  ON public.curriculum_level_tier_assignments
  FOR ALL
  USING (
    tutor_id IN (
      SELECT id FROM tutor_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view tier assignments for verified tutors"
  ON public.curriculum_level_tier_assignments
  FOR SELECT
  USING (
    tutor_id IN (
      SELECT id FROM tutor_profiles WHERE verified = true
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER update_tutor_pricing_tiers_updated_at
  BEFORE UPDATE ON public.tutor_pricing_tiers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();