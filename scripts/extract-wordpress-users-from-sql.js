import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

console.log('📖 Extracting WordPress user data from SQL dump...\n');

// Read SQL dump
const sqlPath = '/Users/jeremytai/Desktop/wp_kandi_db1.sql';
const sqlContent = readFileSync(sqlPath, 'utf8');

// Find the wp_uv3hmh_users INSERT INTO statement
const usersMatch = sqlContent.match(/INSERT INTO `wp_uv3hmh_users`[^V]+VALUES\s+(.*?);/s);
if (!usersMatch) {
  console.error('❌ Could not find wp_uv3hmh_users INSERT INTO statement');
  process.exit(1);
}

const usersData = usersMatch[1];

// Parse the SQL INSERT values
// WordPress wp_users structure:
// ID, user_login, user_pass, user_nicename, user_email, user_url, user_registered, user_activation_key, user_status, display_name
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

// Split by rows: (...)
const rowMatches = usersData.match(/\([^)]+\)/g);
if (!rowMatches) {
  console.error('❌ Could not parse user rows');
  process.exit(1);
}

console.log(`Found ${rowMatches.length} user entries in SQL dump\n`);

const users = [];
const testingEmails = new Set();

for (const rowMatch of rowMatches) {
  const rowContent = rowMatch.slice(1, -1); // Remove ( and )
  const fields = parseRow(rowContent);

  if (fields.length < 10) {
    console.warn(`⚠️  Skipping malformed row with ${fields.length} fields`);
    continue;
  }

  const userId = fields[0];
  const userLogin = parseValue(fields[1]);
  const userEmail = parseValue(fields[4]);
  const userRegistered = parseValue(fields[6]);
  const displayName = parseValue(fields[9]);

  // Skip testing accounts
  if (userEmail && userEmail.toLowerCase().includes('testing@example.com')) {
    testingEmails.add(userEmail);
    continue;
  }

  // Skip if no email
  if (!userEmail) {
    console.warn(`⚠️  Skipping user ${userId} with no email`);
    continue;
  }

  users.push({
    wpUserId: userId,
    email: userEmail.toLowerCase(),
    userLogin: userLogin,
    userRegistered: userRegistered,
    displayName: displayName,
  });
}

console.log(`✅ Extracted ${users.length} real user accounts`);
console.log(`🗑️  Filtered out ${testingEmails.size} testing accounts\n`);

// Create a lookup by email
const usersByEmail = {};
for (const user of users) {
  usersByEmail[user.email] = {
    wp_user_id: user.wpUserId,
    user_login: user.userLogin,
    user_registered: user.userRegistered,
    display_name: user.displayName,
  };
}

// Write to JSON file
const outputPath = join(root, 'wordpress-users.json');
writeFileSync(outputPath, JSON.stringify(usersByEmail, null, 2));

console.log(
  `📝 Wrote WordPress user data for ${Object.keys(usersByEmail).length} users to wordpress-users.json\n`
);

// Show some sample entries
console.log('Sample entries:');
const sampleEmails = Object.keys(usersByEmail).slice(0, 5);
for (const email of sampleEmails) {
  const data = usersByEmail[email];
  console.log(`  ${email}:`);
  console.log(`    Username: ${data.user_login}`);
  console.log(`    Registered: ${data.user_registered}`);
  console.log(`    Display Name: ${data.display_name || '(none)'}`);
}

console.log('\n✅ Done! Use this data in the migration script.\n');
