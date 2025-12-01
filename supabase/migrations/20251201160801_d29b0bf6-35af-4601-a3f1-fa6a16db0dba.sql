-- Add session_topics JSONB column to intensive_classes table for day-by-day topic breakdowns
-- Format: {"day_1": "Topic for session 1", "day_2": "Topic for session 2", ..., "day_10": "Topic for session 10"}
ALTER TABLE intensive_classes 
ADD COLUMN IF NOT EXISTS session_topics jsonb DEFAULT '{}'::jsonb;