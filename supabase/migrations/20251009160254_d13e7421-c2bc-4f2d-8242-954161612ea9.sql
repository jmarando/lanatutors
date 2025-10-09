-- Add more detailed fields for education and experience
ALTER TABLE tutor_profiles
ADD COLUMN IF NOT EXISTS graduation_year integer,
ADD COLUMN IF NOT EXISTS teaching_experience jsonb, -- [{institution: "Starehe Boys", years: 5, role: "Mathematics Teacher"}, ...]
ADD COLUMN IF NOT EXISTS tutoring_experience text; -- Overall tutoring experience description