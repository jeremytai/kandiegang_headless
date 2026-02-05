/**
 * scripts/check-supabase.js
 * Verifies Supabase env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) and connectivity.
 *
 * Usage (from project root):
 *   node scripts/check-supabase.js
 *
 * Loads .env or .env.local from project root so you don't need to export vars by hand.
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

if (!url || !anonKey) {
  console.error('Missing Supabase env. Set in .env or .env.local:');
  if (!url) console.error('  VITE_SUPABASE_URL=https://your-project.supabase.co');
  if (!anonKey) console.error('  VITE_SUPABASE_ANON_KEY=your_anon_key');
  process.exit(1);
}

if (!url.startsWith('https://')) {
  console.error('VITE_SUPABASE_URL should start with https://');
  process.exit(1);
}

console.log('Env OK: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set.');
console.log('Checking Supabase connectivity…');

const supabase = createClient(url, anonKey);

supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('Supabase auth check failed:', error.message);
    process.exit(1);
  }
  console.log('Supabase OK: project reachable, anon key valid.');
  if (data.session) {
    console.log('  (You have an existing session; no action needed.)');
  } else {
    console.log('  (No session; login will create one.)');
  }
  process.exit(0);
}).catch((err) => {
  console.error('Supabase request failed:', err.message || err);
  process.exit(1);
});
