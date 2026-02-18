/**
 * backfill-stripe-orders.js
 *
 * Pulls all paid Stripe invoices for every profile that has a stripe_customer_id
 * and writes order_history, order_count, lifetime_value, avg_order_value,
 * last_order_date, and customer_since to Supabase.
 *
 * Merges with existing order_history (e.g. WooCommerce orders) — never overwrites.
 * Deduplicates by order_id so it's safe to re-run.
 *
 * Usage:
 *   node scripts/backfill-stripe-orders.js --dry-run
 *   node scripts/backfill-stripe-orders.js
 *   node scripts/backfill-stripe-orders.js --email=gms01lui13@gmail.com
 */

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const DRY_RUN = process.argv.includes('--dry-run');
const EMAIL_FILTER = process.argv.find((a) => a.startsWith('--email='))?.split('=')[1] ?? null;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!STRIPE_SECRET_KEY) {
  console.error('❌  Missing STRIPE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2026-01-28.clover' });

if (DRY_RUN) console.log('🏁  DRY RUN — no writes\n');
if (EMAIL_FILTER) console.log(`📧  Filtering to: ${EMAIL_FILTER}\n`);

// ── Helpers ──────────────────────────────────────────────────────────────────

function calcMetrics(history) {
  const orderCount = history.length;
  const lifetimeValue =
    Math.round(history.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0) * 100) / 100;
  const avgOrderValue =
    orderCount > 0 ? Math.round((lifetimeValue / orderCount) * 100) / 100 : 0;
  const lastOrderDate = history.reduce(
    (latest, o) => (!o.date ? latest : !latest || o.date > latest ? o.date : latest),
    null
  );
  return { orderCount, lifetimeValue, avgOrderValue, lastOrderDate };
}

async function fetchPaidInvoices(customerId) {
  const invoices = [];
  for await (const invoice of stripe.invoices.list({ customer: customerId, status: 'paid', limit: 100 })) {
    invoices.push(invoice);
  }
  return invoices;
}

function invoiceToEntry(invoice) {
  const amountPaid = (invoice.amount_paid ?? 0) / 100;
  if (amountPaid <= 0) return null;
  const orderDate = new Date(invoice.created * 1000).toISOString().split('T')[0];
  const productNames = (invoice.lines?.data ?? [])
    .map((l) => l.description)
    .filter((d) => typeof d === 'string' && d.length > 0);
  return {
    order_id: invoice.id,
    date: orderDate,
    total: amountPaid,
    products: productNames.length > 0 ? productNames : ['Kandie Gang Cycling Club Membership'],
    status: 'completed',
  };
}

// ── Fetch profiles ────────────────────────────────────────────────────────────

let query = supabase
  .from('profiles')
  .select('id, email, stripe_customer_id, order_history, customer_since');

if (EMAIL_FILTER) {
  query = query.ilike('email', EMAIL_FILTER);
} else {
  query = query.not('stripe_customer_id', 'is', null);
}

const { data: profiles, error: fetchError } = await query;

if (fetchError) {
  console.error('❌  Failed to fetch profiles:', fetchError.message);
  process.exit(1);
}

console.log(`Found ${profiles.length} profile(s) with stripe_customer_id\n`);

// ── Process each profile ──────────────────────────────────────────────────────

let updated = 0;
let skipped = 0;
let failed = 0;

for (const profile of profiles) {
  const label = profile.email ?? profile.id;

  let stripeInvoices;
  try {
    stripeInvoices = await fetchPaidInvoices(profile.stripe_customer_id);
  } catch (err) {
    console.error(`  ❌  ${label}: Stripe error — ${err.message}`);
    failed++;
    continue;
  }

  if (stripeInvoices.length === 0) {
    console.log(`  —  ${label}: no paid Stripe invoices`);
    skipped++;
    continue;
  }

  // Build entries from Stripe, merge with existing, dedup by order_id
  const newEntries = stripeInvoices.map(invoiceToEntry).filter(Boolean);
  const existing = Array.isArray(profile.order_history) ? profile.order_history : [];
  const existingIds = new Set(existing.map((e) => e.order_id));
  const toAdd = newEntries.filter((e) => !existingIds.has(e.order_id));

  if (toAdd.length === 0) {
    console.log(`  ✓  ${label}: already up to date (${existing.length} orders)`);
    skipped++;
    continue;
  }

  // Sort merged history ascending by date
  const mergedHistory = [...existing, ...toAdd].sort((a, b) =>
    (a.date ?? '').localeCompare(b.date ?? '')
  );

  const { orderCount, lifetimeValue, avgOrderValue, lastOrderDate } = calcMetrics(mergedHistory);

  // customer_since = earliest order date; don't overwrite if already set from WooCommerce
  const earliestStripeDate = newEntries.reduce(
    (earliest, o) => (!o.date ? earliest : !earliest || o.date < earliest ? o.date : earliest),
    null
  );
  const customerSince = profile.customer_since ?? earliestStripeDate;

  console.log(
    `  ${DRY_RUN ? '[dry]' : '✅ '} ${label}: +${toAdd.length} Stripe order(s) → ${orderCount} total, LTV €${lifetimeValue}, last ${lastOrderDate}`
  );

  if (DRY_RUN) {
    updated++;
    continue;
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      order_history: mergedHistory,
      order_count: orderCount,
      lifetime_value: lifetimeValue,
      avg_order_value: avgOrderValue,
      last_order_date: lastOrderDate,
      customer_since: customerSince,
    })
    .eq('id', profile.id);

  if (updateError) {
    console.error(`  ❌  ${label}: ${updateError.message}`);
    failed++;
  } else {
    updated++;
  }
}

console.log(`\n📊  Summary:`);
console.log(`   Updated:  ${updated}`);
console.log(`   Skipped:  ${skipped}`);
console.log(`   Failed:   ${failed}`);
console.log('\n✅  Done!');
