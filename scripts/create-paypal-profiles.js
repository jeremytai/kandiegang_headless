/**
 * Creates Supabase profiles for PayPal customers who don't have one yet.
 * Populates order_history, lifetime_value, avg_order_value, last_order_date, order_count.
 * Tags them with "paypal-import" so they're easy to identify.
 *
 * Usage:
 *   node scripts/create-paypal-profiles.js --dry-run   (preview only)
 *   node scripts/create-paypal-profiles.js              (write to Supabase)
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
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
  if (text.charCodeAt(0) === 0xfeff) i = 1;

  while (i < len) {
    const row = [];
    while (i < len) {
      if (text[i] === '"') {
        i++;
        let field = '';
        while (i < len) {
          if (text[i] === '"') {
            if (i + 1 < len && text[i + 1] === '"') {
              field += '"';
              i += 2;
            } else {
              i++;
              break;
            }
          } else {
            field += text[i];
            i++;
          }
        }
        row.push(field);
      } else {
        let field = '';
        while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
          field += text[i];
          i++;
        }
        row.push(field);
      }
      if (i < len && text[i] === ',') {
        i++;
      } else {
        break;
      }
    }
    if (i < len && text[i] === '\r') i++;
    if (i < len && text[i] === '\n') i++;
    if (row.length > 1 || (row.length === 1 && row[0] !== '')) rows.push(row);
  }
  return rows;
}

function parseEurAmount(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function cleanItemTitle(title) {
  if (!title) return null;
  let clean = title.replace(/^Payment for\s+/i, '');
  clean = clean.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  return clean.split('\n')[0].trim() || null;
}

// ─── Read PayPal CSVs ───
const CSV_FILES = [
  '/Users/jeremytai/Desktop/paypal_2022.CSV',
  '/Users/jeremytai/Desktop/paypal_2023.CSV',
  '/Users/jeremytai/Desktop/paypal_2024.CSV',
  '/Users/jeremytai/Desktop/paypal_2025.CSV',
];

console.log('📂 Reading PayPal CSV files...\n');

const paymentsByEmail = {};

for (const file of CSV_FILES) {
  const raw = readFileSync(file, 'utf8');
  const rows = parseCSV(raw);
  const header = rows[0];
  const col = {};
  header.forEach((h, idx) => { col[h.trim()] = idx; });

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length < 10) continue;

    const type = row[col['Type']] || '';
    const status = row[col['Status']] || '';
    const balanceImpact = row[col['Balance Impact']] || '';

    if (!type.includes('Express Checkout Payment')) continue;
    if (status !== 'Completed') continue;
    if (balanceImpact !== 'Credit') continue;

    const gross = parseEurAmount(row[col['Gross']]);
    if (gross <= 0) continue;

    const fromEmail = (row[col['From Email Address']] || '').toLowerCase().trim();
    const toEmail = (row[col['To Email Address']] || '').toLowerCase().trim();
    const transactionId = (row[col['Transaction ID']] || '').trim();
    const invoiceNumber = (row[col['Invoice Number']] || '').trim();
    const customNumber = (row[col['Custom Number']] || '').trim();
    const dateStr = (row[col['Date']] || '').trim();
    const itemTitle = (row[col['Item Title']] || '').trim();
    const name = (row[col['Name']] || '').trim();

    if (toEmail.includes('squarespace') || toEmail.includes('dhl') || toEmail.includes('paypal')) continue;
    if (!fromEmail) continue;

    let wooOrderId = null;
    if (invoiceNumber.startsWith('kg-')) {
      wooOrderId = invoiceNumber.replace('kg-', '');
    } else if (customNumber && /^\d+$/.test(customNumber)) {
      wooOrderId = customNumber;
    }

    if (!paymentsByEmail[fromEmail]) paymentsByEmail[fromEmail] = { name: null, orders: [] };
    if (name && !paymentsByEmail[fromEmail].name) paymentsByEmail[fromEmail].name = name;

    paymentsByEmail[fromEmail].orders.push({
      order_id: wooOrderId || `pp-${transactionId}`,
      date: parseDate(dateStr) ? `${parseDate(dateStr)} 00:00:00` : null,
      total: gross,
      products: cleanItemTitle(itemTitle) ? [cleanItemTitle(itemTitle)] : [],
      status: 'completed',
      transaction_id: transactionId,
      source: 'paypal',
    });
  }
}

// ─── Fetch all profiles ───
console.log('🔄 Fetching profiles...\n');

const { data: profiles, error } = await supabase
  .from('profiles')
  .select('id, email, order_history');

if (error) {
  console.error('Failed to fetch profiles:', error);
  process.exit(1);
}

// Find profiles that match PayPal emails and need order data
const profilesToUpdate = profiles.filter((p) => {
  if (!p.email) return false;
  const email = p.email.toLowerCase();
  const ppData = paymentsByEmail[email];
  if (!ppData) return false;
  // Only update if profile has no order history yet
  return !Array.isArray(p.order_history) || p.order_history.length === 0;
});

console.log(`📊 ${profilesToUpdate.length} profiles to populate with PayPal data\n`);

let created = 0;
let failed = 0;

for (const existingProfile of profilesToUpdate) {
  const email = existingProfile.email.toLowerCase();
  const { name, orders } = paymentsByEmail[email];

  // Sort orders newest first
  orders.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const orderCount = orders.length;
  const lifetimeValue = Math.round(orders.reduce((s, o) => s + o.total, 0) * 100) / 100;
  const avgOrderValue = Math.round((lifetimeValue / orderCount) * 100) / 100;
  const lastOrderDate = orders.reduce((latest, o) => {
    if (!o.date) return latest;
    const d = String(o.date).substring(0, 10);
    return !latest || d > latest ? d : latest;
  }, null);

  // Parse name into first/last
  const nameParts = (name || '').split(' ');
  const firstName = nameParts[0] || null;
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

  // Check if any order was a membership
  const hasMembership = orders.some(
    (o) => o.products?.some((p) => p && (p.toLowerCase().includes('membership') || p.toLowerCase().includes('cycling club')))
  );

  if (DRY_RUN) {
    console.log(
      `  [dry] ${email} (${name || '?'}): ${orderCount} orders, €${lifetimeValue}, member=${hasMembership}`
    );
    for (const o of orders.slice(0, 3)) {
      console.log(`         ${o.date?.substring(0, 10) || '?'} — €${o.total.toFixed(2)} — ${o.products.join(', ') || '—'}`);
    }
    if (orders.length > 3) console.log(`         ... +${orders.length - 3} more`);
    created++;
    continue;
  }

  const profileData = {
    display_name: name || email.split('@')[0],
    first_name: firstName,
    last_name: lastName,
    order_history: orders,
    order_count: orderCount,
    lifetime_value: lifetimeValue,
    avg_order_value: avgOrderValue,
    last_order_date: lastOrderDate,
    is_guide: false,
    is_member: hasMembership,
    tags: ['paypal-import'],
    accepts_marketing: false,
  };

  const { error: insertError } = await supabase
    .from('profiles')
    .update(profileData)
    .eq('id', existingProfile.id);

  if (insertError) {
    console.error(`  ❌ ${email}: ${insertError.message}`);
    failed++;
  } else {
    console.log(`  ✅ ${email} (${name || '?'}): ${orderCount} orders, €${lifetimeValue}`);
    created++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`  Created: ${created}`);
console.log(`  Failed: ${failed}`);
console.log('\n✅ Done!\n');
