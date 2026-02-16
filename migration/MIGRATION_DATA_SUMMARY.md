# WooCommerce to Stripe Migration - Data Integration Summary

## Data Sources

The migration now integrates data from multiple sources to create comprehensive customer profiles:

### 1. **members.csv** (43 members)
- Email, First Name, Last Name
- Membership Plan, Status
- Member Since, Membership Expiration
- WordPress User ID

### 2. **wordpress-users.json** (43 users)
Extracted from `wp_kandi_db1.sql`:
- WordPress username (`user_login`)
- WordPress registration date
- Display name
- WordPress user ID

### 3. **address-data.json** (55 members, ~80% coverage)
Extracted from `wp_kandi_db1 (2).sql` - `wp_wc_order_addresses` table:
- Billing address (line1, line2, city, state, postal code, country)
- Billing phone number

### 4. **customer-profiles.json** (129 customers)
Extracted from `profiles.csv`:
- **Order Metrics:**
  - Order count
  - Total spent (lifetime value)
  - Last order date
  - Customer since date

- **Marketing & Membership:**
  - Accepts marketing (GDPR compliance)
  - Member areas (e.g., "Kandie Gang Cycling Club")
  - Tags
  - Mailing lists
  - Subscriber source

- **Enhanced Address Data:**
  - Shipping address (often more complete than billing)
  - Shipping phone
  - Billing name and phone

## Stripe Customer Metadata

Each Stripe customer will include the following metadata (up to 50 keys, 500 chars/value):

```javascript
{
  // WordPress Data
  wp_user_id: "94",
  wp_username: "liv.dettmann",
  wp_registered: "2025-09-10 11:55:53",

  // Order History Metrics
  order_count: "3",
  lifetime_value: "180.00",
  last_order_date: "2025-09-15T10:30:00.000Z",
  customer_since: "2024-01-20T08:15:00.000Z",

  // Marketing & Segmentation
  accepts_marketing: "true",
  member_areas: "Kandie Gang Cycling Club",
  tags: "VIP,Early Adopter",

  // Migration Metadata
  migrated_from: "woocommerce",
  migration_date: "2026-02-15T..."
}
```

## Stripe Customer Profile Data

- **Name:** First + Last name from CSV
- **Email:** Customer email
- **Phone:** Shipping phone → Billing phone → Address data (fallback chain)
- **Address:** Shipping address → Billing address (preference for shipping data)

## Supabase Profile Updates

The following fields are updated in the `profiles` table:

- `stripe_customer_id`
- `stripe_subscription_id`
- `stripe_subscription_status`
- `stripe_price_id`
- `membership_source` = 'supabase'
- `display_name` (from CSV first/last name)
- `member_since` (from CSV)
- `membership_expiration` (from CSV)
- `subscription_current_period_end`
- `billing_cycle_anchor`

## Data Coverage

- **Members in migration:** 43
- **WordPress user data:** 43/43 (100%)
- **Address data:** ~55 (80%+ coverage, includes non-members)
- **Customer profile data:** 129 total customers (all historical data)
- **Phone numbers:** Available for most active members
- **Order history:** Complete for all 129 customers

## Benefits

### Customer Segmentation
- **VIP Customers:** Identify high lifetime value members
- **Marketing Compliance:** Track `accepts_marketing` for GDPR
- **Engagement:** See order frequency and recency

### Member Journey Tracking
- Know when they first became a customer
- Track WordPress registration vs membership purchase
- Understand member lifecycle

### Operational Efficiency
- Complete contact information for support
- Historical context for customer inquiries
- All data accessible via Stripe Customer Portal

### Future Use Cases
- Targeted marketing campaigns based on lifetime value
- Win-back campaigns for members with no recent orders
- Personalized communication based on membership duration
- Analytics on customer acquisition sources

## Migration Process

1. **Extract Data:**
   ```bash
   node scripts/extract-wordpress-users-from-sql.js
   node scripts/extract-addresses-from-sql.js
   node scripts/extract-profiles-data.js
   ```

2. **Verify Data:**
   - Check JSON files created in project root
   - Verify coverage and data quality

3. **Run Migration (DRY_RUN):**
   ```bash
   DRY_RUN=true \
   STRIPE_SECRET_KEY=sk_test_... \
   CLUB_MEMBERSHIP_PRICE_ID=price_... \
   GUIDE_MEMBERSHIP_PRICE_ID=price_... \
   node scripts/migrate-woo-to-stripe-subscriptions.js members.csv
   ```

4. **Review Results:**
   - Check migration log (JSONL format)
   - Verify Stripe customers created/updated correctly
   - Confirm metadata is complete

5. **Run Production Migration:**
   - Switch to live Stripe keys
   - Remove DRY_RUN flag
   - Monitor closely

## Next Steps

- ✅ WordPress user data extraction complete
- ✅ Address data extraction complete
- ✅ Customer profile data extraction complete
- ✅ Migration script updated to include all data
- ⏳ Test migration in Stripe test mode
- ⏳ Production migration
- ⏳ Verify data in Stripe Dashboard
- ⏳ Send Customer Portal links to members
