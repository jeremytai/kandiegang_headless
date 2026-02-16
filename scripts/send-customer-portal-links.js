/**
 * scripts/send-customer-portal-links.js
 *
 * Sends Stripe Customer Portal links to all active members.
 * Run this after migration to onboard members to self-service.
 *
 * Usage: node scripts/send-customer-portal-links.js
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
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
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || 'Kandie Gang <onboarding@resend.dev>';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kandiegang.com';
const DRY_RUN = process.env.DRY_RUN === 'true';

if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey || !resendApiKey) {
  console.error('Missing required environment variables:');
  if (!stripeSecretKey) console.error('  - STRIPE_SECRET_KEY');
  if (!supabaseUrl) console.error('  - VITE_SUPABASE_URL');
  if (!supabaseServiceKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  if (!resendApiKey) console.error('  - RESEND_API_KEY');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' });
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const resend = new Resend(resendApiKey);

async function sendPortalLink(profile) {
  console.log(`\nProcessing ${profile.email}...`);

  if (!profile.stripe_customer_id) {
    console.log(`  ✗ No Stripe customer ID`);
    return { success: false, reason: 'No Stripe customer ID' };
  }

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would send portal link to ${profile.email}`);
    return { success: true };
  }

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
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
    Manage Your Membership
  </h1>

  <p>Hi${profile.display_name ? ` ${profile.display_name}` : ''},</p>

  <p>
    You can now manage your Kandie Gang Cycling Club membership, update payment methods, and view billing history through the Stripe Customer Portal.
  </p>

  <p style="margin: 24px 0;">
    <a href="${portalSession.url}"
       style="display: inline-block; background: #46519C; color: white; text-decoration: none; padding: 12px 24px; border-radius: 9999px; font-weight: 600;">
      Go to Customer Portal
    </a>
  </p>

  <p style="font-size: 0.875rem; color: #5f6264; margin-top: 32px;">
    Your next renewal: <strong>${profile.membership_expiration || 'N/A'}</strong>
  </p>

  <p style="font-size: 0.875rem; color: #5f6264;">
    Kandie Gang Cycling Club
  </p>
</body>
</html>
    `;

    const textBody = `
Manage Your Membership

Hi${profile.display_name ? ` ${profile.display_name}` : ''},

You can now manage your Kandie Gang Cycling Club membership, update payment methods, and view billing history through the Stripe Customer Portal.

Go to Customer Portal: ${portalSession.url}

Your next renewal: ${profile.membership_expiration || 'N/A'}

Kandie Gang Cycling Club
    `;

    await resend.emails.send({
      from: fromEmail,
      to: profile.email,
      subject: 'Manage Your Membership - Customer Portal Access',
      html: htmlBody,
      text: textBody,
    });

    console.log(`  ✓ Sent portal link to ${profile.email}`);
    return { success: true };
  } catch (err) {
    console.error(`  ✗ Failed for ${profile.email}:`, err.message);
    return { success: false, reason: err.message };
  }
}

async function run() {
  console.log('\n===========================================');
  console.log('Send Customer Portal Links to Members');
  console.log('===========================================\n');

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No emails will be sent\n');
  }

  console.log('Fetching active members with Stripe customers...\n');

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('email, display_name, stripe_customer_id, membership_expiration')
    .eq('is_member', true)
    .not('stripe_customer_id', 'is', null);

  if (error) {
    console.error('Failed to fetch profiles:', error);
    process.exit(1);
  }

  console.log(`Found ${profiles.length} members to email\n`);

  if (profiles.length === 0) {
    console.log('No members with Stripe customer IDs found.');
    console.log('Make sure you have run the migration script first.');
    process.exit(0);
  }

  const results = [];

  for (const profile of profiles) {
    const result = await sendPortalLink(profile);
    results.push(result);
    // Rate limit to avoid overwhelming email service
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n\n===========================================');
  console.log('SUMMARY');
  console.log('===========================================');
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  console.log(`✅ Successful: ${successful}/${profiles.length}`);
  console.log(`✗ Failed: ${failed}/${profiles.length}`);
  console.log('===========================================\n');
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
