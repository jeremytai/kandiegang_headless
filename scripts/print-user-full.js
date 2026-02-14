// Script to print the full user object for a given UID for manual inspection
// Usage: node scripts/print-user-full.js <user_id>

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: node scripts/print-user-full.js <user_id>');
  process.exit(1);
}

async function main() {
  const { data: user, error } = await supabase.auth.admin.getUserById(userId);
  if (error) {
    console.error('Error fetching user:', error);
    process.exit(1);
  }
  if (!user) {
    console.log('User not found.');
    process.exit(0);
  }
  console.log(JSON.stringify(user, null, 2));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
