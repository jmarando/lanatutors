-- Add url_slug column for prettier URLs
ALTER TABLE public.learning_plans 
ADD COLUMN url_slug TEXT UNIQUE;

-- Create an index for faster lookups
CREATE INDEX idx_learning_plans_url_slug ON public.learning_plans(url_slug);

-- Backfill existing plans with slugs based on title
UPDATE public.learning_plans
SET url_slug = LOWER(REGEXP_REPLACE(
  REGEXP_REPLACE(title, '[^a-zA-Z0-9\s-]', '', 'g'),
  '\s+', '-', 'g'
)) || '-' || SUBSTRING(share_token::text, 1, 8)
WHERE url_slug IS NULL;