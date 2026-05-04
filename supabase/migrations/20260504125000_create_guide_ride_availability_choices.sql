-- Persist per-guide Tuesday availability choices used by the picker UI.
-- This supports both level choices and non-guiding states.

create table if not exists public.guide_ride_availability (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.guide_ride_plans(id) on delete cascade,
  ride_date date not null,
  guide_profile_id uuid not null references public.profiles(id) on delete cascade,
  choice text not null check (choice in ('level2', 'level2plus', 'level3', 'participant', 'no_time', 'injured')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists guide_ride_availability_unique_guide_day
  on public.guide_ride_availability (plan_id, ride_date, guide_profile_id);

create index if not exists guide_ride_availability_plan_date_idx
  on public.guide_ride_availability (plan_id, ride_date);

alter table public.guide_ride_availability enable row level security;

drop policy if exists guide_ride_availability_read_for_guides on public.guide_ride_availability;
create policy guide_ride_availability_read_for_guides
  on public.guide_ride_availability
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_guide = true
    )
  );

drop policy if exists guide_ride_availability_insert_own on public.guide_ride_availability;
create policy guide_ride_availability_insert_own
  on public.guide_ride_availability
  for insert
  to authenticated
  with check (
    guide_profile_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_guide = true
    )
  );

drop policy if exists guide_ride_availability_update_own on public.guide_ride_availability;
create policy guide_ride_availability_update_own
  on public.guide_ride_availability
  for update
  to authenticated
  using (guide_profile_id = auth.uid())
  with check (guide_profile_id = auth.uid());
