-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('student', 'tutor', 'admin');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Update profiles table to add student-specific fields
ALTER TABLE public.profiles
ADD COLUMN age INTEGER,
ADD COLUMN grade_level TEXT,
ADD COLUMN subjects_struggling TEXT[],
ADD COLUMN learning_goals TEXT,
ADD COLUMN preferred_learning_style TEXT;

-- Create tutor_profiles table for tutor-specific information
CREATE TABLE public.tutor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  subjects TEXT[] NOT NULL,
  hourly_rate NUMERIC NOT NULL,
  experience_years INTEGER,
  bio TEXT,
  qualifications TEXT[],
  availability TEXT,
  rating NUMERIC DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tutor_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for tutor_profiles
CREATE POLICY "Anyone can view verified tutors"
ON public.tutor_profiles
FOR SELECT
USING (verified = true);

CREATE POLICY "Tutors can view own profile"
ON public.tutor_profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Tutors can update own profile"
ON public.tutor_profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_tutor_profiles_updated_at
BEFORE UPDATE ON public.tutor_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();