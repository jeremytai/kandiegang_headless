// Script to copy the Discord user ID from one Supabase Auth user to another user's profile
// Usage: node scripts/copy-discord-id.js <from_uid> <to_uid>

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const fromUid = process.argv[2];
const toUid = process.argv[3];
if (!fromUid || !toUid) {
  console.error('Usage: node scripts/copy-discord-id.js <from_uid> <to_uid>');
  process.exit(1);
}

async function main() {
  // Get the Discord user ID from the source user
  const { data, error: fromError } = await supabase.auth.admin.getUserById(fromUid);
  const fromUser = data?.user || data; // handle both { user } and direct user object
  if (fromError || !fromUser) {
    console.error('Error fetching source user:', fromError || 'User not found');
    process.exit(1);
  }
  const identities = fromUser.identities || fromUser.user?.identities;
  if (!identities) {
    console.error('No identities array found on source user.');
    process.exit(1);
  }
  const discordIdentity = identities.find((i) => i.provider === 'discord');
  if (!discordIdentity) {
    console.error('Source user does not have a Discord identity.');
    process.exit(1);
  }
  const discordId = discordIdentity.id;
  if (!discordId) {
    console.error('Discord ID not found in source user.');
    process.exit(1);
  }

  // Update the target user's profile with the Discord ID
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ discord_id: discordId })
    .eq('id', toUid);
  if (updateError) {
    console.error('Error updating target profile:', updateError);
    process.exit(1);
  }
  console.log(`Successfully set discord_id (${discordId}) on profile ${toUid}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
