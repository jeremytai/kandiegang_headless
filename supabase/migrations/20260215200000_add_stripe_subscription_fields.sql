-- Migration: Add Stripe subscription tracking fields to profiles table
-- This enables tracking Stripe customer and subscription relationships
-- Created: 2026-02-15

-- Add Stripe subscription tracking fields
alter table public.profiles
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text unique,
  add column if not exists stripe_subscription_status text,
  add column if not exists stripe_price_id text,
  add column if not exists billing_cycle_anchor timestamptz,
  add column if not exists subscription_cancel_at_period_end boolean default false,
  add column if not exists subscription_current_period_end timestamptz;

-- Add column comments for documentation
comment on column public.profiles.stripe_customer_id is 'Stripe Customer ID (cus_xxx) for this user';
comment on column public.profiles.stripe_subscription_id is 'Active Stripe Subscription ID (sub_xxx) for membership';
comment on column public.profiles.stripe_subscription_status is 'Stripe subscription status: active, past_due, canceled, incomplete, trialing, etc.';
comment on column public.profiles.stripe_price_id is 'Stripe Price ID (price_xxx) for the active subscription';
comment on column public.profiles.billing_cycle_anchor is 'When the subscription billing cycle is anchored (renewal date)';
comment on column public.profiles.subscription_cancel_at_period_end is 'Whether subscription will cancel at end of period';
comment on column public.profiles.subscription_current_period_end is 'Current subscription period end date';

-- Create indexes for faster lookups by Stripe IDs
create index if not exists idx_profiles_stripe_customer_id on public.profiles(stripe_customer_id);
create index if not exists idx_profiles_stripe_subscription_id on public.profiles(stripe_subscription_id);
create index if not exists idx_profiles_stripe_subscription_status on public.profiles(stripe_subscription_status);
