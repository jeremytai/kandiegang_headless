-- Migration: Create ride_level_cancellations table
-- Date: 2026-02-23
-- Description: Track guide-initiated ride level cancellations for events

CREATE TABLE IF NOT EXISTS public.ride_level_cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id INTEGER NOT NULL,
  ride_level TEXT NOT NULL,
  cancelled_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  cancelled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, ride_level)
);

-- Index for fast lookup by event
CREATE INDEX IF NOT EXISTS ride_level_cancellations_event_idx
  ON public.ride_level_cancellations(event_id);

-- Enable RLS
ALTER TABLE public.ride_level_cancellations ENABLE ROW LEVEL SECURITY;

-- Allow anyone (authenticated or anon) to read cancellations — it's public info
CREATE POLICY ride_level_cancellations_select
  ON public.ride_level_cancellations
  FOR SELECT
  TO public
  USING (true);

-- INSERT and UPDATE are handled exclusively via service role key (API), so no user policies needed.

COMMENT ON TABLE public.ride_level_cancellations IS
  'Records guide-initiated cancellations of a specific ride level within an event. One record per (event_id, ride_level).';
