-- Create communication_logs table for tracking all admin communications
CREATE TABLE public.communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  tutor_id UUID REFERENCES tutor_profiles(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'phone_call', 'sms', 'note')),
  direction TEXT DEFAULT 'outbound' CHECK (direction IN ('outbound', 'inbound')),
  subject TEXT,
  content TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'draft')),
  sent_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  related_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  related_consultation_id UUID REFERENCES consultation_bookings(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access (admins can read/write all logs)
CREATE POLICY "Admins can manage all communication logs"
ON public.communication_logs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.account_type = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.account_type = 'admin'
  )
);

-- Create indexes for common queries
CREATE INDEX idx_communication_logs_parent_id ON public.communication_logs(parent_id);
CREATE INDEX idx_communication_logs_student_id ON public.communication_logs(student_id);
CREATE INDEX idx_communication_logs_tutor_id ON public.communication_logs(tutor_id);
CREATE INDEX idx_communication_logs_created_at ON public.communication_logs(created_at DESC);

-- Add booking_source column to bookings table to track where bookings came from
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_source TEXT DEFAULT 'online' CHECK (booking_source IN ('online', 'manual', 'phone', 'whatsapp'));