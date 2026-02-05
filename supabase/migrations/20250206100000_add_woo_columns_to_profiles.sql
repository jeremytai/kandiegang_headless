-- Add WooCommerce-derived columns to profiles (from wp_usermeta: billing_*, shipping_*, paying_customer).
-- Run in Supabase SQL Editor, or: supabase db push

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists billing_address_1 text,
  add column if not exists billing_city text,
  add column if not exists billing_postcode text,
  add column if not exists billing_country text,
  add column if not exists billing_phone text,
  add column if not exists paying_customer boolean default false;

comment on column public.profiles.first_name is 'From WooCommerce / usermeta billing_first_name or first_name';
comment on column public.profiles.last_name is 'From WooCommerce / usermeta billing_last_name or last_name';
comment on column public.profiles.paying_customer is 'From WooCommerce usermeta paying_customer';
