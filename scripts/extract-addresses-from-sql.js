#!/usr/bin/env node

/**
 * extract-addresses-from-sql.js
 *
 * Extracts phone numbers and addresses from WordPress SQL dumps
 * Outputs a JSON mapping: email -> {phone, address}
 */

import { readFileSync, writeFileSync } from 'fs';

const sqlFiles = [
  '/Users/jeremytai/Desktop/wp_kandi_db1 (2).sql',
  '/Users/jeremytai/Desktop/wp_kandi_db1 (1).sql',
  '/Users/jeremytai/Desktop/wp_kandi_db1.sql',
];

// Parse SQL INSERT INTO statements for wc_order_addresses
function extractAddresses(sqlContent) {
  const addresses = [];

  // Find INSERT INTO statements for wc_order_addresses
  const insertRegex = /INSERT INTO `wp_\w+_wc_order_addresses`[^;]+;/g;
  const matches = sqlContent.match(insertRegex) || [];

  for (const match of matches) {
    // Extract VALUES section
    const valuesMatch = match.match(/VALUES\s+(.+);$/s);
    if (!valuesMatch) continue;

    const valuesStr = valuesMatch[1];

    // Parse rows: (id, order_id, type, first, last, company, addr1, addr2, city, state, zip, country, email, phone)
    const rowRegex = /\(([^)]+(?:\([^)]*\)[^)]*)*)\)/g;
    let rowMatch;

    while ((rowMatch = rowRegex.exec(valuesStr)) !== null) {
      const rowStr = rowMatch[1];

      // Split by comma but respect quoted strings and NULL
      const fields = [];
      let current = '';
      let inQuotes = false;
      let escapeNext = false;

      for (let i = 0; i < rowStr.length; i++) {
        const char = rowStr[i];

        if (escapeNext) {
          current += char;
          escapeNext = false;
          continue;
        }

        if (char === '\\') {
          escapeNext = true;
          current += char;
          continue;
        }

        if (char === "'") {
          inQuotes = !inQuotes;
          continue;
        }

        if (char === ',' && !inQuotes) {
          fields.push(current.trim());
          current = '';
          continue;
        }

        current += char;
      }
      fields.push(current.trim());

      // Expected fields: id, order_id, address_type, first_name, last_name, company,
      //                  address_1, address_2, city, state, postcode, country, email, phone
      if (fields.length >= 14) {
        const email = fields[12] === 'NULL' ? null : fields[12];
        const phone = fields[13] === 'NULL' ? null : fields[13];
        const addressType = fields[2] === 'NULL' ? null : fields[2];

        // Only process billing addresses with email
        if (addressType && email && addressType !== 'shipping') {
          addresses.push({
            email: email.toLowerCase(),
            firstName: fields[3] === 'NULL' ? null : fields[3],
            lastName: fields[4] === 'NULL' ? null : fields[4],
            company: fields[5] === 'NULL' ? null : fields[5],
            address1: fields[6] === 'NULL' ? null : fields[6],
            address2: fields[7] === 'NULL' ? null : fields[7],
            city: fields[8] === 'NULL' ? null : fields[8],
            state: fields[9] === 'NULL' ? null : fields[9],
            postcode: fields[10] === 'NULL' ? null : fields[10],
            country: fields[11] === 'NULL' ? null : fields[11],
            phone: phone,
          });
        }
      }
    }
  }

  return addresses;
}

// Main execution
console.log('📦 Extracting address data from SQL dumps...\n');

const allAddresses = [];

for (const sqlFile of sqlFiles) {
  try {
    console.log(`Reading: ${sqlFile}`);
    const content = readFileSync(sqlFile, 'utf8');
    const addresses = extractAddresses(content);
    console.log(`  Found ${addresses.length} billing addresses`);
    allAddresses.push(...addresses);
  } catch (err) {
    console.log(`  ⚠️  File not found or error: ${err.message}`);
  }
}

console.log(`\n✅ Total addresses extracted: ${allAddresses.length}`);

// Create email -> address mapping (use most recent address per email)
const addressMap = {};
for (const addr of allAddresses) {
  addressMap[addr.email] = addr;
}

console.log(`📧 Unique emails: ${Object.keys(addressMap).length}\n`);

// Save to JSON
const outputPath = 'address-data.json';
writeFileSync(outputPath, JSON.stringify(addressMap, null, 2));
console.log(`💾 Saved to: ${outputPath}`);

// Show sample
const sampleEmails = Object.keys(addressMap).slice(0, 5);
console.log('\n📋 Sample data:');
for (const email of sampleEmails) {
  const addr = addressMap[email];
  console.log(`\n${addr.firstName} ${addr.lastName} <${email}>`);
  if (addr.phone) console.log(`  📞 ${addr.phone}`);
  if (addr.address1)
    console.log(`  📍 ${addr.address1}, ${addr.city} ${addr.postcode}, ${addr.country}`);
}
