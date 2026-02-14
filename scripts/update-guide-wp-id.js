// scripts/update-guide-wp-id.js
// Updates the current user's Supabase profile wp_user_id to match the correct WordPress guide databaseId.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase config');
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // Find Jeremy's profile (by email or display_name)
  const { data: profiles, error } = await adminClient
    .from('profiles')
    .select('id, email, display_name, wp_user_id')
    .eq('display_name', 'Jeremy');
  if (error || !profiles || profiles.length === 0) {
    console.error('Could not find Jeremy profile:', error || 'Not found');
    process.exit(1);
  }
  const profile = profiles[0];
  const correctWpId = 12958; // From WordPress guide databaseId
  if (profile.wp_user_id == correctWpId) {
    console.log('Profile already has correct wp_user_id:', correctWpId);
    return;
  }
  const { error: updateError } = await adminClient
    .from('profiles')
    .update({ wp_user_id: correctWpId })
    .eq('id', profile.id);
  if (updateError) {
    console.error('Failed to update profile:', updateError);
    process.exit(1);
  }
  console.log(
    `Updated profile ${profile.display_name} (id: ${profile.id}) wp_user_id to ${correctWpId}`
  );
}

main();
