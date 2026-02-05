-- member_since: earliest active membership start (from WooCommerce Memberships CSV).
-- membership_expiration: latest active membership end (from WooCommerce Memberships CSV).

alter table public.profiles
  add column if not exists member_since date,
  add column if not exists membership_expiration date;

comment on column public.profiles.member_since is 'Earliest start date among active WooCommerce memberships (synced from CSV).';
comment on column public.profiles.membership_expiration is 'Latest expiration date among active WooCommerce memberships (synced from CSV).';
