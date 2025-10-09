-- Create tutor_reviews table
CREATE TABLE public.tutor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID REFERENCES public.tutor_profiles(id) ON DELETE CASCADE NOT NULL,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_moderated BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT true,
  moderation_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (booking_id, student_id)
);

-- Enable RLS on reviews
ALTER TABLE public.tutor_reviews ENABLE ROW LEVEL SECURITY;

-- Reviews RLS policies
CREATE POLICY "Anyone can view approved reviews"
  ON public.tutor_reviews
  FOR SELECT
  USING (is_approved = true);

CREATE POLICY "Students can create reviews for their bookings"
  ON public.tutor_reviews
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can view their own reviews"
  ON public.tutor_reviews
  FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Admins can view all reviews"
  ON public.tutor_reviews
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reviews"
  ON public.tutor_reviews
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to update tutor rating when reviews are added/updated
CREATE OR REPLACE FUNCTION update_tutor_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tutor_profiles
  SET 
    rating = (
      SELECT AVG(rating)::numeric(3,2)
      FROM tutor_reviews
      WHERE tutor_id = COALESCE(NEW.tutor_id, OLD.tutor_id)
        AND is_approved = true
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM tutor_reviews
      WHERE tutor_id = COALESCE(NEW.tutor_id, OLD.tutor_id)
        AND is_approved = true
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.tutor_id, OLD.tutor_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_tutor_rating_on_review
  AFTER INSERT OR UPDATE OR DELETE ON public.tutor_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_tutor_rating();

-- Update updated_at trigger for reviews
CREATE TRIGGER update_tutor_reviews_updated_at
  BEFORE UPDATE ON public.tutor_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();