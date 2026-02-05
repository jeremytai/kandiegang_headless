-- Store active membership plan names per user (from WooCommerce Memberships CSV sync).
-- e.g. {"Kandie Gang Cycling Club Membership", "Kandie Gang Guides"}.

alter table public.profiles
  add column if not exists membership_plans text[] default '{}';

comment on column public.profiles.membership_plans is 'Active WooCommerce membership plan names for this user (synced from CSV).';
