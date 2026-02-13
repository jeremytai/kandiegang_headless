-- Create registrations table for event signups and waitlists.
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id integer not null,
  user_id uuid not null,
  ride_level text not null,
  event_type text not null default 'ride',
  first_name text not null,
  last_name text not null,
  is_waitlist boolean not null default false,
  waitlist_joined_at timestamptz,
  waitlist_promoted_at timestamptz,
  cancel_token_hash text not null,
  cancel_token_issued_at timestamptz not null default now(),
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists registrations_event_id_idx on public.registrations (event_id);
create index if not exists registrations_event_level_idx on public.registrations (event_id, ride_level);
create index if not exists registrations_event_level_active_idx on public.registrations (event_id, ride_level, is_waitlist, cancelled_at);
create index if not exists registrations_cancel_token_idx on public.registrations (cancel_token_hash);

alter table public.registrations
  add constraint registrations_cancel_token_unique unique (cancel_token_hash);

create unique index if not exists registrations_active_unique
  on public.registrations (event_id, ride_level, user_id)
  where cancelled_at is null;

alter table public.registrations enable row level security;

create policy registrations_select_own
  on public.registrations
  for select
  to authenticated
  using (user_id = auth.uid());

create policy registrations_insert_own
  on public.registrations
  for insert
  to authenticated
  with check (user_id = auth.uid());
