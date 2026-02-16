/**
 * scripts/migrate-woo-to-stripe-subscriptions.js
 *
 * Migrates WooCommerce subscriptions to Stripe Billing.
 *
 * IMPORTANT: Run in TEST MODE first with Stripe test keys!
 *
 * This script:
 * 1. Reads membership data from CSV (or Supabase profiles table)
 * 2. Creates Stripe Customer for each member (if not exists)
 * 3. Creates Stripe Subscription with:
 *    - billing_cycle_anchor set to original renewal date
 *    - trial period until renewal date (no immediate charge)
 *    - Canceled status for expired memberships
 * 4. Updates Supabase profiles with Stripe IDs
 * 5. Logs all actions for audit
 *
 * Usage:
 *   node scripts/migrate-woo-to-stripe-subscriptions.js [path-to-csv]
 *
 * CSV Format (expected columns):
 *   user_id, email, membership_plan, membership_status, member_since, membership_expiration
 *
 * Requires ENV:
 *   STRIPE_SECRET_KEY (use test key for testing!)
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   CLUB_MEMBERSHIP_PRICE_ID
 *   RESEND_API_KEY (optional, for onboarding emails)
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { readFileSync, existsSync, writeFileSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// ==================== CONFIGURATION ====================

const DRY_RUN = process.env.DRY_RUN === 'true'; // Set to true for testing
const BATCH_SIZE = 10; // Process in batches to avoid rate limits
const RATE_LIMIT_DELAY_MS = 500; // Delay between batches

// ==================== ENV LOADING ====================

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
  }
}

loadEnv();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const clubPriceId = process.env.CLUB_MEMBERSHIP_PRICE_ID;
const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || 'Kandie Gang <onboarding@resend.dev>';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kandiegang.com';

if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey || !clubPriceId) {
  console.error('Missing required environment variables:');
  if (!stripeSecretKey) console.error('  - STRIPE_SECRET_KEY');
  if (!supabaseUrl) console.error('  - VITE_SUPABASE_URL');
  if (!supabaseServiceKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  if (!clubPriceId) console.error('  - CLUB_MEMBERSHIP_PRICE_ID');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' });
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// ==================== CSV PARSING ====================

function parseCsvLine(line) {
  const fields = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let value = '';
      i++;
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            value += '"';
            i += 2;
          } else {
            i++;
            break;
          }
        } else {
          value += line[i];
          i++;
        }
      }
      fields.push(value);
      if (line[i] === ',') i++;
    } else {
      let value = '';
      while (i < line.length && line[i] !== ',') {
        value += line[i];
        i++;
      }
      fields.push(value.trim());
      if (line[i] === ',') i++;
    }
  }
  return fields;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function loadMembersFromCsv(csvPath) {
  if (!existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  const raw = readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());

  if (lines.length < 2) {
    console.error('CSV is empty or has no data rows');
    process.exit(1);
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const emailIdx = headers.findIndex((h) => h === 'member_email' || h === 'email');
  const wpUserIdIdx = headers.findIndex((h) => h === 'user_id' || h === 'wp_user_id');
  const planIdx = headers.findIndex((h) => h === 'membership_plan' || h === 'plan');
  const statusIdx = headers.findIndex((h) => h === 'membership_status' || h === 'status');
  const sinceIdx = headers.findIndex((h) => h === 'member_since' || h === 'start_date');
  const expIdx = headers.findIndex(
    (h) => h === 'membership_expiration' || h === 'expiration' || h === 'end_date'
  );

  if (emailIdx === -1) {
    console.error('CSV must have an "email" or "member_email" column');
    console.error(`Found headers: ${headers.join(', ')}`);
    process.exit(1);
  }

  const members = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    const email = fields[emailIdx]?.toLowerCase().trim();

    if (!email) continue;

    const member = {
      email,
      wpUserId: wpUserIdIdx !== -1 ? fields[wpUserIdIdx] : null,
      membershipPlan: planIdx !== -1 ? fields[planIdx] : 'Kandie Gang Cycling Club Membership',
      membershipStatus: statusIdx !== -1 ? fields[statusIdx]?.toLowerCase() : 'active',
      memberSince: sinceIdx !== -1 ? parseDate(fields[sinceIdx]) : null,
      membershipExpiration: expIdx !== -1 ? parseDate(fields[expIdx]) : null,
    };

    members.push(member);
  }

  return members;
}

// ==================== STRIPE OPERATIONS ====================

/**
 * Get or create Stripe Customer for a member.
 * Uses email as idempotency key via metadata search.
 */
async function getOrCreateStripeCustomer(member, existingCustomerId = null) {
  // If we already have a customer ID from Supabase, retrieve it
  if (existingCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(existingCustomerId);
      if (!customer.deleted) {
        console.log(`  ✓ Using existing Stripe Customer: ${existingCustomerId}`);
        return customer;
      }
    } catch (err) {
      console.warn(`  ⚠ Existing customer ${existingCustomerId} not found, creating new one`);
    }
  }

  // Search for existing customer by email
  const existingCustomers = await stripe.customers.list({
    email: member.email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    console.log(`  ✓ Found existing Stripe Customer: ${existingCustomers.data[0].id}`);
    return existingCustomers.data[0];
  }

  // Create new customer
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would create Stripe Customer for ${member.email}`);
    return { id: 'cus_dry_run_' + Date.now(), email: member.email };
  }

  const customer = await stripe.customers.create({
    email: member.email,
    name: member.email.split('@')[0], // Use email prefix as name
    metadata: {
      wp_user_id: member.wpUserId || '',
      migrated_from: 'woocommerce',
      migration_date: new Date().toISOString(),
    },
  });

  console.log(`  ✓ Created Stripe Customer: ${customer.id}`);
  return customer;
}

/**
 * Create Stripe Subscription with proper billing_cycle_anchor.
 * For active members: Use trial_end to delay first charge until renewal date.
 * For expired members: Create as canceled.
 */
async function createStripeSubscription(customer, member, priceId) {
  const now = new Date();
  const expirationDate = member.membershipExpiration;
  const isExpired = !expirationDate || expirationDate < now;

  // Check if subscription already exists
  const existingSubs = await stripe.subscriptions.list({
    customer: customer.id,
    price: priceId,
    limit: 1,
  });

  if (existingSubs.data.length > 0) {
    const existing = existingSubs.data[0];
    console.log(`  ✓ Subscription already exists: ${existing.id} (${existing.status})`);
    return existing;
  }

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would create subscription for ${member.email}`);
    console.log(`    - Price: ${priceId}`);
    console.log(`    - Status: ${isExpired ? 'canceled' : 'trialing'}`);
    console.log(`    - Expiration: ${expirationDate?.toISOString() || 'N/A'}`);
    return {
      id: 'sub_dry_run_' + Date.now(),
      status: isExpired ? 'canceled' : 'trialing',
      current_period_end: expirationDate ? Math.floor(expirationDate.getTime() / 1000) : null,
    };
  }

  if (isExpired) {
    // Create subscription and immediately cancel it
    // This preserves the membership history in Stripe
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      cancel_at_period_end: true,
      metadata: {
        migrated_from: 'woocommerce',
        original_expiration: expirationDate?.toISOString() || 'unknown',
        migration_date: new Date().toISOString(),
        original_status: member.membershipStatus,
      },
    });

    // Immediately cancel
    await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: false,
      cancel_at: Math.floor(expirationDate ? expirationDate.getTime() / 1000 : Date.now() / 1000),
    });

    console.log(`  ✓ Created CANCELED subscription (expired): ${subscription.id}`);
    return subscription;
  }

  // For active members: Create with trial until renewal date
  const trialEndTimestamp = Math.floor(expirationDate.getTime() / 1000);

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: priceId }],
    trial_end: trialEndTimestamp, // No charge until this date
    billing_cycle_anchor: trialEndTimestamp, // Anchor billing to original renewal
    metadata: {
      migrated_from: 'woocommerce',
      original_member_since: member.memberSince?.toISOString() || 'unknown',
      original_expiration: expirationDate.toISOString(),
      migration_date: new Date().toISOString(),
      original_status: member.membershipStatus,
    },
  });

  console.log(
    `  ✓ Created subscription: ${subscription.id} (trialing until ${expirationDate.toISOString().split('T')[0]})`
  );
  return subscription;
}

// ==================== SUPABASE OPERATIONS ====================

async function updateSupabaseProfile(member, customer, subscription) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would update Supabase profile for ${member.email}`);
    return { success: true };
  }

  const { data: profile, error: lookupError } = await supabase
    .from('profiles')
    .select('id')
    .ilike('email', member.email)
    .maybeSingle();

  if (lookupError || !profile) {
    console.error(`  ✗ Could not find Supabase profile for ${member.email}`);
    return { success: false, error: lookupError };
  }

  const updates = {
    stripe_customer_id: customer.id,
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status,
    stripe_price_id: clubPriceId,
    membership_source: 'supabase', // Now managed by Stripe/Supabase
  };

  if (subscription.current_period_end) {
    updates.subscription_current_period_end = new Date(
      subscription.current_period_end * 1000
    ).toISOString();
  }

  if (subscription.billing_cycle_anchor) {
    updates.billing_cycle_anchor = new Date(subscription.billing_cycle_anchor * 1000).toISOString();
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', profile.id);

  if (updateError) {
    console.error(`  ✗ Failed to update Supabase profile: ${updateError.message}`);
    return { success: false, error: updateError };
  }

  console.log(`  ✓ Updated Supabase profile for ${member.email}`);
  return { success: true };
}

// ==================== EMAIL ====================

async function sendOnboardingEmail(member, customer) {
  if (!resend || DRY_RUN) {
    console.log(`  [DRY RUN/SKIP] Would send onboarding email to ${member.email}`);
    return;
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: `${siteUrl}/members`,
  });

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1F2223; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 1.5rem; color: #46519C; font-weight: 600;">
    Welcome to Stripe Billing Management
  </h1>

  <p>Hi there,</p>

  <p>
    We've migrated your Kandie Gang Cycling Club membership to our new billing system powered by Stripe.
    Your membership remains active with the same renewal date.
  </p>

  <p>
    <strong>What's changed:</strong>
  </p>
  <ul>
    <li>You now manage your membership and payment methods directly through Stripe</li>
    <li>Your renewal date stays the same: <strong>${member.membershipExpiration?.toISOString().split('T')[0] || 'N/A'}</strong></li>
    <li>No payment is required until your next renewal</li>
  </ul>

  <p>
    <strong>Action Required:</strong> Please add a payment method to ensure uninterrupted access.
  </p>

  <p style="margin: 24px 0;">
    <a href="${portalSession.url}"
       style="display: inline-block; background: #46519C; color: white; text-decoration: none; padding: 12px 24px; border-radius: 9999px; font-weight: 600;">
      Manage Your Membership
    </a>
  </p>

  <p style="font-size: 0.875rem; color: #5f6264; margin-top: 32px;">
    If you have any questions, reply to this email.
  </p>

  <p style="font-size: 0.875rem; color: #5f6264;">
    Kandie Gang Cycling Club
  </p>
</body>
</html>
  `;

  const textBody = `
Welcome to Stripe Billing Management

Hi there,

We've migrated your Kandie Gang Cycling Club membership to our new billing system powered by Stripe.
Your membership remains active with the same renewal date.

What's changed:
- You now manage your membership and payment methods directly through Stripe
- Your renewal date stays the same: ${member.membershipExpiration?.toISOString().split('T')[0] || 'N/A'}
- No payment is required until your next renewal

Action Required: Please add a payment method to ensure uninterrupted access.

Manage your membership: ${portalSession.url}

If you have any questions, reply to this email.

Kandie Gang Cycling Club
  `;

  try {
    await resend.emails.send({
      from: fromEmail,
      to: member.email,
      subject: 'Action Required: Add Payment Method for Your Membership',
      html: htmlBody,
      text: textBody,
    });
    console.log(`  ✓ Sent onboarding email to ${member.email}`);
  } catch (err) {
    console.error(`  ✗ Failed to send email to ${member.email}:`, err.message);
  }
}

// ==================== MAIN MIGRATION ====================

async function migrateMember(member, logPath) {
  const logEntry = {
    email: member.email,
    timestamp: new Date().toISOString(),
    success: false,
    errors: [],
  };

  console.log(`\n[${member.email}]`);

  try {
    // Step 1: Get existing Stripe customer ID from Supabase (if any)
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .ilike('email', member.email)
      .maybeSingle();

    // Step 2: Get or create Stripe Customer
    const customer = await getOrCreateStripeCustomer(member, profile?.stripe_customer_id);
    logEntry.stripe_customer_id = customer.id;

    // Step 3: Create Stripe Subscription
    const subscription = await createStripeSubscription(customer, member, clubPriceId);
    logEntry.stripe_subscription_id = subscription.id;
    logEntry.subscription_status = subscription.status;

    // Step 4: Update Supabase
    const updateResult = await updateSupabaseProfile(member, customer, subscription);
    if (!updateResult.success) {
      logEntry.errors.push('Failed to update Supabase');
    }

    // Step 5: Send onboarding email (only for active members)
    if (subscription.status === 'trialing' || subscription.status === 'active') {
      await sendOnboardingEmail(member, customer);
    }

    logEntry.success = true;
    console.log(`  ✅ Migration complete for ${member.email}`);
  } catch (err) {
    console.error(`  ✗ Migration failed for ${member.email}:`, err.message);
    logEntry.errors.push(err.message);
    logEntry.success = false;
  }

  // Write to log
  appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
  return logEntry;
}

async function runMigration(csvPath) {
  console.log('\n===========================================');
  console.log('WooCommerce → Stripe Subscription Migration');
  console.log('===========================================\n');

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No changes will be made to Stripe or Supabase\n');
  }

  if (stripeSecretKey.startsWith('sk_test_')) {
    console.log('⚠️  Using Stripe TEST mode\n');
  } else if (stripeSecretKey.startsWith('sk_live_')) {
    console.log('✅ Using Stripe LIVE mode\n');
  }

  // Load members from CSV
  const members = loadMembersFromCsv(csvPath);
  console.log(`Loaded ${members.length} members from CSV\n`);

  // Filter for active "Kandie Gang Cycling Club Membership" members
  const clubMembers = members.filter(
    (m) =>
      m.membershipPlan &&
      m.membershipPlan.toLowerCase().includes('cycling') &&
      (m.membershipPlan.toLowerCase().includes('club') ||
        m.membershipPlan.toLowerCase().includes('membership'))
  );

  console.log(`Filtering to ${clubMembers.length} Cycling Club memberships\n`);

  if (clubMembers.length === 0) {
    console.error('No club memberships found in CSV. Check the membership_plan column.');
    process.exit(1);
  }

  // Create log file
  const logPath = join(root, `migration-log-${Date.now()}.jsonl`);
  writeFileSync(logPath, ''); // Create empty file

  console.log(`Log file: ${logPath}\n`);

  // Process in batches
  const results = [];
  for (let i = 0; i < clubMembers.length; i += BATCH_SIZE) {
    const batch = clubMembers.slice(i, i + BATCH_SIZE);
    console.log(
      `\n--- Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(clubMembers.length / BATCH_SIZE)} ---`
    );

    for (const member of batch) {
      const result = await migrateMember(member, logPath);
      results.push(result);
    }

    // Rate limiting
    if (i + BATCH_SIZE < clubMembers.length) {
      console.log(`\n⏸  Waiting ${RATE_LIMIT_DELAY_MS}ms before next batch...`);
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    }
  }

  // Summary
  console.log('\n\n===========================================');
  console.log('MIGRATION SUMMARY');
  console.log('===========================================');
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  console.log(`✅ Successful: ${successful}/${clubMembers.length}`);
  console.log(`✗ Failed: ${failed}/${clubMembers.length}`);
  console.log(`\nDetailed log: ${logPath}`);
  console.log('===========================================\n');
}

// ==================== ENTRY POINT ====================

const csvPath = process.argv[2];

if (!csvPath) {
  console.error('Usage: node scripts/migrate-woo-to-stripe-subscriptions.js <path-to-csv>');
  console.error(
    '\nCSV should have columns: email (or member_email), membership_plan, membership_status, member_since, membership_expiration'
  );
  console.error('\nSet DRY_RUN=true to test without making changes');
  console.error('\nExample:');
  console.error('  DRY_RUN=true node scripts/migrate-woo-to-stripe-subscriptions.js members.csv');
  process.exit(1);
}

runMigration(csvPath).catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
