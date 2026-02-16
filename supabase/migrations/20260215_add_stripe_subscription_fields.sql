-- Migration: Add Stripe Subscription Fields to Profiles Table
-- Created: 2026-02-15
-- Purpose: Enable tracking of Stripe subscription state in Supabase for membership billing

-- Add Stripe subscription tracking columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS billing_cycle_anchor TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;

-- Create indexes for fast lookups by Stripe IDs
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
ON profiles(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id
ON profiles(stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;

-- Create index for subscription status queries (e.g., finding all active/past_due subs)
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_status
ON profiles(stripe_subscription_status)
WHERE stripe_subscription_status IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN profiles.stripe_customer_id IS 'Stripe Customer ID - links this profile to a Stripe customer record';
COMMENT ON COLUMN profiles.stripe_subscription_id IS 'Stripe Subscription ID - the active subscription for this member';
COMMENT ON COLUMN profiles.stripe_subscription_status IS 'Current Stripe subscription status: active, trialing, past_due, canceled, etc.';
COMMENT ON COLUMN profiles.stripe_price_id IS 'Stripe Price ID - which membership tier/price this subscription uses';
COMMENT ON COLUMN profiles.billing_cycle_anchor IS 'Original renewal date from WooCommerce - preserved during migration';
COMMENT ON COLUMN profiles.subscription_cancel_at_period_end IS 'Whether member has requested cancellation at period end';
COMMENT ON COLUMN profiles.subscription_current_period_end IS 'When the current billing period ends - used to determine access';
