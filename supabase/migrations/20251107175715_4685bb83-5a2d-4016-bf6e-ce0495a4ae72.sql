-- Add slug column to tutor_profiles for custom URLs
ALTER TABLE public.tutor_profiles 
ADD COLUMN profile_slug text;

-- Add unique constraint to ensure no duplicate slugs
ALTER TABLE public.tutor_profiles
ADD CONSTRAINT tutor_profiles_profile_slug_unique UNIQUE (profile_slug);

-- Create function to generate slug from name
CREATE OR REPLACE FUNCTION public.generate_tutor_slug(full_name text, tutor_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Convert name to lowercase, replace spaces with hyphens, remove special chars
  base_slug := lower(regexp_replace(full_name, '[^a-zA-Z0-9\s-]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  final_slug := base_slug;
  
  -- Check for duplicates and append number if needed
  WHILE EXISTS (
    SELECT 1 FROM tutor_profiles 
    WHERE profile_slug = final_slug 
    AND id != tutor_id
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter::text;
  END LOOP;
  
  RETURN final_slug;
END;
$$;