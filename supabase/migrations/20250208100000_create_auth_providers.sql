-- auth_providers: maps (provider_type, provider_user_id) -> user_id for linked accounts.
-- Used to show connected login methods in settings and enforce one account per provider identity.
create table if not exists public.auth_providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider_type text not null check (provider_type in ('email', 'discord')),
  provider_user_id text not null,
  created_at timestamptz not null default now(),
  unique (provider_type, provider_user_id)
);

create index if not exists idx_auth_providers_user_id on public.auth_providers (user_id);
create index if not exists idx_auth_providers_lookup on public.auth_providers (provider_type, provider_user_id);

comment on table public.auth_providers is 'Linked auth methods per user; one row per (user, provider_type, provider_user_id)';

alter table public.auth_providers enable row level security;

create policy "Users can read own auth_providers"
  on public.auth_providers for select
  using (auth.uid() = user_id);

create policy "Users can insert own auth_providers"
  on public.auth_providers for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own auth_providers"
  on public.auth_providers for delete
  using (auth.uid() = user_id);

create policy "Service role can manage auth_providers"
  on public.auth_providers for all
  using (auth.jwt() ->> 'role' = 'service_role');
