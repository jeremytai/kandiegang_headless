-- Allow marking a user as Kandie Gang Guide independently of WooCommerce membership plans.
-- Guide can be set manually (Supabase) or synced from WordPress role / CSV later.
-- Display: "Kandie Gang Cycling Member and Kandie Gang Guide" when both apply.

alter table public.profiles
  add column if not exists is_guide boolean not null default false;

comment on column public.profiles.is_guide is 'Whether the user is a Kandie Gang Guide (can be set manually or synced from WP/CSV).';
