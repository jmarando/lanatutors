-- Add Google Calendar OAuth fields to tutor_profiles
ALTER TABLE tutor_profiles 
ADD COLUMN google_calendar_connected BOOLEAN DEFAULT false,
ADD COLUMN google_oauth_token TEXT,
ADD COLUMN google_refresh_token TEXT,
ADD COLUMN google_token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN calendar_sync_enabled BOOLEAN DEFAULT false,
ADD COLUMN google_calendar_email TEXT;