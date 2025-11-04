-- Create table for central calendar configuration
CREATE TABLE IF NOT EXISTS public.central_calendar_config (
  id TEXT PRIMARY KEY DEFAULT 'central-calendar',
  google_oauth_token TEXT,
  google_refresh_token TEXT,
  google_token_expires_at TIMESTAMPTZ,
  google_email TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.central_calendar_config ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write (we'll keep it simple for now - no policies means only service role can access)
-- This is secure because only edge functions with service role key can access this table