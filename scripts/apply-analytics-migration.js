import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

// Load environment variables
dotenv.config({ path: join(root, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('🔧 Applying analytics migration to Supabase...\n');

// Read migration SQL
const migrationPath = join(root, 'supabase/migrations/20260215_add_customer_analytics_fields.sql');
const migrationSQL = readFileSync(migrationPath, 'utf8');

// Create Supabase client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Execute migration
async function applyMigration() {
  try {
    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    console.log(`Executing ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;

      console.log(`[${i + 1}/${statements.length}] Executing...`);

      const { error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        // Check if error is "already exists" - these are safe to ignore
        if (error.message?.includes('already exists') ||
            error.message?.includes('does not exist') ||
            error.code === '42701' || // duplicate column
            error.code === '42710') { // duplicate policy/object
          console.log(`  ⚠️  Skipped (already exists): ${error.message}`);
        } else {
          console.error(`  ❌ Error: ${error.message}`);
          throw error;
        }
      } else {
        console.log(`  ✅ Success`);
      }
    }

    console.log('\n✅ Migration applied successfully!\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

applyMigration();
