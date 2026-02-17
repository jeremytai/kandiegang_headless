/**
 * Backfill script: cross-references PayPal CSV exports with Supabase profiles
 * and adds any new purchases to order_history.
 *
 * - Parses all 4 PayPal CSVs (2022–2025)
 * - Filters to completed incoming payments (Express Checkout, Credit)
 * - Matches by email to existing Supabase profiles
 * - Deduplicates against existing order_history by WooCommerce order ID or transaction ID
 * - Adds new orders and recalculates lifetime_value, avg_order_value, last_order_date, order_count
 *
 * Usage:
 *   node scripts/backfill-paypal.js --dry-run   (preview only)
 *   node scripts/backfill-paypal.js              (write to Supabase)
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

// ─── CSV Parser (handles multiline quoted fields) ───
function parseCSV(text) {
  const rows = [];
  let i = 0;
  const len = text.length;

  // Skip BOM if present
  if (text.charCodeAt(0) === 0xfeff) i = 1;

  while (i < len) {
    const row = [];
    while (i < len) {
      if (text[i] === '"') {
        // Quoted field — can span multiple lines
        i++; // skip opening quote
        let field = '';
        while (i < len) {
          if (text[i] === '"') {
            if (i + 1 < len && text[i + 1] === '"') {
              // Escaped quote
              field += '"';
              i += 2;
            } else {
              // End of quoted field
              i++; // skip closing quote
              break;
            }
          } else {
            field += text[i];
            i++;
          }
        }
        row.push(field);
      } else {
        // Unquoted field
        let field = '';
        while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
          field += text[i];
          i++;
        }
        row.push(field);
      }

      // After field: comma → next field, newline → end of row
      if (i < len && text[i] === ',') {
        i++; // skip comma, continue to next field
      } else {
        // End of row
        break;
      }
    }

    // Skip line ending
    if (i < len && text[i] === '\r') i++;
    if (i < len && text[i] === '\n') i++;

    if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
      rows.push(row);
    }
  }

  return rows;
}

// ─── Parse European number format (e.g. "1.234,56" → 1234.56) ───
function parseEurAmount(str) {
  if (!str) return 0;
  // Remove thousands separator (period), replace decimal comma with period
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

// ─── Parse date from DD/MM/YYYY to ISO format ───
function parseDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// ─── Extract product name from Item Title ───
function cleanItemTitle(title) {
  if (!title) return null;
  // Remove "Payment for " prefix that Squarespace adds
  let clean = title.replace(/^Payment for\s+/i, '');
  // Remove HTML entities
  clean = clean.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  // Truncate long descriptions (the multiline HTML ones)
  const firstLine = clean.split('\n')[0].trim();
  return firstLine || null;
}

// ─── Read and parse all PayPal CSVs ───
const CSV_FILES = [
  '/Users/jeremytai/Desktop/paypal_2022.CSV',
  '/Users/jeremytai/Desktop/paypal_2023.CSV',
  '/Users/jeremytai/Desktop/paypal_2024.CSV',
  '/Users/jeremytai/Desktop/paypal_2025.CSV',
];

console.log('📂 Reading PayPal CSV files...\n');

const allPayments = [];

for (const file of CSV_FILES) {
  const raw = readFileSync(file, 'utf8');
  const rows = parseCSV(raw);
  const header = rows[0];

  // Build column index map
  const col = {};
  header.forEach((h, idx) => {
    col[h.trim()] = idx;
  });

  let filePayments = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length < 10) continue;

    const type = row[col['Type']] || '';
    const status = row[col['Status']] || '';
    const balanceImpact = row[col['Balance Impact']] || '';

    // Only completed incoming payments
    if (!type.includes('Express Checkout Payment')) continue;
    if (status !== 'Completed') continue;
    if (balanceImpact !== 'Credit') continue;

    const gross = parseEurAmount(row[col['Gross']]);
    if (gross <= 0) continue; // Skip outgoing payments

    const fromEmail = (row[col['From Email Address']] || '').toLowerCase().trim();
    const toEmail = (row[col['To Email Address']] || '').toLowerCase().trim();
    const transactionId = (row[col['Transaction ID']] || '').trim();
    const invoiceNumber = (row[col['Invoice Number']] || '').trim();
    const customNumber = (row[col['Custom Number']] || '').trim();
    const dateStr = (row[col['Date']] || '').trim();
    const itemTitle = (row[col['Item Title']] || '').trim();
    const name = (row[col['Name']] || '').trim();

    // Skip payments to external services (Squarespace fees, DHL, etc.)
    if (toEmail.includes('squarespace') || toEmail.includes('dhl') || toEmail.includes('paypal')) continue;

    // Extract WooCommerce order ID from invoice number (e.g. "kg-7964" → "7964")
    let wooOrderId = null;
    if (invoiceNumber.startsWith('kg-')) {
      wooOrderId = invoiceNumber.replace('kg-', '');
    } else if (customNumber && /^\d+$/.test(customNumber)) {
      wooOrderId = customNumber;
    }

    const isoDate = parseDate(dateStr);
    const product = cleanItemTitle(itemTitle);

    allPayments.push({
      email: fromEmail,
      name,
      date: isoDate,
      total: gross,
      transaction_id: transactionId,
      woo_order_id: wooOrderId,
      products: product ? [product] : [],
      status: 'completed',
      source: 'paypal',
    });

    filePayments++;
  }

  const year = file.match(/(\d{4})/)?.[1] || '?';
  console.log(`  ${year}: ${filePayments} payments`);
}

console.log(`\n📊 Total PayPal payments: ${allPayments.length}\n`);

// ─── Group by email ───
const paymentsByEmail = {};
for (const p of allPayments) {
  if (!p.email) continue;
  if (!paymentsByEmail[p.email]) paymentsByEmail[p.email] = [];
  paymentsByEmail[p.email].push(p);
}

console.log(`👤 Unique customer emails: ${Object.keys(paymentsByEmail).length}\n`);

// ─── Fetch profiles from Supabase ───
console.log('🔄 Fetching profiles from Supabase...\n');

const { data: profiles, error: profilesError } = await supabase
  .from('profiles')
  .select('id, email, order_history, lifetime_value, avg_order_value, last_order_date, order_count');

if (profilesError) {
  console.error('Failed to fetch profiles:', profilesError);
  process.exit(1);
}

console.log(`Found ${profiles.length} profiles\n`);

// ─── Match and merge ───
let profilesUpdated = 0;
let profilesSkipped = 0;
let profilesFailed = 0;
let totalNewOrders = 0;

for (const profile of profiles) {
  if (!profile.email) continue;
  const email = profile.email.toLowerCase();
  const ppOrders = paymentsByEmail[email];
  if (!ppOrders || ppOrders.length === 0) continue;

  const existingHistory = Array.isArray(profile.order_history) ? profile.order_history : [];

  // Build a set of existing order identifiers for deduplication
  const existingOrderIds = new Set();
  const existingTxnIds = new Set();
  const existingDateAmounts = new Set();

  for (const o of existingHistory) {
    if (o.order_id) existingOrderIds.add(String(o.order_id));
    if (o.transaction_id) existingTxnIds.add(o.transaction_id);
    // Fallback dedup: date + amount (rounded)
    if (o.date && o.total) {
      const dateKey = String(o.date).substring(0, 10);
      const amountKey = Math.round(parseFloat(o.total) * 100);
      existingDateAmounts.add(`${dateKey}:${amountKey}`);
    }
  }

  const newOrders = [];

  for (const pp of ppOrders) {
    // Check if already exists by WooCommerce order ID
    if (pp.woo_order_id && existingOrderIds.has(pp.woo_order_id)) continue;

    // Check if already exists by transaction ID
    if (pp.transaction_id && existingTxnIds.has(pp.transaction_id)) continue;

    // Check by date+amount as final fallback
    if (pp.date && pp.total) {
      const dateKey = pp.date.substring(0, 10);
      const amountKey = Math.round(pp.total * 100);
      if (existingDateAmounts.has(`${dateKey}:${amountKey}`)) continue;
    }

    newOrders.push({
      order_id: pp.woo_order_id || `pp-${pp.transaction_id}`,
      date: pp.date ? `${pp.date} 00:00:00` : null,
      total: pp.total,
      products: pp.products,
      status: pp.status,
      transaction_id: pp.transaction_id,
      source: 'paypal',
    });
  }

  if (newOrders.length === 0) {
    profilesSkipped++;
    continue;
  }

  totalNewOrders += newOrders.length;

  // Merge and sort by date (newest first)
  const mergedHistory = [...existingHistory, ...newOrders].sort(
    (a, b) => (b.date || '').localeCompare(a.date || '')
  );

  // Recalculate aggregate metrics
  const orderCount = mergedHistory.length;
  const lifetimeValue =
    Math.round(mergedHistory.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0) * 100) / 100;
  const avgOrderValue = Math.round((lifetimeValue / orderCount) * 100) / 100;
  const lastOrderDate = mergedHistory.reduce((latest, o) => {
    if (!o.date) return latest;
    const d = String(o.date).substring(0, 10);
    return !latest || d > latest ? d : latest;
  }, null);

  const updates = {
    order_history: mergedHistory,
    lifetime_value: lifetimeValue,
    avg_order_value: avgOrderValue,
    last_order_date: lastOrderDate,
    order_count: orderCount,
  };

  if (DRY_RUN) {
    console.log(
      `  [dry] ${email}: +${newOrders.length} new orders (${existingHistory.length} existing → ${mergedHistory.length} total)`
    );
    for (const o of newOrders) {
      console.log(`         ${o.date?.substring(0, 10) || '?'} — €${o.total.toFixed(2)} — ${o.products.join(', ') || 'no product name'}`);
    }
    console.log(`         LTV: €${lifetimeValue}, AOV: €${avgOrderValue}, last: ${lastOrderDate}`);
    profilesUpdated++;
    continue;
  }

  const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id);

  if (error) {
    console.error(`  ❌ ${email}: ${error.message}`);
    profilesFailed++;
  } else {
    console.log(`  ✅ ${email}: +${newOrders.length} orders → ${mergedHistory.length} total, LTV €${lifetimeValue}`);
    profilesUpdated++;
  }
}

// ─── Report unmatched emails ───
const profileEmails = new Set(profiles.map((p) => (p.email || '').toLowerCase()));
const unmatchedEmails = Object.keys(paymentsByEmail).filter((e) => !profileEmails.has(e));

if (unmatchedEmails.length > 0) {
  console.log(`\n⚠️  ${unmatchedEmails.length} PayPal emails with no matching Supabase profile:`);
  for (const email of unmatchedEmails.slice(0, 20)) {
    const orders = paymentsByEmail[email];
    const total = orders.reduce((s, o) => s + o.total, 0);
    console.log(`  ${email}: ${orders.length} orders, €${total.toFixed(2)} total`);
  }
  if (unmatchedEmails.length > 20) {
    console.log(`  ... and ${unmatchedEmails.length - 20} more`);
  }
}

console.log(`\n📊 Summary:`);
console.log(`  Profiles updated: ${profilesUpdated}`);
console.log(`  New orders added: ${totalNewOrders}`);
console.log(`  Profiles skipped (no new orders): ${profilesSkipped}`);
console.log(`  Failed: ${profilesFailed}`);
console.log(`  Unmatched PayPal emails: ${unmatchedEmails.length}`);
console.log('\n✅ Done!\n');
