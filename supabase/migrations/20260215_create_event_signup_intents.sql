-- Migration for event_signup_intents table
CREATE TABLE IF NOT EXISTS event_signup_intents (
  id SERIAL PRIMARY KEY,
  token VARCHAR(64) UNIQUE NOT NULL,
  intent JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Add index for quick lookup
CREATE INDEX IF NOT EXISTS idx_event_signup_intents_token ON event_signup_intents(token);
