import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

dotenv.config({ path: join(root, '.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CORRECT_MEMBER_PRICE_ID = 'price_1SxpImDrD9kD3TjHqDYwfmyY';
const OLD_PRICE_ID = 'price_1T1TpADrD9kD3TjH2el8Sw9D';

console.log('🔄 Updating subscription prices to correct member renewal price...\n');

async function updateSubscriptionPrices() {
  // Get all profiles with stripe_subscription_id
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('email, stripe_subscription_id, stripe_price_id')
    .not('stripe_subscription_id', 'is', null)
    .eq('stripe_price_id', OLD_PRICE_ID);

  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }

  console.log(`Found ${profiles.length} subscriptions to update\n`);

  let updated = 0;
  let errors = 0;

  for (const profile of profiles) {
    try {
      console.log(`[${profile.email}]`);

      // Get the subscription
      const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);

      if (!subscription || subscription.status === 'canceled') {
        console.log(`  ⚠️  Subscription not found or canceled, skipping`);
        continue;
      }

      // Get the subscription item (first item)
      const subscriptionItem = subscription.items.data[0];

      if (!subscriptionItem) {
        console.log(`  ⚠️  No subscription items found`);
        continue;
      }

      // Update the subscription item to use the correct price
      await stripe.subscriptionItems.update(subscriptionItem.id, {
        price: CORRECT_MEMBER_PRICE_ID,
        proration_behavior: 'none', // Don't prorate since we're just fixing the price
      });

      // Update Supabase
      await supabase
        .from('profiles')
        .update({ stripe_price_id: CORRECT_MEMBER_PRICE_ID })
        .eq('email', profile.email);

      console.log(`  ✅ Updated to member renewal price`);
      updated++;
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n===========================================`);
  console.log(`✅ Updated: ${updated}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`===========================================\n`);
}

updateSubscriptionPrices();
