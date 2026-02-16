# Customer Dashboard - Available Data

## Overview

After migration, your Supabase `profiles` table will contain comprehensive customer analytics data for building your custom dashboard. This goes far beyond Stripe's metadata limitations.

## Data Available in Supabase

### 🎯 Customer Segmentation

#### Lifetime Value Analysis
```sql
-- Top 10 highest value customers
SELECT display_name, email, lifetime_value, order_count
FROM profiles
WHERE lifetime_value > 0
ORDER BY lifetime_value DESC
LIMIT 10;

-- Average order value by tier
SELECT
  CASE
    WHEN lifetime_value > 200 THEN 'VIP'
    WHEN lifetime_value > 100 THEN 'Regular'
    ELSE 'Occasional'
  END as tier,
  COUNT(*) as customers,
  AVG(lifetime_value) as avg_ltv,
  AVG(order_count) as avg_orders
FROM profiles
GROUP BY tier;
```

#### Marketing Consent
```sql
-- Marketable audience size
SELECT accepts_marketing, COUNT(*) as count
FROM profiles
GROUP BY accepts_marketing;

-- VIP customers who accept marketing
SELECT email, display_name, lifetime_value
FROM profiles
WHERE accepts_marketing = true
  AND lifetime_value > 150
ORDER BY lifetime_value DESC;
```

### 📊 Acquisition & Attribution

#### Primary Sources (when attribution data added)
```sql
-- Customers by acquisition source
SELECT primary_acquisition_source, COUNT(*) as customers
FROM profiles
WHERE primary_acquisition_source IS NOT NULL
GROUP BY primary_acquisition_source
ORDER BY customers DESC;

-- Device preference
SELECT primary_device, COUNT(*) as customers
FROM profiles
GROUP BY primary_device;
```

#### Member Areas & Tags
```sql
-- Members by area
SELECT UNNEST(member_areas) as area, COUNT(*) as members
FROM profiles
WHERE member_areas IS NOT NULL
GROUP BY area;

-- Find members with specific tags
SELECT email, display_name, tags, lifetime_value
FROM profiles
WHERE 'VIP' = ANY(tags);

-- Multi-membership holders
SELECT email, display_name, member_areas, lifetime_value
FROM profiles
WHERE array_length(member_areas, 1) > 1;
```

### 📈 Engagement Metrics

#### Recent Activity
```sql
-- Recently active customers
SELECT email, display_name, last_order_date, order_count
FROM profiles
WHERE last_order_date > NOW() - INTERVAL '90 days'
ORDER BY last_order_date DESC;

-- At-risk customers (no orders in 6+ months)
SELECT email, display_name, last_order_date, lifetime_value
FROM profiles
WHERE last_order_date < NOW() - INTERVAL '6 months'
  AND lifetime_value > 100
ORDER BY lifetime_value DESC;
```

#### Customer Journey
```sql
-- Time from registration to first purchase
SELECT
  AVG(EXTRACT(DAY FROM (customer_since - wp_registered))) as avg_days_to_purchase
FROM profiles
WHERE wp_registered IS NOT NULL
  AND customer_since IS NOT NULL;

-- Session engagement before purchase (when attribution added)
SELECT
  AVG(avg_session_pages) as pages_viewed,
  AVG(avg_session_count) as sessions_before_purchase
FROM profiles
WHERE avg_session_pages IS NOT NULL;
```

### 💰 Revenue Analytics

#### Monthly Recurring Revenue (MRR)
```sql
-- Active subscriptions value
SELECT
  COUNT(*) as active_members,
  SUM(CASE WHEN stripe_price_id = 'price_club' THEN 99 ELSE 0 END) / 12 as monthly_club_revenue,
  SUM(CASE WHEN stripe_price_id = 'price_guide' THEN 99 ELSE 0 END) / 12 as monthly_guide_revenue
FROM profiles
WHERE stripe_subscription_status IN ('active', 'trialing');
```

#### Cohort Analysis
```sql
-- Customers by signup month
SELECT
  DATE_TRUNC('month', wp_registered) as signup_month,
  COUNT(*) as new_customers,
  AVG(lifetime_value) as avg_ltv,
  SUM(lifetime_value) as total_revenue
FROM profiles
WHERE wp_registered IS NOT NULL
GROUP BY signup_month
ORDER BY signup_month DESC;
```

### 👥 Member Demographics

#### Contact Information
```sql
-- Members with complete contact info
SELECT
  email,
  display_name,
  COALESCE(shipping_phone, billing_phone) as phone,
  is_member,
  membership_expiration
FROM profiles
WHERE is_member = true;
```

#### WordPress Legacy Data
```sql
-- Long-time members (registered early)
SELECT
  wp_username,
  display_name,
  wp_registered,
  member_since,
  lifetime_value
FROM profiles
WHERE wp_registered < '2024-01-01'
ORDER BY wp_registered ASC
LIMIT 20;
```

## Dashboard Use Cases

### 1. **Customer 360 View**
When viewing a single customer:
- Contact info (email, phone, shipping address)
- Membership status & expiration
- Lifetime value & order count
- Marketing consent
- WordPress username & registration
- Tags & member areas
- Order history (JSONB field)

### 2. **Marketing Campaigns**
Target specific segments:
- VIP customers (high lifetime value)
- Members who accept marketing
- Recently churned (expired memberships)
- Specific acquisition channels
- Device preference (for mobile-optimized emails)

### 3. **Revenue Dashboard**
- Current MRR from active subscriptions
- Total lifetime value across all customers
- Average order value trends
- Revenue by member area
- Cohort revenue analysis

### 4. **Engagement Monitoring**
- At-risk customers (no recent orders)
- Highly engaged (frequent purchases)
- Session engagement metrics
- Member journey timing

### 5. **Operational Insights**
- Marketing channel ROI
- Device optimization needs
- Popular member areas
- Contact preference distribution

## Example Dashboard Queries

### VIP Customer Report
```sql
SELECT
  display_name,
  email,
  shipping_phone,
  lifetime_value,
  order_count,
  ROUND(avg_order_value, 2) as avg_order,
  last_order_date,
  accepts_marketing,
  member_areas,
  tags
FROM profiles
WHERE lifetime_value > 150
  AND is_member = true
ORDER BY lifetime_value DESC;
```

### Win-Back Campaign List
```sql
SELECT
  email,
  display_name,
  lifetime_value,
  last_order_date,
  membership_expiration,
  primary_acquisition_source
FROM profiles
WHERE is_member = false
  AND lifetime_value > 50
  AND accepts_marketing = true
  AND last_order_date > NOW() - INTERVAL '1 year'
ORDER BY lifetime_value DESC;
```

### Membership Renewal Risk
```sql
SELECT
  email,
  display_name,
  membership_expiration,
  lifetime_value,
  EXTRACT(DAY FROM (membership_expiration - NOW())) as days_until_expiration
FROM profiles
WHERE is_member = true
  AND membership_expiration < NOW() + INTERVAL '30 days'
ORDER BY membership_expiration ASC;
```

## Data Freshness

- **Stripe webhook updates:** Real-time (subscription status, payment events)
- **Migration data:** One-time historical import
- **Order history:** Updated during migration (can refresh by re-running migration scripts)

## Next Steps

1. **Apply migration:**
   ```bash
   supabase migration up
   ```

2. **Run migration script:**
   Migration will populate all analytics fields automatically

3. **Build dashboard:**
   - Use Supabase client to query profiles table
   - Add real-time subscriptions for live updates
   - Create charts with lifetime value, acquisition sources, etc.

4. **Add attribution data (optional):**
   - Extract `_wc_order_attribution_*` from SQL
   - Add to migration script
   - Populate `primary_acquisition_source`, `primary_device`, `avg_session_pages`

## Privacy & GDPR

- `accepts_marketing` field tracks explicit consent
- Only send marketing to customers with `accepts_marketing = true`
- Order history in JSONB for detailed analytics while respecting data retention policies
- All data inherited from WooCommerce with existing consent
