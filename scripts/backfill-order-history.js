import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

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

// ─── SQL parser helpers ───
const parseValue = (val) => {
  if (val === 'NULL' || val === null) return null;
  return val.replace(/^'|'$/g, '').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
};

const parseRows = (insertBlock) => {
  const rows = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < insertBlock.length; i++) {
    const char = insertBlock[i];

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

// ─── Step 1: Parse order items (product names) from file (3) ───
console.log('📦 Parsing order items from SQL dump (3)...\n');

const sql3 = readFileSync('/Users/jeremytai/Desktop/wp_kandi_db1 (3).sql', 'utf8');

// Extract woocommerce_order_items INSERT block
const orderItemsMatch = sql3.match(
  /INSERT INTO `wp_uv3hmh_woocommerce_order_items`[\s\S]*?VALUES\s+([\s\S]*?);/
);
if (!orderItemsMatch) {
  console.error('Could not find woocommerce_order_items INSERT');
  process.exit(1);
}

const itemRows = parseRows(orderItemsMatch[1]);
console.log(`Found ${itemRows.length} order item rows`);

// Build map: order_id -> [product names] (only line_item type)
const productsByOrder = {};
for (const row of itemRows) {
  const fields = parseFields(row);
  // order_item_id, order_item_name, order_item_type, order_id
  const itemName = parseValue(fields[1]);
  const itemType = parseValue(fields[2]);
  const orderId = parseValue(fields[3]);

  if (itemType === 'line_item' && itemName && orderId) {
    if (!productsByOrder[orderId]) productsByOrder[orderId] = [];
    productsByOrder[orderId].push(itemName);
  }
}

const orderIdsWithProducts = Object.keys(productsByOrder).length;
console.log(`Extracted products for ${orderIdsWithProducts} orders\n`);

// Show unique product names
const allProducts = new Set(Object.values(productsByOrder).flat());
console.log('Unique products found:');
for (const p of allProducts) {
  console.log(`  - ${p}`);
}
console.log();

// ─── Step 2: Parse orders (email + totals) from file (2) ───
console.log('📋 Parsing orders from SQL dump (2)...\n');

const sql2 = readFileSync('/Users/jeremytai/Desktop/wp_kandi_db1 (2).sql', 'utf8');

// Find the VALUES block manually (regex fails because user_agent contains semicolons)
const ordersInsertIdx = sql2.indexOf('INSERT INTO `wp_uv3hmh_wc_orders`');
if (ordersInsertIdx === -1) {
  console.error('Could not find wc_orders INSERT');
  process.exit(1);
}
const ordersValuesIdx = sql2.indexOf('VALUES', ordersInsertIdx);
// Find the end: look for ");\n" which terminates the INSERT (not a semicolon inside a string)
let ordersEndIdx = -1;
{
  let inStr = false;
  let esc = false;
  for (let i = ordersValuesIdx; i < sql2.length; i++) {
    const c = sql2[i];
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
    if (!inStr && c === ';') {
      ordersEndIdx = i;
      break;
    }
  }
}
if (ordersEndIdx === -1) {
  console.error('Could not find end of wc_orders INSERT');
  process.exit(1);
}
const ordersBlock = sql2.substring(ordersValuesIdx + 6, ordersEndIdx).trim();

const orderRows = parseRows(ordersBlock);
console.log(`Found ${orderRows.length} orders`);

// Build order map: order_id -> { email, total, date, status }
const ordersById = {};
for (const row of orderRows) {
  const fields = parseFields(row);
  // id, status, currency, type, tax_amount, total_amount, customer_id, billing_email,
  // date_created_gmt, date_updated_gmt, parent_order_id, ...
  const orderId = parseValue(fields[0]);
  const status = parseValue(fields[1]);
  const total = parseFloat(parseValue(fields[5])) || 0;
  const email = parseValue(fields[7]);
  const date = parseValue(fields[8]);

  if (email && orderId) {
    ordersById[orderId] = {
      order_id: orderId,
      status,
      total,
      email: email.toLowerCase(),
      date,
      products: productsByOrder[orderId] || [],
    };
  }
}

console.log(`Mapped ${Object.keys(ordersById).length} orders with emails\n`);

// ─── Step 3: Group by email → build order_history ───
const historyByEmail = {};

for (const order of Object.values(ordersById)) {
  // Only include completed/processing orders
  if (
    !order.status ||
    (!order.status.includes('completed') && !order.status.includes('processing'))
  ) {
    continue;
  }

  if (!historyByEmail[order.email]) {
    historyByEmail[order.email] = [];
  }

  historyByEmail[order.email].push({
    order_id: order.order_id,
    date: order.date,
    total: order.total,
    status: order.status.replace('wc-', ''),
    products: order.products,
  });
}

// Sort each customer's orders newest first
for (const email in historyByEmail) {
  historyByEmail[email].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

const customersWithOrders = Object.keys(historyByEmail).length;
const totalOrders = Object.values(historyByEmail).reduce((sum, orders) => sum + orders.length, 0);
console.log(`📊 ${customersWithOrders} customers with ${totalOrders} orders total\n`);

// Show sample
const sampleEmails = Object.keys(historyByEmail).slice(0, 3);
for (const email of sampleEmails) {
  const orders = historyByEmail[email];
  console.log(`  ${email}: ${orders.length} orders`);
  for (const o of orders.slice(0, 2)) {
    console.log(
      `    ${o.date} — €${o.total.toFixed(2)} — ${o.products.join(', ') || 'no products'}`
    );
  }
}
console.log();

const DRY_RUN = process.argv.includes('--dry-run');
if (DRY_RUN) {
  console.log('🏁 DRY RUN — no Supabase writes will be made.\n');
}

// ─── Step 4: Match to Supabase profiles and update ───
console.log('🔄 Fetching profiles from Supabase...\n');

const { data: profiles, error: profilesError } = await supabase
  .from('profiles')
  .select('id, email');

if (profilesError) {
  console.error('Failed to fetch profiles:', profilesError);
  process.exit(1);
}

console.log(`Found ${profiles.length} profiles in Supabase`);

// Match by email
let matched = 0;
let updated = 0;
let failed = 0;

for (const profile of profiles) {
  if (!profile.email) continue;
  const email = profile.email.toLowerCase();
  const orderHistory = historyByEmail[email];

  if (!orderHistory || orderHistory.length === 0) continue;
  matched++;

  if (DRY_RUN) {
    console.log(
      `  [dry] ${email}: ${orderHistory.length} orders → ${orderHistory.flatMap((o) => o.products).join(', ')}`
    );
    updated++;
    continue;
  }

  const { error } = await supabase
    .from('profiles')
    .update({ order_history: orderHistory })
    .eq('id', profile.id);

  if (error) {
    console.error(`  Failed to update ${email}:`, error.message);
    failed++;
  } else {
    updated++;
    console.log(
      `  ✅ ${email}: ${orderHistory.length} orders (${orderHistory.flatMap((o) => o.products).join(', ')})`
    );
  }
}

console.log(`\n📊 Summary:`);
console.log(`  Profiles with matching orders: ${matched}`);
console.log(`  Successfully updated: ${updated}`);
console.log(`  Failed: ${failed}`);
console.log(`  No orders found: ${profiles.length - matched}`);
console.log('\n✅ Done!\n');
