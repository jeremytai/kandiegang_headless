// Script to print all users with a Discord identity and their Discord user ID from Supabase Auth
// Usage: node scripts/list-discord-users.js

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: users, error: userError } = await supabase.auth.admin.listUsers({ perPage: 10000 });
  if (userError) {
    console.error('Error fetching users:', userError);
    process.exit(1);
  }

  let found = 0;
  for (const user of users.users) {
    const discordIdentity = user.identities?.find((i) => i.provider === 'discord');
    if (!discordIdentity) continue;
    const discordId = discordIdentity.identity_data?.id;
    const username = discordIdentity.identity_data?.username || discordIdentity.identity_data?.full_name || '';
    if (discordId) {
      found++;
      console.log(`User: ${user.email || user.id}\n  Discord ID: ${discordId}\n  Discord Username: ${username}\n  Supabase User ID: ${user.id}\n`);
    }
  }
  if (found === 0) {
    console.log('No users with Discord identity found.');
  } else {
    console.log(`Total users with Discord identity: ${found}`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
