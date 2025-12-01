-- Update existing intensive classes to have max_students = 10
UPDATE intensive_classes SET max_students = 10;

-- Alter the default for future records
ALTER TABLE intensive_classes ALTER COLUMN max_students SET DEFAULT 10;