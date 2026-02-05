/**
 * scripts/check-profiles-table.js
 * Verifies the public.profiles table exists and is reachable.
 *
 * Usage (from project root):
 *   node scripts/check-profiles-table.js
 *
 * Requires: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY in .env or .env.local
 *
 * Optional: SUPABASE_SERVICE_ROLE_KEY in .env (never commit) to list all
 * profile rows; without it we only confirm the table is queryable (anon sees 0 rows due to RLS).
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnv() {
  for (const name of ['.env', '.env.local']) {
    const path = join(root, name);
    if (!existsSync(path)) continue;
    const raw = readFileSync(path, 'utf8');
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
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey) {
  console.error('Missing Supabase env. Set in .env or .env.local:');
  if (!url) console.error('  VITE_SUPABASE_URL=https://your-project.supabase.co');
  if (!anonKey) console.error('  VITE_SUPABASE_ANON_KEY=your_anon_key');
  process.exit(1);
}

const supabase = createClient(url, anonKey);

async function main() {
  // 1) Query with anon key (no session → RLS returns 0 rows; no error = table exists)
  const { data: anonData, error: anonError } = await supabase
    .from('profiles')
    .select('id, email, display_name, is_member, membership_source');

  if (anonError) {
    console.error('Profiles table check failed:', anonError.message);
    if (anonError.code === '42P01') {
      console.error('\nThe table does not exist yet. Run the migration first:');
      console.error('  Supabase Dashboard → SQL Editor → paste supabase/migrations/20250205000000_create_profiles_table.sql');
      console.error('  Or: supabase db push');
    }
    process.exit(1);
  }

  console.log('Profiles table OK (reachable with anon key).');
  console.log('  Rows visible to anon (no session):', anonData.length);

  // 2) If service role key is set, list all rows (for local dev verification)
  if (serviceKey) {
    const serviceClient = createClient(url, serviceKey);
    const { data: rows, error: serviceError } = await serviceClient
      .from('profiles')
      .select('id, email, display_name, wp_user_id, is_member, membership_source')
      .order('id');

    if (serviceError) {
      console.warn('  (Service role list failed:', serviceError.message + ')');
      process.exit(0);
    }
    console.log('  Total rows in profiles (service role):', rows.length);
    if (rows.length > 0) {
      console.log('\n  Sample:');
      rows.slice(0, 5).forEach((r, i) => {
        console.log('   ', i + 1, r.email || r.id, '| is_member:', r.is_member, '|', r.membership_source || '—');
      });
    }
  } else {
    console.log('  (Set SUPABASE_SERVICE_ROLE_KEY in .env to list all rows; do not commit it.)');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
