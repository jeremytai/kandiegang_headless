-- Add is_member and membership_source to profiles if they're missing.
-- Run in Supabase SQL Editor if your profiles table was created without these columns.

-- Create enum if it doesn't exist (safe to run multiple times)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'membership_source_type') then
    create type public.membership_source_type as enum ('wordpress', 'supabase', 'unknown');
  end if;
end
$$;

-- Add is_member if missing
alter table public.profiles
  add column if not exists is_member boolean not null default false;

-- Add membership_source if missing
alter table public.profiles
  add column if not exists membership_source public.membership_source_type;

comment on column public.profiles.is_member is 'Whether the user has an active membership';
comment on column public.profiles.membership_source is 'Where membership status is sourced: wordpress or supabase';
