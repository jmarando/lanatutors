-- Create table for general learning plan requests
CREATE TABLE public.general_learning_plan_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  parent_name text NOT NULL,
  parent_email text NOT NULL,
  parent_phone text,
  student_name text NOT NULL,
  grade_level text NOT NULL,
  curriculum text,
  subjects text[] NOT NULL,
  last_exam_performance text,
  challenges text,
  preferred_sessions integer,
  desired_duration_weeks integer,
  available_time_per_week text,
  account_type text DEFAULT 'parent',
  status text DEFAULT 'pending',
  admin_notes text,
  assigned_tutor_id uuid REFERENCES public.tutor_profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.general_learning_plan_requests ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all requests"
ON public.general_learning_plan_requests
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can create requests
CREATE POLICY "Authenticated users can create requests"
ON public.general_learning_plan_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = parent_id);

-- Users can view their own requests
CREATE POLICY "Users can view own requests"
ON public.general_learning_plan_requests
FOR SELECT
TO authenticated
USING (auth.uid() = parent_id);

-- Create trigger for updated_at
CREATE TRIGGER update_general_learning_plan_requests_updated_at
BEFORE UPDATE ON public.general_learning_plan_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();