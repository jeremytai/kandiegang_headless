/**
 * scripts/sync-woo-usermeta-to-profiles.js
 *
 * Parses a WordPress usermeta SQL dump (wp_*_usermeta), extracts WooCommerce
 * fields per user_id, and updates Supabase profiles (matched by wp_user_id).
 *
 * Requires: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env or .env.local
 * Run the migration 20250206100000_add_woo_columns_to_profiles.sql first.
 *
 * Usage:
 *   node scripts/sync-woo-usermeta-to-profiles.js [path-to-usermeta.sql]
 *
 * Example:
 *   node scripts/sync-woo-usermeta-to-profiles.js "/Users/jeremytai/Desktop/wp_kandi_db1 (1).sql"
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnv() {
  for (const name of ['.env', '.env.local']) {
    const p = join(root, name);
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      const value = m[2].trim().replace(/^["']|["']$/g, '');
      if (!(key in process.env)) process.env[key] = value;
    }
    break;
  }
}

loadEnv();

const url = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('Need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env or .env.local');
  process.exit(1);
}

const WOO_KEYS = [
  'first_name',
  'last_name',
  'billing_address_1',
  'billing_city',
  'billing_postcode',
  'billing_country',
  'billing_phone',
  'paying_customer',
];

/** Parse INSERT INTO `wp_..._usermeta` (...) VALUES (row), (row), ...; */
function parseUsermetaSql(sql) {
  const byUser = new Map(); // user_id -> { first_name, last_name, ... }

  // Match rows: (umeta_id, user_id, 'meta_key', 'meta_value')
  const rowRegex = /\(\d+,\s*(\d+),\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)'\)/g;
  let m;
  while ((m = rowRegex.exec(sql)) !== null) {
    const user_id = parseInt(m[1], 10);
    const meta_key = (m[2] || '').replace(/''/g, "'").trim();
    const meta_value = (m[3] || '').replace(/''/g, "'").trim();

    if (!WOO_KEYS.includes(meta_key)) continue;

    if (!byUser.has(user_id)) byUser.set(user_id, {});
    const row = byUser.get(user_id);

    if (meta_key === 'paying_customer') {
      row.paying_customer = meta_value === '1' || meta_value === 'true';
    } else {
      row[meta_key] = meta_value || null;
    }
  }

  return byUser;
}

async function main() {
  const sqlPath = process.argv[2] || join(root, 'scripts', 'wp_usermeta.sql');
  if (!existsSync(sqlPath)) {
    console.error('SQL file not found:', sqlPath);
    console.error('Usage: node scripts/sync-woo-usermeta-to-profiles.js [path-to-usermeta.sql]');
    process.exit(1);
  }

  const sql = readFileSync(sqlPath, 'utf8');
  const byUser = parseUsermetaSql(sql);
  console.log('Parsed', byUser.size, 'users with WooCommerce usermeta.\n');

  const supabase = createClient(url, serviceRoleKey);

  // Fetch all profiles that have wp_user_id set
  const { data: profiles, error: listError } = await supabase
    .from('profiles')
    .select('id, wp_user_id')
    .not('wp_user_id', 'is', null);

  if (listError) {
    console.error('Failed to list profiles:', listError.message);
    process.exit(1);
  }

  const byWpId = new Map(profiles.map((p) => [p.wp_user_id, p]));

  let updated = 0;
  let skipped = 0;

  for (const [wpUserId, woo] of byUser) {
    const profile = byWpId.get(wpUserId);
    if (!profile) {
      skipped++;
      continue;
    }

    const payload = {
      first_name: woo.first_name ?? null,
      last_name: woo.last_name ?? null,
      billing_address_1: woo.billing_address_1 ?? null,
      billing_city: woo.billing_city ?? null,
      billing_postcode: woo.billing_postcode ?? null,
      billing_country: woo.billing_country ?? null,
      billing_phone: woo.billing_phone ?? null,
      paying_customer: woo.paying_customer === true,
    };

    const { error: updateError } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', profile.id);

    if (updateError) {
      console.error('  Fail wp_user_id', wpUserId, updateError.message);
      continue;
    }

    console.log(
      '  Updated profile',
      profile.id.slice(0, 8) + '…',
      'wp_user_id',
      wpUserId,
      woo.first_name || woo.last_name || ''
    );
    updated++;
  }

  console.log('\nDone. Updated:', updated, '| Skipped (no matching profile):', skipped);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
