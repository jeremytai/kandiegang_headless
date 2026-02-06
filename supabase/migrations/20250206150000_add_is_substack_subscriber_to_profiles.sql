-- Sync Substack subscriber status from CSV export (Dashboard > Subscribers > Export).
-- Script scripts/sync-substack-subscribers-to-profiles.js sets this from the export.

alter table public.profiles
  add column if not exists is_substack_subscriber boolean not null default false;

comment on column public.profiles.is_substack_subscriber is 'True when email matches a Substack export (synced via sync-substack-subscribers-to-profiles.js).';
