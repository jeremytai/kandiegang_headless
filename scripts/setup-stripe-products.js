/**
 * scripts/setup-stripe-products.js
 *
 * Creates Stripe Products and Prices for membership tiers.
 * Run once to set up Stripe catalog.
 *
 * Usage: node scripts/setup-stripe-products.js
 */

import Stripe from 'stripe';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Load environment variables
function loadEnv() {
  for (const name of ['.env', '.env.local']) {
    const p = join(root, name);
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      const value = m[2].trim().replace(/^["']|["']$/g, '');
      if (!(key in process.env)) process.env[key] = value;
    }
    break;
  }
}

loadEnv();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error('STRIPE_SECRET_KEY not found in environment');
  console.error('\nPlease add it to .env or .env.local');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' });

async function setupProducts() {
  console.log('\n===========================================');
  console.log('Stripe Product & Price Setup');
  console.log('===========================================\n');

  if (stripeSecretKey.startsWith('sk_test_')) {
    console.log('⚠️  Using TEST mode\n');
  } else if (stripeSecretKey.startsWith('sk_live_')) {
    console.log('✅ Using LIVE mode\n');
  }

  // Product 1: Club Membership
  console.log('Creating Club Membership Product...');

  const clubProduct = await stripe.products.create({
    name: 'Kandie Gang Cycling Club Membership',
    description:
      'Annual membership to Kandie Gang Cycling Club with access to exclusive events, content, and community',
    metadata: {
      product_slug: 'kandie-gang-cycling-club-membership',
      type: 'membership',
    },
  });

  const clubPrice = await stripe.prices.create({
    product: clubProduct.id,
    currency: 'eur',
    unit_amount: 9900, // €99.00 - ADJUST THIS TO YOUR ACTUAL PRICE
    recurring: {
      interval: 'year',
      interval_count: 1,
    },
    metadata: {
      product_slug: 'kandie-gang-cycling-club-membership',
    },
  });

  console.log('✅ Club Membership Product Created:');
  console.log(`   Product ID: ${clubProduct.id}`);
  console.log(`   Price ID: ${clubPrice.id}`);
  console.log(`   Price: €${(clubPrice.unit_amount / 100).toFixed(2)}/year`);
  console.log(`\n   Add to .env or .env.local:`);
  console.log(`   CLUB_MEMBERSHIP_PRICE_ID=${clubPrice.id}\n`);

  // Product 2: Guide (optional - uncomment if Guides have separate billing)
  /*
  console.log('Creating Kandie Gang Guide Product...');

  const guideProduct = await stripe.products.create({
    name: 'Kandie Gang Guide',
    description: 'Access to Kandie Gang Guide resources and exclusive guide content',
    metadata: {
      product_slug: 'kandie-gang-guide',
      type: 'guide'
    }
  });

  const guidePrice = await stripe.prices.create({
    product: guideProduct.id,
    currency: 'eur',
    unit_amount: 4900, // €49.00 - ADJUST THIS TO YOUR ACTUAL PRICE
    recurring: {
      interval: 'year',
      interval_count: 1
    },
    metadata: {
      product_slug: 'kandie-gang-guide'
    }
  });

  console.log('✅ Guide Product Created:');
  console.log(`   Product ID: ${guideProduct.id}`);
  console.log(`   Price ID: ${guidePrice.id}`);
  console.log(`   Price: €${(guidePrice.unit_amount / 100).toFixed(2)}/year`);
  console.log(`\n   Add to .env or .env.local:`);
  console.log(`   GUIDE_PRICE_ID=${guidePrice.id}\n`);
  */

  console.log('===========================================');
  console.log('Setup Complete!');
  console.log('===========================================\n');
  console.log('Next steps:');
  console.log('1. Add the Price ID(s) to your .env or .env.local file');
  console.log('2. If you used test mode, repeat with production keys');
  console.log('3. Run the migration script to migrate members\n');
}

setupProducts().catch((err) => {
  console.error('\n❌ Error setting up products:', err.message);
  if (err.type === 'StripeAuthenticationError') {
    console.error('\nInvalid Stripe API key. Please check your STRIPE_SECRET_KEY');
  }
  process.exit(1);
});
