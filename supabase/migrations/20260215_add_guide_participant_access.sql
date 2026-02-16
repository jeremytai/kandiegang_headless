-- Migration: Add guide access to participant data
-- Date: 2026-02-15
-- Description: Allow guides to read event participants for their assigned events

-- Allow guides to read all event participants
-- The UI will enforce level-specific access by only showing data for assigned levels
create policy registrations_guide_read
  on public.registrations
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.is_guide = true
    )
  );

-- Add index for guide queries (performance optimization)
-- This index helps when guides query participants by event and level
create index if not exists registrations_event_level_display_idx
  on public.registrations(event_id, ride_level, is_waitlist, created_at)
  where cancelled_at is null;

-- Add comment explaining the policy
comment on policy registrations_guide_read on public.registrations is
  'Allows users with is_guide=true to read all event participants. Level-specific access is enforced at the application level.';
