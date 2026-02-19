/**
 * Recalculates lifetime_value, avg_order_value, last_order_date, and order_count
 * from the order_history JSONB column for all profiles.
 *
 * Usage:
 *   node scripts/recalc-order-metrics.js --dry-run   (preview only)
 *   node scripts/recalc-order-metrics.js              (write to Supabase)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const DRY_RUN = process.argv.includes('--dry-run');
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

if (DRY_RUN) console.log('🏁 DRY RUN — no writes\n');

console.log('🔄 Fetching profiles with order_history...\n');

const { data: profiles, error } = await supabase
  .from('profiles')
  .select(
    'id, email, order_history, lifetime_value, avg_order_value, last_order_date, order_count'
  );

if (error) {
  console.error('Failed to fetch profiles:', error);
  process.exit(1);
}

console.log(`Found ${profiles.length} profiles\n`);

let updated = 0;
let skipped = 0;
let failed = 0;

for (const profile of profiles) {
  const history = profile.order_history;
  if (!Array.isArray(history) || history.length === 0) {
    skipped++;
    continue;
  }

  // Calculate metrics from order_history
  const orderCount = history.length;
  const lifetimeValue = history.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
  const avgOrderValue = orderCount > 0 ? lifetimeValue / orderCount : 0;

  // Find most recent order date
  const lastOrderDate = history.reduce((latest, o) => {
    if (!o.date) return latest;
    return !latest || o.date > latest ? o.date : latest;
  }, null);

  // Round to 2 decimal places
  const ltv = Math.round(lifetimeValue * 100) / 100;
  const aov = Math.round(avgOrderValue * 100) / 100;

  // Check if anything actually changed
  const oldLtv = Math.round((profile.lifetime_value || 0) * 100) / 100;
  const oldAov = Math.round((profile.avg_order_value || 0) * 100) / 100;
  if (
    oldLtv === ltv &&
    oldAov === aov &&
    profile.last_order_date === lastOrderDate &&
    profile.order_count === orderCount
  ) {
    skipped++;
    continue;
  }

  const updates = {
    lifetime_value: ltv,
    avg_order_value: aov,
    last_order_date: lastOrderDate,
    order_count: orderCount,
  };

  if (DRY_RUN) {
    console.log(
      `  [dry] ${profile.email}: LTV €${oldLtv} → €${ltv}, AOV €${oldAov} → €${aov}, orders ${profile.order_count || 0} → ${orderCount}, last ${profile.last_order_date || '—'} → ${lastOrderDate || '—'}`
    );
    updated++;
    continue;
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', profile.id);

  if (updateError) {
    console.error(`  ❌ ${profile.email}: ${updateError.message}`);
    failed++;
  } else {
    console.log(
      `  ✅ ${profile.email}: LTV €${ltv}, AOV €${aov}, ${orderCount} orders, last ${lastOrderDate}`
    );
    updated++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`  Updated: ${updated}`);
console.log(`  Skipped (no change or no orders): ${skipped}`);
console.log(`  Failed: ${failed}`);
console.log('\n✅ Done!\n');
