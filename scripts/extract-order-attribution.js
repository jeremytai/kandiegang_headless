import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

console.log('📈 Extracting order attribution & marketing data...\n');

// Read SQL dump with order metadata
const sqlPath = '/Users/jeremytai/Desktop/wp_kandi_db1 (2).sql';
const sqlContent = readFileSync(sqlPath, 'utf8');

// Find the wp_uv3hmh_wc_orders_meta INSERT INTO statement
const ordersMetaMatch = sqlContent.match(
  /INSERT INTO `wp_uv3hmh_wc_orders_meta`[^V]+VALUES\s+(.*?);(?=\n\n|$)/s
);
if (!ordersMetaMatch) {
  console.error('❌ Could not find wp_uv3hmh_wc_orders_meta INSERT INTO statement');
  process.exit(1);
}

const metaData = ordersMetaMatch[1];

// Parse meta entries (id, order_id, meta_key, meta_value)
const parseValue = (val) => {
  if (val === 'NULL' || val === null) return null;
  return val.replace(/^'|'$/g, '').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
};

const parseRow = (rowStr) => {
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

  if (current.trim()) {
    fields.push(current.trim());
  }

  return fields;
};

// Parse rows with proper parenthesis handling
const rows = [];
let currentRow = '';
let depth = 0;
let inString = false;
let escaped = false;

for (let i = 0; i < metaData.length; i++) {
  const char = metaData[i];

  if (escaped) {
    currentRow += char;
    escaped = false;
    continue;
  }

  if (char === '\\' && inString) {
    escaped = true;
    currentRow += char;
    continue;
  }

  if (char === "'" && metaData[i - 1] !== '\\') {
    inString = !inString;
    currentRow += char;
    continue;
  }

  if (!inString) {
    if (char === '(') {
      if (depth === 0) {
        currentRow = '';
      }
      depth++;
      if (depth === 1) continue;
    } else if (char === ')') {
      depth--;
      if (depth === 0) {
        rows.push(currentRow);
        currentRow = '';
        continue;
      }
    }
  }

  if (depth > 0) {
    currentRow += char;
  }
}

console.log(`Found ${rows.length} order meta entries\n`);

// Group by order_id and build attribution data
const orderMeta = {};

for (const rowContent of rows) {
  const fields = parseRow(rowContent);
  if (fields.length < 4) continue;

  const orderId = fields[1];
  const metaKey = parseValue(fields[2]);
  const metaValue = parseValue(fields[3]);

  if (!orderMeta[orderId]) {
    orderMeta[orderId] = {};
  }

  orderMeta[orderId][metaKey] = metaValue;
}

console.log(`Parsed metadata for ${Object.keys(orderMeta).length} orders\n`);

// Now load the orders to get email addresses
const ordersMatch = sqlContent.match(/INSERT INTO `wp_uv3hmh_wc_orders`[^V]+VALUES\s+(.*?);/s);
if (!ordersMatch) {
  console.error('❌ Could not find orders data');
  process.exit(1);
}

const ordersData = ordersMatch[1];
const orderRows = [];
let orderRow = '';
depth = 0;
inString = false;
escaped = false;

for (let i = 0; i < ordersData.length; i++) {
  const char = ordersData[i];

  if (escaped) {
    orderRow += char;
    escaped = false;
    continue;
  }

  if (char === '\\' && inString) {
    escaped = true;
    orderRow += char;
    continue;
  }

  if (char === "'" && ordersData[i - 1] !== '\\') {
    inString = !inString;
    orderRow += char;
    continue;
  }

  if (!inString) {
    if (char === '(') {
      if (depth === 0) orderRow = '';
      depth++;
      if (depth === 1) continue;
    } else if (char === ')') {
      depth--;
      if (depth === 0) {
        orderRows.push(orderRow);
        orderRow = '';
        continue;
      }
    }
  }

  if (depth > 0) {
    orderRow += char;
  }
}

// Map order_id to email
const orderIdToEmail = {};
for (const rowContent of orderRows) {
  const fields = parseRow(rowContent);
  if (fields.length < 8) continue;

  const orderId = fields[0];
  const billingEmail = parseValue(fields[7]);
  const status = parseValue(fields[1]);

  if (billingEmail && status && status.includes('completed')) {
    orderIdToEmail[orderId] = billingEmail.toLowerCase();
  }
}

// Build attribution data by email
const attributionByEmail = {};

for (const [orderId, meta] of Object.entries(orderMeta)) {
  const email = orderIdToEmail[orderId];
  if (!email) continue;

  if (!attributionByEmail[email]) {
    attributionByEmail[email] = {
      orders: [],
      sources: {},
      devices: {},
      total_session_pages: 0,
      total_session_count: 0,
      order_count: 0,
    };
  }

  const data = attributionByEmail[email];
  data.order_count++;

  // Extract attribution data
  const sourceType = meta['_wc_order_attribution_source_type'];
  const deviceType = meta['_wc_order_attribution_device_type'];
  const sessionPages = parseInt(meta['_wc_order_attribution_session_pages']) || 0;
  const sessionCount = parseInt(meta['_wc_order_attribution_session_count']) || 0;

  if (sourceType) {
    data.sources[sourceType] = (data.sources[sourceType] || 0) + 1;
  }

  if (deviceType) {
    data.devices[deviceType] = (data.devices[deviceType] || 0) + 1;
  }

  data.total_session_pages += sessionPages;
  data.total_session_count += sessionCount;

  data.orders.push({
    order_id: orderId,
    source: sourceType,
    device: deviceType,
    session_pages: sessionPages,
    session_count: sessionCount,
  });
}

// Calculate aggregate metrics
const finalData = {};
for (const [email, data] of Object.entries(attributionByEmail)) {
  const primarySource = Object.keys(data.sources).sort(
    (a, b) => data.sources[b] - data.sources[a]
  )[0];

  const primaryDevice = Object.keys(data.devices).sort(
    (a, b) => data.devices[b] - data.devices[a]
  )[0];

  finalData[email] = {
    // Primary acquisition channel
    primary_source: primarySource || 'unknown',
    primary_device: primaryDevice || 'unknown',

    // Engagement metrics
    avg_session_pages:
      data.order_count > 0 ? (data.total_session_pages / data.order_count).toFixed(1) : '0',
    avg_session_count:
      data.order_count > 0 ? (data.total_session_count / data.order_count).toFixed(1) : '0',

    // Source breakdown (all sources used)
    sources: data.sources,
    devices: data.devices,

    // Detailed order attribution (for dashboard)
    order_attribution: data.orders,
  };
}

console.log(`✅ Built attribution data for ${Object.keys(finalData).length} customers\n`);

// Write to JSON
const outputPath = join(root, 'order-attribution.json');
writeFileSync(outputPath, JSON.stringify(finalData, null, 2));

console.log(`📝 Wrote attribution data to order-attribution.json\n`);

// Show statistics
const sourceBreakdown = {};
const deviceBreakdown = {};

for (const data of Object.values(finalData)) {
  sourceBreakdown[data.primary_source] = (sourceBreakdown[data.primary_source] || 0) + 1;
  deviceBreakdown[data.primary_device] = (deviceBreakdown[data.primary_device] || 0) + 1;
}

console.log('Top Acquisition Sources:');
Object.entries(sourceBreakdown)
  .sort((a, b) => b[1] - a[1])
  .forEach(([source, count]) => {
    console.log(`  ${source}: ${count} customers`);
  });

console.log('\nDevice Breakdown:');
Object.entries(deviceBreakdown)
  .sort((a, b) => b[1] - a[1])
  .forEach(([device, count]) => {
    console.log(`  ${device}: ${count} customers`);
  });

console.log('\n✅ Done!\n');
