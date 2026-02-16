import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

console.log('📦 Extracting order history from SQL dump...\n');

// Read SQL dump
const sqlPath = '/Users/jeremytai/Desktop/wp_kandi_db1 (2).sql';
const sqlContent = readFileSync(sqlPath, 'utf8');

// Find the wp_uv3hmh_wc_orders INSERT INTO statement
const ordersMatch = sqlContent.match(/INSERT INTO `wp_uv3hmh_wc_orders`[^V]+VALUES\s+(.*?);/s);
if (!ordersMatch) {
  console.error('❌ Could not find wp_uv3hmh_wc_orders INSERT INTO statement');
  process.exit(1);
}

const ordersData = ordersMatch[1];

// Parse SQL INSERT values
const parseValue = (val) => {
  if (val === 'NULL' || val === null) return null;
  // Remove quotes and unescape
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

// Split by rows - look for patterns like "),\n(" or start with "("
const rows = [];
let currentRow = '';
let depth = 0;
let inString = false;
let escaped = false;

for (let i = 0; i < ordersData.length; i++) {
  const char = ordersData[i];
  const prevChar = i > 0 ? ordersData[i - 1] : '';

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

  if (char === "'" && prevChar !== '\\') {
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
      if (depth === 1) continue; // Skip the opening paren
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

if (!rows.length) {
  console.error('❌ Could not parse order rows');
  process.exit(1);
}

const rowMatches = rows;

console.log(`Found ${rowMatches.length} orders in SQL dump\n`);

const orders = [];

for (const rowContent of rowMatches) {
  const fields = parseRow(rowContent);

  if (fields.length < 17) {
    console.warn(`⚠️  Skipping malformed row with ${fields.length} fields`);
    continue;
  }

  // wp_uv3hmh_wc_orders structure:
  // id, status, currency, type, tax_amount, total_amount, customer_id, billing_email,
  // date_created_gmt, date_updated_gmt, parent_order_id, payment_method, payment_method_title,
  // transaction_id, ip_address, user_agent, customer_note

  const orderId = fields[0];
  const status = parseValue(fields[1]);
  const currency = parseValue(fields[2]);
  const totalAmount = parseFloat(parseValue(fields[5])) || 0;
  const billingEmail = parseValue(fields[7]);
  const dateCreated = parseValue(fields[8]);
  const paymentMethod = parseValue(fields[11]);
  const paymentMethodTitle = parseValue(fields[12]);
  const transactionId = parseValue(fields[13]);

  // Only include completed orders
  if (!status || !status.includes('completed')) {
    continue;
  }

  // Skip orders without email
  if (!billingEmail) {
    continue;
  }

  orders.push({
    order_id: orderId,
    status: status,
    currency: currency,
    total: totalAmount,
    email: billingEmail.toLowerCase(),
    date: dateCreated,
    payment_method: paymentMethod,
    payment_method_title: paymentMethodTitle,
    transaction_id: transactionId,
  });
}

console.log(`✅ Extracted ${orders.length} completed orders\n`);

// Group by email and calculate metrics
const ordersByEmail = {};
const orderHistoryByEmail = {};

for (const order of orders) {
  const email = order.email;

  // Initialize if first order for this email
  if (!ordersByEmail[email]) {
    ordersByEmail[email] = {
      order_count: 0,
      total_spent: 0,
      first_order_date: order.date,
      last_order_date: order.date,
      orders: [],
    };
  }

  const customerData = ordersByEmail[email];

  // Update metrics
  customerData.order_count++;
  customerData.total_spent += order.total;

  // Update first/last order dates
  if (!customerData.first_order_date || order.date < customerData.first_order_date) {
    customerData.first_order_date = order.date;
  }
  if (!customerData.last_order_date || order.date > customerData.last_order_date) {
    customerData.last_order_date = order.date;
  }

  // Add to order history
  customerData.orders.push({
    id: order.order_id,
    date: order.date,
    total: order.total,
    currency: order.currency,
    status: order.status,
    payment_method: order.payment_method_title || order.payment_method,
    transaction_id: order.transaction_id,
  });
}

// Calculate average order value and create final output
for (const email in ordersByEmail) {
  const data = ordersByEmail[email];
  data.avg_order_value = data.order_count > 0 ? data.total_spent / data.order_count : 0;

  // Sort orders by date (newest first)
  data.orders.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // Store full order history separately
  orderHistoryByEmail[email] = {
    order_count: data.order_count,
    total_spent: data.total_spent,
    avg_order_value: data.avg_order_value,
    first_order_date: data.first_order_date,
    last_order_date: data.last_order_date,
    orders: data.orders,
  };
}

console.log(`📊 Order metrics for ${Object.keys(orderHistoryByEmail).length} customers\n`);

// Write to JSON
const outputPath = join(root, 'order-history.json');
writeFileSync(outputPath, JSON.stringify(orderHistoryByEmail, null, 2));

console.log(`📝 Wrote order history to order-history.json\n`);

// Show some statistics
const allOrders = Object.values(orderHistoryByEmail);
const totalRevenue = allOrders.reduce((sum, c) => sum + c.total_spent, 0);
const avgLifetimeValue = totalRevenue / allOrders.length;
const maxSpender = allOrders.reduce((max, c) => (c.total_spent > max.total_spent ? c : max));

console.log('Statistics:');
console.log(`  Total customers: ${allOrders.length}`);
console.log(`  Total orders: ${allOrders.reduce((sum, c) => sum + c.order_count, 0)}`);
console.log(`  Total revenue: €${totalRevenue.toFixed(2)}`);
console.log(`  Avg lifetime value: €${avgLifetimeValue.toFixed(2)}`);
console.log(
  `  Highest spender: €${maxSpender.total_spent.toFixed(2)} (${maxSpender.order_count} orders)\n`
);

// Show sample customers with multiple orders
console.log('Sample customers with multiple orders:');
const multiOrderCustomers = Object.entries(orderHistoryByEmail)
  .filter(([_, data]) => data.order_count > 1)
  .slice(0, 5);

for (const [email, data] of multiOrderCustomers) {
  console.log(`  ${email}:`);
  console.log(
    `    Orders: ${data.order_count}, Total: €${data.total_spent.toFixed(2)}, Avg: €${data.avg_order_value.toFixed(2)}`
  );
  console.log(`    First: ${data.first_order_date}, Last: ${data.last_order_date}`);
  console.log(
    `    Recent orders: ${data.orders
      .slice(0, 2)
      .map((o) => `€${o.total} on ${o.date}`)
      .join(', ')}`
  );
}

console.log('\n✅ Done!\n');
