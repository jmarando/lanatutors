-- Delete existing generic Mathematics classes for A-Level and IGCSE
DELETE FROM intensive_classes 
WHERE subject = 'Mathematics' 
AND curriculum IN ('A-Level', 'IGCSE')
AND program_id = '49be93a0-21fb-4440-936a-3c0d6276c870';

-- Insert A-Level Pure Mathematics classes
INSERT INTO intensive_classes (program_id, subject, curriculum, grade_levels, time_slot, max_students, status)
VALUES 
  ('49be93a0-21fb-4440-936a-3c0d6276c870', 'Pure Mathematics', 'A-Level', ARRAY['Year 12'], '8:00 - 9:15 AM', 10, 'active'),
  ('49be93a0-21fb-4440-936a-3c0d6276c870', 'Pure Mathematics', 'A-Level', ARRAY['Year 13'], '8:00 - 9:15 AM', 10, 'active');

-- Insert A-Level Statistics classes
INSERT INTO intensive_classes (program_id, subject, curriculum, grade_levels, time_slot, max_students, status)
VALUES 
  ('49be93a0-21fb-4440-936a-3c0d6276c870', 'Statistics', 'A-Level', ARRAY['Year 12'], '9:30 - 10:45 AM', 10, 'active'),
  ('49be93a0-21fb-4440-936a-3c0d6276c870', 'Statistics', 'A-Level', ARRAY['Year 13'], '9:30 - 10:45 AM', 10, 'active');

-- Insert A-Level Mechanics classes
INSERT INTO intensive_classes (program_id, subject, curriculum, grade_levels, time_slot, max_students, status)
VALUES 
  ('49be93a0-21fb-4440-936a-3c0d6276c870', 'Mechanics', 'A-Level', ARRAY['Year 12'], '11:00 AM - 12:15 PM', 10, 'active'),
  ('49be93a0-21fb-4440-936a-3c0d6276c870', 'Mechanics', 'A-Level', ARRAY['Year 13'], '11:00 AM - 12:15 PM', 10, 'active');

-- Insert IGCSE Core Mathematics classes
INSERT INTO intensive_classes (program_id, subject, curriculum, grade_levels, time_slot, max_students, status)
VALUES 
  ('49be93a0-21fb-4440-936a-3c0d6276c870', 'Core Mathematics', 'IGCSE', ARRAY['Year 10'], '8:00 - 9:15 AM', 10, 'active'),
  ('49be93a0-21fb-4440-936a-3c0d6276c870', 'Core Mathematics', 'IGCSE', ARRAY['Year 11'], '8:00 - 9:15 AM', 10, 'active');

-- Insert IGCSE Extended Mathematics classes
INSERT INTO intensive_classes (program_id, subject, curriculum, grade_levels, time_slot, max_students, status)
VALUES 
  ('49be93a0-21fb-4440-936a-3c0d6276c870', 'Extended Mathematics', 'IGCSE', ARRAY['Year 10'], '8:00 - 9:15 AM', 10, 'active'),
  ('49be93a0-21fb-4440-936a-3c0d6276c870', 'Extended Mathematics', 'IGCSE', ARRAY['Year 11'], '8:00 - 9:15 AM', 10, 'active');