ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

COMMENT ON COLUMN public.registrations.checked_in_at IS
  'Set by guides on event day when a participant is present. Used with no_show_at to track attendance.';

CREATE INDEX IF NOT EXISTS registrations_checked_in_idx
  ON public.registrations(event_id, ride_level, checked_in_at)
  WHERE checked_in_at IS NOT NULL;

