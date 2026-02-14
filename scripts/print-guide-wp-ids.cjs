// scripts/print-guide-wp-ids.js
// Prints the current user's Supabase profile and the guide IDs for all event levels for manual verification.

const { createClient } = require('@supabase/supabase-js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const WP_GRAPHQL_URL = process.env.VITE_WP_GRAPHQL_URL || process.env.WP_GRAPHQL_URL || 'https://wp-origin.kandiegang.com/graphql';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase config');
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // 1. Print all guide profiles from Supabase
  const { data: profiles, error } = await adminClient
    .from('profiles')
    .select('id, email, display_name, wp_user_id, is_guide')
    .eq('is_guide', true);
  if (error) {
    console.error('Error fetching profiles:', error);
    process.exit(1);
  }
  console.log('Supabase guide profiles:');
  profiles.forEach((p) => {
    console.log(`- ${p.display_name || p.email} (id: ${p.id}, wp_user_id: ${p.wp_user_id})`);
  });

  // 2. Print all guide IDs for each level from WordPress
  const query = `
    query AllRideLevels {
      rideEvents(first: 10) {
        nodes {
          databaseId
          title
          eventDetails {
            level1 { guides { nodes { ... on RideGuide { databaseId title } } } }
            level2 { guides { nodes { ... on RideGuide { databaseId title } } } }
            level2plus { guides { nodes { ... on RideGuide { databaseId title } } } }
            level3 { guides { nodes { ... on RideGuide { databaseId title } } } }
          }
        }
      }
    }
  `;
  const response = await fetch(WP_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const json = await response.json();
  if (!json.data) {
    console.error('Error fetching WordPress data:', json.errors || json);
    process.exit(1);
  }
  console.log('\nWordPress event guide IDs:');
  json.data.rideEvents.nodes.forEach((event) => {
    console.log(`\nEvent: ${event.title} (ID: ${event.databaseId})`);
    ['level1', 'level2', 'level2plus', 'level3'].forEach((levelKey) => {
      const guides = event.eventDetails?.[levelKey]?.guides?.nodes || [];
      if (guides.length) {
        console.log(`  ${levelKey}:`);
        guides.forEach((g) => {
          console.log(`    - ${g.title} (databaseId: ${g.databaseId})`);
        });
      }
    });
  });
}

main();
