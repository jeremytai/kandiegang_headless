/**
 * backfill-stripe-customer-ids.js
 *
 * For members who purchased before the webhook fix (which now stores
 * stripe_customer_id automatically), this script looks each email up in
 * Stripe, finds their customer + active subscription, and patches the
 * Supabase profile with all missing Stripe fields.
 *
 * Usage:
 *   node scripts/backfill-stripe-customer-ids.js
 */

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

// ─── Config ──────────────────────────────────────────────────────────────────

const EMAILS = [
  'jeremytai@gmail.com',
  'gms01lui13@gmail.com',
  'lucke.robert@gmail.com',
];

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
if (!STRIPE_SECRET_KEY) {
  console.error('❌  Missing STRIPE_SECRET_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2026-01-28.clover' });

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the first Stripe customer matching this email, or null. */
async function findStripeCustomer(email) {
  const results = await stripe.customers.list({ email, limit: 5 });
  if (!results.data.length) return null;
  // Prefer the customer with an active subscription; fallback to first.
  const withSub = results.data.find((c) => c.subscriptions?.data?.length > 0);
  return withSub ?? results.data[0];
}

/** Returns the most recent active/trialing subscription for a customer, or null. */
async function findActiveSubscription(customerId) {
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 1,
  });
  if (subs.data.length) return subs.data[0];

  const trialing = await stripe.subscriptions.list({
    customer: customerId,
    status: 'trialing',
    limit: 1,
  });
  if (trialing.data.length) return trialing.data[0];

  // Fall back to any subscription (past_due, canceled, etc.)
  const all = await stripe.subscriptions.list({ customer: customerId, limit: 1 });
  return all.data[0] ?? null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

for (const email of EMAILS) {
  console.log(`\n── ${email} ──────────────────────────────────`);

  // 1. Find the Supabase profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, stripe_customer_id')
    .ilike('email', email)
    .maybeSingle();

  if (profileError) {
    console.error('  ⚠️  Supabase error:', profileError.message);
    continue;
  }
  if (!profile) {
    console.warn('  ⚠️  No Supabase profile found — skipping');
    continue;
  }

  console.log(`  Profile id: ${profile.id}`);

  if (profile.stripe_customer_id) {
    console.log(`  ✅  Already has stripe_customer_id: ${profile.stripe_customer_id} — skipping`);
    continue;
  }

  // 2. Look up the Stripe customer
  const customer = await findStripeCustomer(email);
  if (!customer) {
    console.warn('  ⚠️  No Stripe customer found — skipping');
    continue;
  }
  console.log(`  Stripe customer: ${customer.id}`);

  // 3. Find their subscription
  const subscription = await findActiveSubscription(customer.id);

  const updates = { stripe_customer_id: customer.id };

  if (subscription) {
    console.log(`  Subscription: ${subscription.id} (${subscription.status})`);
    updates.stripe_subscription_id = subscription.id;
    updates.stripe_subscription_status = subscription.status;
    updates.subscription_cancel_at_period_end = subscription.cancel_at_period_end ?? false;

    // In Stripe API 2026-01-28+, current_period_end lives on the subscription item
    const firstItem = subscription.items?.data?.[0];
    const currentPeriodEnd = firstItem?.current_period_end ?? subscription.current_period_end;

    if (currentPeriodEnd) {
      const periodEnd = new Date(currentPeriodEnd * 1000);
      updates.subscription_current_period_end = periodEnd.toISOString();
      // Only update membership_expiration if subscription is active/trialing
      if (['active', 'trialing'].includes(subscription.status)) {
        updates.membership_expiration = periodEnd.toISOString().split('T')[0];
        updates.is_member = true;
      }
    }

    const price = firstItem?.price;
    if (price?.id) {
      updates.stripe_price_id = price.id;
    }
  } else {
    console.log('  No subscription found — storing customer_id only');
  }

  // 4. Patch the Supabase profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', profile.id);

  if (updateError) {
    console.error('  ❌  Failed to update profile:', updateError.message);
  } else {
    console.log('  ✅  Profile updated:', JSON.stringify(updates, null, 4).replace(/^/gm, '      '));
  }
}

console.log('\n✅  Done');
