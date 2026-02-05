/**
 * scripts/migrate-wp-users-to-supabase.js
 *
 * Reads a WordPress users SQL dump (phpMyAdmin style), parses member rows,
 * and creates matching Supabase Auth users + profile rows (wp_user_id, is_member, membership_source).
 *
 * Requires: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env or .env.local
 * Passwords are NOT migrated; each user gets a random temp password (they must use "Forgot password").
 *
 * Usage (from project root):
 *   node scripts/migrate-wp-users-to-supabase.js [path-to-wp-users.sql]
 *
 * Example:
 *   node scripts/migrate-wp-users-to-supabase.js ~/Desktop/wp_kandi_db1.sql
 *
 * Skips rows where user_login starts with "testing" or user_email contains "testing@example.com".
 * Skips emails that already exist in Supabase Auth (idempotent).
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

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

/** Parse INSERT INTO `wp_..._users` (...) VALUES (row1), (row2), ...; */
function parseWpUsersSql(sql) {
  const rows = [];
  // Match: (ID, 'login', 'pass', 'nicename', 'email', 'url', 'date', 'key', status, 'display_name')
  const rowRegex = /\((\d+),\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*(\d+),\s*'((?:[^']|'')*)'\)/g;
  let m;
  while ((m = rowRegex.exec(sql)) !== null) {
    const unescape = (s) => (s || '').replace(/''/g, "'").trim();
    rows.push({
      wp_id: parseInt(m[1], 10),
      user_login: unescape(m[2]),
      user_email: unescape(m[5]),
      display_name: unescape(m[10]),
    });
  }
  return rows;
}

function isTestAccount(row) {
  if (row.user_login.toLowerCase().startsWith('testing')) return true;
  if (row.user_email.toLowerCase().includes('testing@example.com')) return true;
  return false;
}

function randomPassword(length = 24) {
  return randomBytes(length).toString('base64').replace(/[+/=]/g, 'x').slice(0, length);
}

async function main() {
  const sqlPath = process.argv[2] || join(root, 'scripts', 'wp_kandi_db1.sql');
  if (!existsSync(sqlPath)) {
    console.error('SQL file not found:', sqlPath);
    console.error('Usage: node scripts/migrate-wp-users-to-supabase.js [path-to-wp-users.sql]');
    process.exit(1);
  }

  const sql = readFileSync(sqlPath, 'utf8');
  const allRows = parseWpUsersSql(sql);
  const members = allRows.filter((r) => !isTestAccount(r));

  console.log('Parsed', allRows.length, 'rows from SQL;', members.length, 'non-test members to migrate.\n');

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of members) {
    const email = row.user_email;
    if (!email) {
      console.warn('  Skip WP ID', row.wp_id, ': no email');
      skipped++;
      continue;
    }

    const password = randomPassword();
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: row.display_name || row.user_login },
    });

    if (authError) {
      if (authError.message?.toLowerCase().includes('already') || authError.message?.toLowerCase().includes('registered')) {
        console.log('  Skip (exists):', email);
        skipped++;
      } else {
        console.error('  Fail:', email, authError.message);
        failed++;
      }
      continue;
    }

    const userId = authData.user?.id;
    if (!userId) {
      console.error('  Fail:', email, 'no user id returned');
      failed++;
      continue;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        wp_user_id: row.wp_id,
        is_member: true,
        membership_source: 'wordpress',
        display_name: row.display_name || null,
      })
      .eq('id', userId);

    if (profileError) {
      console.warn('  User created but profile update failed:', email, profileError.message);
    }

    console.log('  Created:', email, '(WP ID', row.wp_id + ')');
    created++;
  }

  console.log('\nDone. Created:', created, '| Skipped:', skipped, '| Failed:', failed);
  if (created > 0) {
    console.log('\nMembers must use "Forgot password" on the login page to set a new password.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
