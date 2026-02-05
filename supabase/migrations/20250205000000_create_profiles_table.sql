-- profiles table keyed by auth.users.id
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query → paste → Run).

-- 1. Enum for membership source
do $$
begin
  if not exists (select 1 from pg_type where typname = 'membership_source_type') then
    create type public.membership_source_type as enum ('wordpress', 'supabase', 'unknown');
  end if;
end
$$;

-- 2. Table (skip if already exists)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  wp_user_id integer,
  is_member boolean not null default false,
  membership_source public.membership_source_type
);

comment on table public.profiles is 'Extended profile per auth user; id = auth.users.id';
comment on column public.profiles.wp_user_id is 'Legacy WordPress user ID for migrated members';
comment on column public.profiles.is_member is 'Whether the user has an active membership';
comment on column public.profiles.membership_source is 'Where membership status is sourced: wordpress or supabase';

-- 3. Add columns if table existed without them (e.g. created by an older migration)
alter table public.profiles add column if not exists is_member boolean not null default false;
alter table public.profiles add column if not exists membership_source public.membership_source_type;

-- 4. RLS
alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Service role can manage all profiles" on public.profiles;
create policy "Service role can manage all profiles"
  on public.profiles for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- 5. Trigger: auto-create profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 6. Backfill profiles for existing auth users (e.g. you already signed up before this table existed)
insert into public.profiles (id, email, display_name)
select u.id, u.email, coalesce(u.raw_user_meta_data ->> 'display_name', u.raw_user_meta_data ->> 'full_name', split_part(u.email::text, '@', 1))
from auth.users u
on conflict (id) do nothing;
