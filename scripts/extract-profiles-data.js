import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

console.log('📊 Extracting customer profile data from profiles.csv...\n');

// Read profiles CSV
const csvPath = '/Users/jeremytai/Desktop/profiles.csv';
const csvContent = readFileSync(csvPath, 'utf8');

// Parse CSV with proper quote handling
function parseCSV(content) {
  const lines = content.split('\n');
  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      rows.push(row);
    }
  }

  return { headers, rows };
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current); // Add last value
  return values;
}

function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;

  // Parse format: "April 8, 2023 at 9:49:48 AM CEST"
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;

  return date.toISOString();
}

function parseNumber(numStr) {
  if (!numStr || numStr.trim() === '') return 0;
  return parseFloat(numStr.replace(/[^0-9.-]/g, '')) || 0;
}

const { rows } = parseCSV(csvContent);

console.log(`Found ${rows.length} customer profiles in CSV\n`);

const profilesByEmail = {};
let withOrders = 0;
let withMembership = 0;

for (const row of rows) {
  const email = row.Email?.toLowerCase();
  if (!email) continue;

  const orderCount = parseInt(row['Order Count']) || 0;
  const totalSpent = parseNumber(row['Total Spent']);
  const hasMembership = row['Member Areas']?.includes('Kandie Gang');

  if (orderCount > 0) withOrders++;
  if (hasMembership) withMembership++;

  profilesByEmail[email] = {
    // Order metrics
    order_count: orderCount,
    total_spent: totalSpent,
    last_order_date: parseDate(row['Last Order Date']),
    customer_since: parseDate(row['Customer Since']),

    // Membership info
    member_since: parseDate(row['Member Since']),
    member_areas: row['Member Areas'] || '',
    subscriber_source: row['Subscriber Source'] || '',

    // Marketing
    accepts_marketing: row['Accepts Marketing'] === 'true',
    tags: row.Tags || '',
    mailing_lists: row['Mailing Lists'] || '',

    // Shipping address (may be more complete than billing)
    shipping_name: row['Shipping Name'] || '',
    shipping_address1: row['Shipping Address 1'] || '',
    shipping_address2: row['Shipping Address 2'] || '',
    shipping_city: row['Shipping City'] || '',
    shipping_zip: row['Shipping Zip'] || '',
    shipping_state: row['Shipping Province/State'] || '',
    shipping_country: row['Shipping Country'] || '',
    shipping_phone: row['Shipping Phone Number'] || '',

    // Billing info
    billing_name: row['Billing Name'] || '',
    billing_phone: row['Billing Phone Number'] || '',
  };
}

console.log(`✅ Extracted ${Object.keys(profilesByEmail).length} customer profiles`);
console.log(`📦 ${withOrders} customers with orders`);
console.log(`🎫 ${withMembership} customers with memberships\n`);

// Write to JSON
const outputPath = join(root, 'customer-profiles.json');
writeFileSync(outputPath, JSON.stringify(profilesByEmail, null, 2));

console.log(`📝 Wrote customer profile data to customer-profiles.json\n`);

// Show some sample entries with orders
console.log('Sample customers with orders:');
const samplesWithOrders = Object.entries(profilesByEmail)
  .filter(([_, data]) => data.order_count > 0)
  .slice(0, 5);

for (const [email, data] of samplesWithOrders) {
  console.log(`  ${email}:`);
  console.log(`    Orders: ${data.order_count}, Total: €${data.total_spent.toFixed(2)}`);
  console.log(`    Last order: ${data.last_order_date ? new Date(data.last_order_date).toISOString().split('T')[0] : 'N/A'}`);
  console.log(`    Member areas: ${data.member_areas || 'None'}`);
  console.log(`    Accepts marketing: ${data.accepts_marketing}`);
}

console.log('\n✅ Done!\n');
