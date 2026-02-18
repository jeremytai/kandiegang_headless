import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '/Users/jeremytai/Documents/Git/kandiegang_headless/.env.local' });
dotenv.config({ path: '/Users/jeremytai/Documents/Git/kandiegang_headless/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const sql = readFileSync(
  '/Users/jeremytai/Documents/Git/kandiegang_headless/supabase/migrations/20260218000000_add_missing_analytics_columns.sql',
  'utf8'
);

// Run as a single statement block (all ADD COLUMN IF NOT EXISTS are safe)
const { error } = await supabase.rpc('exec_sql', { sql });

if (error) {
  // exec_sql RPC might not exist — fall back to individual statements
  console.warn('exec_sql RPC failed:', error.message);
  console.log('\nFalling back to statement-by-statement execution...\n');

  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    const { error: stmtError } = await supabase.rpc('exec_sql', { sql: stmt });
    if (stmtError) {
      if (stmtError.code === '42701' || stmtError.message?.includes('already exists')) {
        console.log('  ⚠️  Already exists, skipping');
      } else {
        console.error('  ❌', stmtError.message);
      }
    } else {
      console.log('  ✅', stmt.slice(0, 60).replace(/\n/g, ' ') + '...');
    }
  }
} else {
  console.log('✅ Migration applied successfully');
}
