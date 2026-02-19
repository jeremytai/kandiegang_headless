/**
 * Backfill script: enriches Supabase profiles with data from WooCommerce SQL dumps.
 *
 * 1. Coupon usage — adds discount_amount to order_history entries
 * 2. Newsletter engagement — MailPoet engagement score, email open/click dates, status
 * 3. Returning customer + net revenue — adds net_total and returning_customer to order_history
 *
 * Usage:
 *   node scripts/backfill-enrichment.js --dry-run   (preview only)
 *   node scripts/backfill-enrichment.js              (write to Supabase)
 */

import { readFileSync } from 'fs';
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

// ─── SQL parser helpers ───
const parseValue = (val) => {
  if (val === 'NULL' || val === null) return null;
  return val.replace(/^'|'$/g, '').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
};

const parseRows = (block) => {
  const rows = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < block.length; i++) {
    const char = block[i];
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === '\\' && inString) {
      escaped = true;
      current += char;
      continue;
    }
    if (char === "'" && !escaped) {
      inString = !inString;
      current += char;
      continue;
    }
    if (!inString) {
      if (char === '(') {
        if (depth === 0) current = '';
        depth++;
        if (depth === 1) continue;
      } else if (char === ')') {
        depth--;
        if (depth === 0) {
          rows.push(current);
          current = '';
          continue;
        }
      }
    }
    if (depth > 0) current += char;
  }
  return rows;
};

const parseFields = (rowStr) => {
  const fields = [];
  let current = '';
  let inQuotes = false;
  let escaped = false;

  for (let i = 0; i < rowStr.length; i++) {
    const char = rowStr[i];
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      current += char;
      continue;
    }
    if (char === "'") {
      inQuotes = !inQuotes;
      current += char;
      continue;
    }
    if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) fields.push(current.trim());
  return fields;
};

/** Find the end of an INSERT statement, handling semicolons inside strings */
const findInsertEnd = (sql, startIdx) => {
  let inStr = false;
  let esc = false;
  for (let i = startIdx; i < sql.length; i++) {
    const c = sql[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (c === '\\' && inStr) {
      esc = true;
      continue;
    }
    if (c === "'") {
      inStr = !inStr;
      continue;
    }
    if (!inStr && c === ';') return i;
  }
  return -1;
};

/** Extract VALUES block from an INSERT INTO statement */
const extractInsertBlock = (sql, tableName) => {
  const insertIdx = sql.indexOf(`INSERT INTO \`${tableName}\``);
  if (insertIdx === -1) return null;
  const valuesIdx = sql.indexOf('VALUES', insertIdx);
  if (valuesIdx === -1) return null;
  const endIdx = findInsertEnd(sql, valuesIdx);
  if (endIdx === -1) return null;
  return sql.substring(valuesIdx + 6, endIdx).trim();
};

// ─── Read SQL files ───
console.log('📂 Reading SQL dumps...\n');
const sql3 = readFileSync('/Users/jeremytai/Desktop/wp_kandi_db1 (3).sql', 'utf8');

// ════════════════════════════════════════════════════════════════
// 1. COUPON USAGE — order_id -> discount_amount
// ════════════════════════════════════════════════════════════════
console.log('🎟️  Parsing coupon usage...');

const couponBlock = extractInsertBlock(sql3, 'wp_uv3hmh_wc_order_coupon_lookup');
const couponsByOrder = {};

if (couponBlock) {
  const couponRows = parseRows(couponBlock);
  for (const row of couponRows) {
    const fields = parseFields(row);
    // order_id, coupon_id, date_created, discount_amount
    const orderId = parseValue(fields[0]);
    const discount = parseFloat(parseValue(fields[3])) || 0;
    if (orderId) {
      couponsByOrder[orderId] = (couponsByOrder[orderId] || 0) + discount;
    }
  }
  console.log(`  Found discounts for ${Object.keys(couponsByOrder).length} orders\n`);
} else {
  console.log('  No coupon data found\n');
}

// ════════════════════════════════════════════════════════════════
// 2. ORDER STATS — order_id -> { net_total, returning_customer }
// ════════════════════════════════════════════════════════════════
console.log('📊 Parsing order stats...');

const statsBlock = extractInsertBlock(sql3, 'wp_uv3hmh_wc_order_stats');
const statsByOrder = {};

if (statsBlock) {
  const statsRows = parseRows(statsBlock);
  for (const row of statsRows) {
    const fields = parseFields(row);
    // order_id, parent_id, date_created, date_created_gmt, date_paid, date_completed,
    // num_items_sold, total_sales, tax_total, shipping_total, net_total, returning_customer, status, customer_id
    const orderId = parseValue(fields[0]);
    const netTotal = parseFloat(parseValue(fields[10])) || 0;
    const returning = parseValue(fields[11]) === '1';
    if (orderId) {
      statsByOrder[orderId] = { net_total: netTotal, returning_customer: returning };
    }
  }
  console.log(`  Found stats for ${Object.keys(statsByOrder).length} orders\n`);
} else {
  console.log('  No order stats found\n');
}

// ════════════════════════════════════════════════════════════════
// 3. NEWSLETTER ENGAGEMENT — email -> MailPoet data
// ════════════════════════════════════════════════════════════════
console.log('📧 Parsing MailPoet subscribers...');

const mailpoetBlock = extractInsertBlock(sql3, 'wp_uv3hmh_mailpoet_subscribers');
const newsletterByEmail = {};

if (mailpoetBlock) {
  const mpRows = parseRows(mailpoetBlock);
  for (const row of mpRows) {
    const fields = parseFields(row);
    // id, wp_user_id, is_woocommerce_user, first_name, last_name, email, status,
    // subscribed_ip, confirmed_ip, confirmed_at, last_subscribed_at, created_at, updated_at,
    // deleted_at, unconfirmed_data, source, count_confirmations, unsubscribe_token, link_token,
    // engagement_score, engagement_score_updated_at, last_engagement_at, woocommerce_synced_at,
    // email_count, last_sending_at, last_open_at, last_click_at, last_purchase_at, last_page_view_at
    const email = parseValue(fields[5]);
    const status = parseValue(fields[6]);
    const source = parseValue(fields[15]);
    const engagementScore = parseFloat(parseValue(fields[19])) || null;
    const lastEngagement = parseValue(fields[21]);
    const emailCount = parseInt(parseValue(fields[23])) || 0;
    const lastOpen = parseValue(fields[25]);
    const lastClick = parseValue(fields[26]);
    const lastPurchase = parseValue(fields[27]);
    const lastPageView = parseValue(fields[28]);

    if (email) {
      newsletterByEmail[email.toLowerCase()] = {
        newsletter_status: status,
        newsletter_source: source,
        engagement_score: engagementScore,
        last_engagement: lastEngagement,
        email_count: emailCount,
        last_email_open: lastOpen,
        last_email_click: lastClick,
        last_purchase_via_email: lastPurchase,
        last_page_view: lastPageView,
      };
    }
  }
  console.log(`  Found newsletter data for ${Object.keys(newsletterByEmail).length} subscribers\n`);
} else {
  console.log('  No MailPoet data found\n');
}

// ════════════════════════════════════════════════════════════════
// 4. FETCH PROFILES & ENRICH
// ════════════════════════════════════════════════════════════════
console.log('🔄 Fetching profiles from Supabase...\n');

const { data: profiles, error: profilesError } = await supabase
  .from('profiles')
  .select('id, email, order_history');

if (profilesError) {
  console.error('Failed to fetch profiles:', profilesError);
  process.exit(1);
}

console.log(`Found ${profiles.length} profiles\n`);

let updated = 0;
let skipped = 0;
let failed = 0;

for (const profile of profiles) {
  if (!profile.email) continue;
  const email = profile.email.toLowerCase();
  const updates = {};
  const changes = [];

  // ── Enrich order_history with coupon + stats data ──
  const existingHistory = profile.order_history;
  if (Array.isArray(existingHistory) && existingHistory.length > 0) {
    let historyChanged = false;
    const enrichedHistory = existingHistory.map((order) => {
      const enriched = { ...order };
      const oid = String(order.order_id);

      // Add discount
      if (couponsByOrder[oid] && !order.discount) {
        enriched.discount = couponsByOrder[oid];
        historyChanged = true;
      }

      // Add net_total and returning_customer
      if (statsByOrder[oid] && order.net_total === undefined) {
        enriched.net_total = statsByOrder[oid].net_total;
        enriched.returning_customer = statsByOrder[oid].returning_customer;
        historyChanged = true;
      }

      return enriched;
    });

    if (historyChanged) {
      updates.order_history = enrichedHistory;
      changes.push('order enrichment');
    }
  }

  // ── Newsletter engagement ──
  const mp = newsletterByEmail[email];
  if (mp) {
    // Only write fields that have meaningful values
    if (mp.newsletter_status) updates.newsletter_status = mp.newsletter_status;
    if (mp.newsletter_source) updates.newsletter_source = mp.newsletter_source;
    if (mp.engagement_score !== null) updates.engagement_score = mp.engagement_score;
    if (mp.last_engagement) updates.last_engagement = mp.last_engagement;
    if (mp.email_count > 0) updates.email_count = mp.email_count;
    if (mp.last_email_open) updates.last_email_open = mp.last_email_open;
    if (mp.last_email_click) updates.last_email_click = mp.last_email_click;
    if (mp.last_page_view) updates.last_page_view = mp.last_page_view;
    changes.push('newsletter');
  }

  if (Object.keys(updates).length === 0) {
    skipped++;
    continue;
  }

  if (DRY_RUN) {
    console.log(`  [dry] ${email}: ${changes.join(', ')}`);
    if (mp) {
      console.log(
        `         status=${mp.newsletter_status}, score=${mp.engagement_score}, opens=${mp.last_email_open || '—'}, clicks=${mp.last_email_click || '—'}`
      );
    }
    updated++;
    continue;
  }

  const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id);

  if (error) {
    console.error(`  ❌ ${email}: ${error.message}`);
    failed++;
  } else {
    console.log(`  ✅ ${email}: ${changes.join(', ')}`);
    updated++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`  Updated: ${updated}`);
console.log(`  Skipped (no new data): ${skipped}`);
console.log(`  Failed: ${failed}`);
console.log('\n✅ Done!\n');
