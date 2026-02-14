// Script to backfill discord_id in Supabase profiles table for users who have a Discord identity but null discord_id.
// Usage: node scripts/backfill-discord-ids.js


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
  // 1. Get all users with Discord identity
  const { data: users, error: userError } = await supabase.auth.admin.listUsers({ perPage: 10000 });
  if (userError) {
    console.error('Error fetching users:', userError);
    process.exit(1);
  }

  let updated = 0;
  for (const user of users.users) {
    const discordIdentity = user.identities?.find((i) => i.provider === 'discord');
    if (!discordIdentity) continue;
    // Use the id field from the Discord identity object (this is the Discord user ID)
    const discordId = discordIdentity.id;
    if (!discordId) continue;

    // 2. Check if profile.discord_id is null
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('discord_id')
      .eq('id', user.id)
      .single();
    if (profileError || !profile) continue;
    if (profile.discord_id) continue; // Already set

    // 3. Update discord_id
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ discord_id: discordId })
      .eq('id', user.id);
    if (!updateError) updated++;
  }
  console.log(`Backfill complete. Updated ${updated} profiles.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
