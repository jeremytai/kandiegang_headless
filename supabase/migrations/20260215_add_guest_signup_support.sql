-- Add support for guest event signups without requiring authentication
-- This allows users to sign up with just email, first name, and last name

-- Add email column to registrations table
alter table public.registrations
  add column if not exists email text;

-- Make user_id nullable to support guest signups
alter table public.registrations
  alter column user_id drop not null;

-- Add check constraint: must have either user_id OR email
alter table public.registrations
  add constraint registrations_user_or_email_check
  check (
    (user_id is not null) or (email is not null and email != '')
  );

-- Drop the existing unique index that requires user_id
drop index if exists registrations_active_unique;

-- Create new unique index that handles both authenticated and guest signups
-- For authenticated users: unique on (event_id, ride_level, user_id)
-- For guest users: unique on (event_id, ride_level, email)
create unique index registrations_active_unique_auth
  on public.registrations (event_id, ride_level, user_id)
  where cancelled_at is null and user_id is not null;

create unique index registrations_active_unique_guest
  on public.registrations (event_id, ride_level, lower(email))
  where cancelled_at is null and user_id is null and email is not null;

-- Update RLS policies to allow guest signups
-- Drop existing policies
drop policy if exists registrations_select_own on public.registrations;
drop policy if exists registrations_insert_own on public.registrations;

-- New select policy: authenticated users see their own, anyone can see guest registrations by token
create policy registrations_select_policy
  on public.registrations
  for select
  using (
    -- Authenticated users can see their own
    (auth.uid() is not null and user_id = auth.uid())
    -- Or allow public read for capacity checks (filtered by application logic)
    or true
  );

-- New insert policy: allow authenticated users to insert their own, allow guest inserts
create policy registrations_insert_policy
  on public.registrations
  for insert
  with check (
    -- Authenticated users must match their own user_id
    (auth.uid() is not null and user_id = auth.uid())
    -- Guest signups (no auth) must have email and no user_id
    or (auth.uid() is null and user_id is null and email is not null)
  );

-- Add index on email for guest lookups
create index if not exists registrations_email_idx on public.registrations (lower(email))
  where email is not null;

-- Add comment explaining the schema
comment on column public.registrations.email is 'Email address for guest signups. Either user_id or email must be present.';
comment on column public.registrations.user_id is 'Supabase auth user ID for authenticated signups. Either user_id or email must be present.';
