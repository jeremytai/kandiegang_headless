-- Discord OAuth: store Discord id, username, and avatar on profiles.
-- Synced from auth user after Discord sign-in/link via client.

alter table public.profiles
  add column if not exists discord_id text,
  add column if not exists username text,
  add column if not exists avatar_url text;

comment on column public.profiles.discord_id is 'Discord user id (snowflake) from OAuth identity';
comment on column public.profiles.username is 'Display name from Discord (or other provider)';
comment on column public.profiles.avatar_url is 'Avatar URL from Discord (or other provider)';
