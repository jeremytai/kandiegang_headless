-- Migration: Add Customer Analytics Fields for Dashboard
-- Created: 2026-02-15
-- Purpose: Store comprehensive customer data for internal analytics dashboard

-- Add customer analytics fields to profiles table
ALTER TABLE profiles
-- Order metrics (for analytics dashboard)
ADD COLUMN IF NOT EXISTS order_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lifetime_value DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS last_order_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS customer_since TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS avg_order_value DECIMAL(10,2) DEFAULT 0.00,

-- Marketing & Attribution
ADD COLUMN IF NOT EXISTS primary_acquisition_source TEXT, -- organic, referral, direct, social, typein
ADD COLUMN IF NOT EXISTS primary_device TEXT, -- Mobile, Desktop, Tablet
ADD COLUMN IF NOT EXISTS accepts_marketing BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subscriber_source TEXT, -- How they subscribed (Organic - Checkout, etc.)

-- WordPress legacy data
ADD COLUMN IF NOT EXISTS wp_username TEXT,
ADD COLUMN IF NOT EXISTS wp_registered TIMESTAMPTZ,

-- Member areas & tags
ADD COLUMN IF NOT EXISTS member_areas TEXT[], -- Array of membership areas
ADD COLUMN IF NOT EXISTS tags TEXT[], -- Customer tags for segmentation

-- Contact preferences
ADD COLUMN IF NOT EXISTS shipping_phone TEXT,
ADD COLUMN IF NOT EXISTS billing_phone TEXT,
ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT, -- email, phone, sms

-- Engagement metrics (for dashboard analytics)
ADD COLUMN IF NOT EXISTS avg_session_pages DECIMAL(4,1), -- Pages viewed per session before purchase
ADD COLUMN IF NOT EXISTS avg_session_count DECIMAL(4,1), -- Number of sessions before first purchase
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ,

-- JSON field for detailed order history (for dashboard)
ADD COLUMN IF NOT EXISTS order_history JSONB;

-- Create indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_profiles_lifetime_value
ON profiles(lifetime_value DESC)
WHERE lifetime_value > 0;

CREATE INDEX IF NOT EXISTS idx_profiles_order_count
ON profiles(order_count DESC)
WHERE order_count > 0;

CREATE INDEX IF NOT EXISTS idx_profiles_last_order_date
ON profiles(last_order_date DESC)
WHERE last_order_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_acquisition_source
ON profiles(primary_acquisition_source)
WHERE primary_acquisition_source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_device
ON profiles(primary_device)
WHERE primary_device IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_accepts_marketing
ON profiles(accepts_marketing)
WHERE accepts_marketing = TRUE;

CREATE INDEX IF NOT EXISTS idx_profiles_member_areas
ON profiles USING GIN(member_areas)
WHERE member_areas IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_tags
ON profiles USING GIN(tags)
WHERE tags IS NOT NULL;

-- Index for order history JSONB queries
CREATE INDEX IF NOT EXISTS idx_profiles_order_history
ON profiles USING GIN(order_history)
WHERE order_history IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN profiles.order_count IS 'Total number of completed orders';
COMMENT ON COLUMN profiles.lifetime_value IS 'Total amount spent across all orders (EUR)';
COMMENT ON COLUMN profiles.last_order_date IS 'Date of most recent order';
COMMENT ON COLUMN profiles.customer_since IS 'Date of first order (customer acquisition date)';
COMMENT ON COLUMN profiles.avg_order_value IS 'Average order value (EUR)';

COMMENT ON COLUMN profiles.primary_acquisition_source IS 'Primary marketing channel: organic, referral, direct, social, typein';
COMMENT ON COLUMN profiles.primary_device IS 'Primary device type: Mobile, Desktop, Tablet';
COMMENT ON COLUMN profiles.accepts_marketing IS 'GDPR marketing consent - can we send promotional emails?';
COMMENT ON COLUMN profiles.subscriber_source IS 'How member subscribed (e.g., Organic - Checkout, Referral, etc.)';

COMMENT ON COLUMN profiles.wp_username IS 'WordPress username (user_login) from legacy system';
COMMENT ON COLUMN profiles.wp_registered IS 'WordPress registration date';

COMMENT ON COLUMN profiles.member_areas IS 'Array of membership areas (e.g., ["Kandie Gang Cycling Club", "Guide"])';
COMMENT ON COLUMN profiles.tags IS 'Customer tags for segmentation (e.g., ["VIP", "Early Adopter"])';

COMMENT ON COLUMN profiles.shipping_phone IS 'Preferred shipping phone number';
COMMENT ON COLUMN profiles.billing_phone IS 'Billing phone number';
COMMENT ON COLUMN profiles.preferred_contact_method IS 'Preferred contact method: email, phone, sms';

COMMENT ON COLUMN profiles.avg_session_pages IS 'Average pages viewed per session before purchase';
COMMENT ON COLUMN profiles.avg_session_count IS 'Average number of sessions before first purchase';

COMMENT ON COLUMN profiles.order_history IS 'Detailed order history: [{order_id, date, total, products, status}]';
