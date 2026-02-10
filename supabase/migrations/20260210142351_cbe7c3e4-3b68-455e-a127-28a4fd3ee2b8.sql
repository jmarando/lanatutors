
-- Add target_class to announcements (null = all school, value = specific class)
ALTER TABLE public.school_announcements 
ADD COLUMN target_class text DEFAULT NULL;

-- Add a comment for clarity
COMMENT ON COLUMN public.school_announcements.target_class IS 'If set, announcement only visible to parents of students in this class. NULL = school-wide.';
