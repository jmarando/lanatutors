-- Relax legacy tier_name constraint now that tiers are per curriculum-level
ALTER TABLE public.tutor_pricing_tiers
  DROP CONSTRAINT IF EXISTS tutor_pricing_tiers_tier_name_check;

-- Optional: enforce non-empty tier_name
ALTER TABLE public.tutor_pricing_tiers
  ADD CONSTRAINT tutor_pricing_tiers_tier_name_check CHECK (char_length(tier_name) > 0);