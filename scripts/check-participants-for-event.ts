// scripts/check-participants-for-event.ts
// Usage: npx ts-node scripts/check-participants-for-event.ts <event-slug>
// Prints the number of participants for a given event slug (e.g. "test-ride")

import { createClient } from '@supabase/supabase-js';
import { getKandieEventBySlug } from '../lib/wordpress.ts';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase environment variables.');
  process.exit(1);
}

const [, , eventSlug] = process.argv;
if (!eventSlug) {
  console.error('Usage: npx ts-node scripts/check-participants-for-event.ts <event-slug>');
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
    const name = [row.first_name, row.last_name].filter(Boolean).join(' ');
    if (!row.first_name && !row.last_name) {
      console.log(
        `${i + 1}. (NO NAME) user_id: ${row.user_id}, level: ${row.ride_level}, RAW:`,
        row
      );
    } else {
      console.log(`${i + 1}. ${name} (user_id: ${row.user_id}, level: ${row.ride_level})`);
    }
  });
  console.log(`Total: ${data.length}`);
}

main();
