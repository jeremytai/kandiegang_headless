-- Guide ride planning migration
-- Adds:
-- 1) coordinator-verified FLINTA priority field on profiles
-- 2) weekly guide ride plans + per-guide assignment/proposal records

alter table public.profiles
  add column if not exists guide_flinta_priority boolean not null default false,
  add column if not exists guide_is_coordinator boolean not null default false;

create table if not exists public.guide_ride_plans (
  id uuid primary key default gen_random_uuid(),
  week_start_date date not null unique,
  status text not null default 'draft' check (status in ('draft', 'finalized', 'published')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  finalized_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guide_ride_assignments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.guide_ride_plans(id) on delete cascade,
  ride_date date not null,
  ride_level text not null check (ride_level in ('2', '2+', '3')),
  guide_profile_id uuid not null references public.profiles(id) on delete cascade,
  decision_status text not null default 'proposed' check (decision_status in ('proposed', 'assigned', 'standby', 'unavailable')),
  source text not null default 'in_window' check (source in ('in_window', 'late')),
  submitted_at timestamptz not null default now(),
  override_reason text,
  is_sick_leave boolean not null default false,
  sick_note text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists guide_ride_assignments_unique_claim
  on public.guide_ride_assignments (plan_id, ride_date, ride_level, guide_profile_id);

create index if not exists guide_ride_assignments_plan_date_idx
  on public.guide_ride_assignments (plan_id, ride_date, ride_level);

create index if not exists guide_ride_assignments_guide_idx
  on public.guide_ride_assignments (guide_profile_id, decision_status);

alter table public.guide_ride_plans enable row level security;
alter table public.guide_ride_assignments enable row level security;

drop policy if exists guide_ride_plans_read_for_guides on public.guide_ride_plans;
create policy guide_ride_plans_read_for_guides
  on public.guide_ride_plans
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_guide = true
    )
  );

drop policy if exists guide_ride_assignments_read_for_guides on public.guide_ride_assignments;
create policy guide_ride_assignments_read_for_guides
  on public.guide_ride_assignments
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_guide = true
    )
  );

drop policy if exists guide_ride_assignments_insert_own on public.guide_ride_assignments;
create policy guide_ride_assignments_insert_own
  on public.guide_ride_assignments
  for insert
  to authenticated
  with check (
    guide_profile_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_guide = true
    )
  );

drop policy if exists guide_ride_assignments_update_own on public.guide_ride_assignments;
create policy guide_ride_assignments_update_own
  on public.guide_ride_assignments
  for update
  to authenticated
  using (guide_profile_id = auth.uid())
  with check (guide_profile_id = auth.uid());
