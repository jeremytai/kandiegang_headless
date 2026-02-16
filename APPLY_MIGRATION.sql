-- Quick Migration: Add Customer Analytics Fields
-- Run this in Supabase Dashboard > SQL Editor

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS order_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lifetime_value DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS last_order_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS customer_since TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS avg_order_value DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS primary_acquisition_source TEXT,
ADD COLUMN IF NOT EXISTS primary_device TEXT,
ADD COLUMN IF NOT EXISTS accepts_marketing BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subscriber_source TEXT,
ADD COLUMN IF NOT EXISTS wp_username TEXT,
ADD COLUMN IF NOT EXISTS wp_registered TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS member_areas TEXT[],
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS shipping_phone TEXT,
ADD COLUMN IF NOT EXISTS billing_phone TEXT,
ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT,
ADD COLUMN IF NOT EXISTS avg_session_pages DECIMAL(4,1),
ADD COLUMN IF NOT EXISTS avg_session_count DECIMAL(4,1),
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS order_history JSONB;

-- Create essential indexes
CREATE INDEX IF NOT EXISTS idx_profiles_lifetime_value ON profiles(lifetime_value DESC) WHERE lifetime_value > 0;
CREATE INDEX IF NOT EXISTS idx_profiles_accepts_marketing ON profiles(accepts_marketing) WHERE accepts_marketing = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_member_areas ON profiles USING GIN(member_areas) WHERE member_areas IS NOT NULL;
