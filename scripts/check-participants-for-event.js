// scripts/check-participants-for-event.js
// Usage: node scripts/check-participants-for-event.js <event-slug>
// Prints the number of participants for a given event slug (e.g. "test-ride")

import { createClient } from '@supabase/supabase-js';
import { getKandieEventBySlug } from '../lib/wordpress.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase environment variables.');
  process.exit(1);
}

const [, , eventSlug] = process.argv;
if (!eventSlug) {
  console.error('Usage: node scripts/check-participants-for-event.js <event-slug>');
  process.exit(1);
}

async function main() {
  // 1. Get event by slug
  const event = await getKandieEventBySlug(eventSlug);
  if (!event || !event.databaseId) {
    console.error(`Event not found for slug: ${eventSlug}`);
    process.exit(1);
  }
  const eventId = event.databaseId;

  // 2. Query registrations
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from('registrations')
    .select('*')
    .eq('event_id', eventId)
    .is('cancelled_at', null);

  if (error) {
    console.error('Error querying registrations:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log(`No participants found for event "${eventSlug}" (ID: ${eventId})`);
    return;
  }

  console.log(`Participants for event "${eventSlug}" (ID: ${eventId}):`);
  data.forEach((row, i) => {
    console.log(
      `${i + 1}. ${row.first_name} ${row.last_name} (user_id: ${row.user_id}, level: ${row.ride_level})`
    );
  });
  console.log(`Total: ${data.length}`);
}

main();
