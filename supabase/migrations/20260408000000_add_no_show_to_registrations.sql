ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS no_show_at TIMESTAMPTZ;

COMMENT ON COLUMN public.registrations.no_show_at IS
  'Set by guides/admins when a confirmed participant did not show up and did not cancel. Distinct from cancelled_at — does not trigger waitlist promotion.';

CREATE INDEX IF NOT EXISTS registrations_no_show_idx
  ON public.registrations(event_id, no_show_at)
  WHERE no_show_at IS NOT NULL;
