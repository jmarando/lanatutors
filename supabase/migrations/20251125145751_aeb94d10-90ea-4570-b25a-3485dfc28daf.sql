-- Create tutor_inquiries table for learning plan requests
CREATE TABLE IF NOT EXISTS public.tutor_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  parent_name TEXT NOT NULL,
  parent_email TEXT NOT NULL,
  parent_phone TEXT,
  student_name TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  curriculum TEXT,
  subjects_needed TEXT[] NOT NULL,
  current_challenges TEXT,
  preferred_sessions INTEGER DEFAULT 0,
  preferred_contact TEXT DEFAULT 'email',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'plan_created', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create learning_plans table for tutor-created custom quotes
CREATE TABLE IF NOT EXISTS public.learning_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
  inquiry_id UUID REFERENCES tutor_inquiries(id) ON DELETE SET NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subjects JSONB NOT NULL DEFAULT '[]',
  total_sessions INTEGER NOT NULL,
  total_price NUMERIC NOT NULL,
  discount_applied NUMERIC DEFAULT 0,
  validity_days INTEGER DEFAULT 90,
  notes TEXT,
  status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'paid', 'expired', 'declined')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tutor_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tutor_inquiries
CREATE POLICY "Anyone can create inquiry"
  ON public.tutor_inquiries FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Parents can view own inquiries"
  ON public.tutor_inquiries FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid() OR parent_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Tutors can view their inquiries"
  ON public.tutor_inquiries FOR SELECT
  TO authenticated
  USING (tutor_id IN (SELECT id FROM tutor_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Tutors can update their inquiries"
  ON public.tutor_inquiries FOR UPDATE
  TO authenticated
  USING (tutor_id IN (SELECT id FROM tutor_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all inquiries"
  ON public.tutor_inquiries FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for learning_plans
CREATE POLICY "Tutors can create learning plans"
  ON public.learning_plans FOR INSERT
  TO authenticated
  WITH CHECK (tutor_id IN (SELECT id FROM tutor_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Tutors can view their learning plans"
  ON public.learning_plans FOR SELECT
  TO authenticated
  USING (tutor_id IN (SELECT id FROM tutor_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can view their learning plans"
  ON public.learning_plans FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Tutors can update their learning plans"
  ON public.learning_plans FOR UPDATE
  TO authenticated
  USING (tutor_id IN (SELECT id FROM tutor_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can update plan status"
  ON public.learning_plans FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid() AND status IN ('accepted', 'declined'));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tutor_inquiries_tutor_id ON public.tutor_inquiries(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_inquiries_parent_id ON public.tutor_inquiries(parent_id);
CREATE INDEX IF NOT EXISTS idx_tutor_inquiries_status ON public.tutor_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_learning_plans_tutor_id ON public.learning_plans(tutor_id);
CREATE INDEX IF NOT EXISTS idx_learning_plans_student_id ON public.learning_plans(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_plans_inquiry_id ON public.learning_plans(inquiry_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tutor_inquiries_updated_at
  BEFORE UPDATE ON public.tutor_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_plans_updated_at
  BEFORE UPDATE ON public.learning_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();