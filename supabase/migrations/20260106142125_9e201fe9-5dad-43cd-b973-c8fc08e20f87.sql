-- Create consultation_notes table for multiple notes per consultation
CREATE TABLE public.consultation_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consultation_id UUID NOT NULL REFERENCES public.consultation_bookings(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.consultation_notes ENABLE ROW LEVEL SECURITY;

-- Policy for admins to manage notes
CREATE POLICY "Admins can manage consultation notes" 
ON public.consultation_notes 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Create index for faster lookups
CREATE INDEX idx_consultation_notes_consultation_id ON public.consultation_notes(consultation_id);

-- Enable realtime for consultation_notes
ALTER PUBLICATION supabase_realtime ADD TABLE public.consultation_notes;