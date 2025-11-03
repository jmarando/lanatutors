-- Add package type enum
CREATE TYPE package_type AS ENUM (
  'single_subject',
  'multi_subject', 
  'multi_child',
  'exam_prep',
  'custom'
);

-- Add new columns to package_offers table
ALTER TABLE package_offers
ADD COLUMN package_type package_type DEFAULT 'single_subject',
ADD COLUMN subjects text[] DEFAULT NULL,
ADD COLUMN max_students integer DEFAULT 1,
ADD COLUMN curriculum text[] DEFAULT NULL,
ADD COLUMN exam_type text DEFAULT NULL,
ADD COLUMN is_featured boolean DEFAULT false;

-- Create package recommendations table to track AI-suggested packages
CREATE TABLE package_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_booking_id uuid REFERENCES consultation_bookings(id),
  assessment_id uuid REFERENCES learning_assessments(id),
  recommended_packages jsonb NOT NULL DEFAULT '[]'::jsonb,
  reasoning text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE package_recommendations ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view package recommendations for their consultations/assessments
CREATE POLICY "Users can view own package recommendations via consultation"
ON package_recommendations FOR SELECT
USING (
  consultation_booking_id IN (
    SELECT id FROM consultation_bookings 
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can view own package recommendations via assessment"
ON package_recommendations FOR SELECT
USING (
  assessment_id IN (
    SELECT id FROM learning_assessments 
    WHERE student_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Create expert consultation requests table
CREATE TABLE expert_consultation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_name text NOT NULL,
  email text NOT NULL,
  phone_number text NOT NULL,
  number_of_children integer NOT NULL,
  subjects_of_interest text[] NOT NULL,
  grade_levels text[] NOT NULL,
  package_preferences text,
  preferred_contact_time text,
  additional_notes text,
  status text DEFAULT 'pending',
  assigned_expert_id uuid,
  scheduled_call_time timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE expert_consultation_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit expert consultation requests
CREATE POLICY "Anyone can create expert consultation requests"
ON expert_consultation_requests FOR INSERT
WITH CHECK (true);

-- Admins can view all requests
CREATE POLICY "Admins can view all expert consultation requests"
ON expert_consultation_requests FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Users can view their own requests
CREATE POLICY "Users can view own expert consultation requests"
ON expert_consultation_requests FOR SELECT
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Update triggers
CREATE TRIGGER update_package_recommendations_updated_at
BEFORE UPDATE ON package_recommendations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expert_consultation_requests_updated_at
BEFORE UPDATE ON expert_consultation_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();