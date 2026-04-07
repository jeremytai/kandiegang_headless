ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.registrations.reminder_sent_at IS
  'Set when the 24-hour event reminder email has been sent. Used to prevent duplicate sends.';

CREATE INDEX IF NOT EXISTS registrations_reminder_idx
  ON public.registrations(event_id, reminder_sent_at)
  WHERE reminder_sent_at IS NULL AND cancelled_at IS NULL AND is_waitlist = false;
