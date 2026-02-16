// Migrated from /api/stripe-webhook.ts to Next.js API route
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const CLUB_MEMBERSHIP_SLUG = 'kandie-gang-cycling-club-membership';
const CLUB_PLAN_NAME = 'Kandie Gang Cycling Club Membership';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'Kandie Gang <onboarding@resend.dev>';
const SITE_BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://kandiegang.com');

function buildWelcomeHtml(params: {
  to: string;
  memberSince: string;
  membershipExpiration: string;
}): string {
  const membersUrl = `${SITE_BASE_URL}/members`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1F2223; max-width: 560px; margin: 0 auto; padding: 24px;"><h1 style="font-size: 1.5rem; color: #46519C; font-weight: 600;">Welcome to the Kandie Gang Cycling Club</h1><p>Thank you for becoming a member. You're in.</p><p>Your membership is active for one year:</p><ul style="margin: 16px 0;"><li><strong>Start:</strong> ${params.memberSince}</li><li><strong>Expires:</strong> ${params.membershipExpiration}</li></ul><p><a href="${membersUrl}" style="display: inline-block; background: #46519C; color: white; text-decoration: none; padding: 12px 24px; border-radius: 9999px; font-weight: 600;">Go to Members Area</a></p><p style="margin-top: 32px; font-size: 0.875rem; color: #5f6264;">Kandie Gang Cycling Club</p></body></html>`;
}

function buildWelcomeText(params: {
  to: string;
  memberSince: string;
  membershipExpiration: string;
}): string {
  const membersUrl = `${SITE_BASE_URL}/members`;
  return [
    'Welcome to the Kandie Gang Cycling Club',
    '',
    "Thank you for becoming a member. You're in.",
    '',
    'Your membership is active for one year:',
    `Start: ${params.memberSince}`,
    `Expires: ${params.membershipExpiration}`,
    '',
    `Go to Members Area: ${membersUrl}`,
    '',
    'Kandie Gang Cycling Club',
  ].join('\n');
}

async function sendMemberWelcomeEmail(params: {
  to: string;
  memberSince: string;
  membershipExpiration: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) return { success: false, error: 'RESEND_API_KEY is not set' };
  const resend = new Resend(RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: 'Welcome to the Kandie Gang Cycling Club',
      html: buildWelcomeHtml(params),
      text: buildWelcomeText(params),
    });
    if (error) {
      console.error('[memberWelcomeEmail] Resend error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[memberWelcomeEmail] Send failed:', message);
    return { success: false, error: message };
  }
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const stripe =
  stripeSecretKey && webhookSecret
    ? new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' })
    : null;

function isClubMembershipPurchase(productSlugs: string | null | undefined): boolean {
  if (!productSlugs || typeof productSlugs !== 'string') return false;
  return productSlugs
    .split(',')
    .map((s) => s.trim())
    .includes(CLUB_MEMBERSHIP_SLUG);
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function getRawBodyAndSignature(
  req: NextApiRequest
): Promise<{ rawBody: string; signature: string | null }> {
  return new Promise((resolve, reject) => {
    let rawBody = '';
    req.on('data', (chunk) => {
      rawBody += chunk;
    });
    req.on('end', () => {
      const signature = Array.isArray(req.headers['stripe-signature'])
        ? req.headers['stripe-signature'][0]
        : req.headers['stripe-signature'];
      resolve({ rawBody, signature: signature ?? null });
    });
    req.on('error', reject);
  });
}

// ==================== SUBSCRIPTION EVENT HANDLERS ====================

async function handleSubscriptionEvent(event: Stripe.Event, res: NextApiResponse) {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[stripe-webhook] Supabase not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const subscription = event.data.object as Stripe.Subscription;
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Determine membership status
  const isMember = ['active', 'trialing'].includes(subscription.status);

  const updates: any = {
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status,
    subscription_current_period_end: (subscription as any).current_period_end
      ? new Date((subscription as any).current_period_end * 1000).toISOString()
      : null,
    subscription_cancel_at_period_end: (subscription as any).cancel_at_period_end ?? null,
    is_member: isMember,
    membership_source: 'supabase',
  };

  // Update expiration date
  if (isMember && (subscription as any).current_period_end) {
    updates.membership_expiration = new Date((subscription as any).current_period_end * 1000)
      .toISOString()
      .split('T')[0];
  }

  // Update billing cycle anchor if present
  if ((subscription as any).billing_cycle_anchor) {
    updates.billing_cycle_anchor = new Date(
      (subscription as any).billing_cycle_anchor * 1000
    ).toISOString();
  }

  // Handle subscription deletion
  if (event.type === 'customer.subscription.deleted') {
    updates.stripe_subscription_status = 'canceled';
    updates.is_member = false;
    updates.subscription_cancel_at_period_end = false;
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error(`[stripe-webhook] Failed to update profile for ${event.type}:`, error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }

  console.log(`[stripe-webhook] ${event.type}: ${subscription.id} (${subscription.status})`);
  return res.status(200).json({ received: true });
}

async function handleInvoicePaymentSucceeded(event: Stripe.Event, res: NextApiResponse) {
  if (!supabaseUrl || !supabaseServiceKey || !stripe) {
    console.error('[stripe-webhook] Supabase or Stripe not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const invoice = event.data.object as Stripe.Invoice;
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

  if (!customerId) {
    return res.status(200).json({ received: true });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Get subscription details
  const subscriptionId =
    typeof (invoice as any).subscription === 'string' ? (invoice as any).subscription : null;

  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    const currentPeriodEnd = (subscription as any).current_period_end;
    const status = (subscription as any).status;

    const { error } = await supabase
      .from('profiles')
      .update({
        is_member: true,
        membership_expiration: currentPeriodEnd
          ? new Date(currentPeriodEnd * 1000).toISOString().split('T')[0]
          : null,
        subscription_current_period_end: currentPeriodEnd
          ? new Date(currentPeriodEnd * 1000).toISOString()
          : null,
        stripe_subscription_status: status,
      })
      .eq('stripe_customer_id', customerId);

    if (error) {
      console.error(
        '[stripe-webhook] Failed to update profile on invoice.payment_succeeded:',
        error
      );
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    console.log(
      `[stripe-webhook] invoice.payment_succeeded: Membership renewed for customer ${customerId}`
    );
  }

  return res.status(200).json({ received: true });
}

async function handleInvoicePaymentFailed(event: Stripe.Event, res: NextApiResponse) {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[stripe-webhook] Supabase not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const invoice = event.data.object as Stripe.Invoice;
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

  if (!customerId) {
    return res.status(200).json({ received: true });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await supabase
    .from('profiles')
    .update({
      stripe_subscription_status: 'past_due',
    })
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('[stripe-webhook] Failed to update profile on invoice.payment_failed:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }

  console.log(`[stripe-webhook] invoice.payment_failed: Payment failed for customer ${customerId}`);
  return res.status(200).json({ received: true });
}

// ==================== MAIN WEBHOOK HANDLER ====================

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!stripe || !webhookSecret) {
    console.error('[stripe-webhook] STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET not set');
    return res.status(500).json({ error: 'Webhook not configured' });
  }
  let rawBody: string;
  let signature: string | null;
  try {
    const result = await getRawBodyAndSignature(req);
    rawBody = result.rawBody;
    signature = result.signature;
  } catch (err) {
    console.error('[stripe-webhook] Failed to read body:', err);
    return res.status(400).json({ error: 'Invalid body' });
  }
  if (!signature) {
    return res.status(400).json({ error: 'Missing Stripe-Signature header' });
  }
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[stripe-webhook] Signature verification failed:', message);
    return res.status(400).json({ error: `Webhook signature verification failed: ${message}` });
  }
  // Handle subscription lifecycle events
  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    return handleSubscriptionEvent(event, res);
  }

  if (event.type === 'invoice.payment_succeeded') {
    return handleInvoicePaymentSucceeded(event, res);
  }

  if (event.type === 'invoice.payment_failed') {
    return handleInvoicePaymentFailed(event, res);
  }

  if (event.type !== 'checkout.session.completed') {
    return res.status(200).json({ received: true });
  }
  const session = event.data.object as Stripe.Checkout.Session;
  const sessionId = session.id;
  if (!isClubMembershipPurchase(session.metadata?.productSlugs)) {
    return res.status(200).json({ received: true });
  }
  const customerEmail =
    (session.customer_details?.email as string | undefined) ??
    (session.customer_email as string | undefined);
  const metadataUserId = session.metadata?.userId;
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[stripe-webhook] Supabase not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const today = toDateString(new Date());
  const oneYearLater = new Date();
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
  const membershipExpiration = toDateString(oneYearLater);
  let profileId: string | null = null;
  let emailForWelcome: string | null = customerEmail ?? null;
  if (metadataUserId && metadataUserId !== 'guest') {
    profileId = metadataUserId;
  }
  if (!profileId && emailForWelcome) {
    const { data: profileByEmail } = await supabase
      .from('profiles')
      .select('id, membership_plans, membership_expiration')
      .ilike('email', emailForWelcome)
      .limit(1)
      .maybeSingle();
    if (profileByEmail) {
      profileId = profileByEmail.id;
    }
  }
  if (!profileId) {
    console.warn(
      '[stripe-webhook] No profile found for session',
      sessionId,
      'userId=',
      metadataUserId,
      'email=',
      customerEmail
    );
    return res.status(200).json({ received: true });
  }
  if (!emailForWelcome) {
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', profileId)
      .single();
    emailForWelcome = profileRow?.email ?? null;
  }
  const { data: existing } = await supabase
    .from('profiles')
    .select('membership_plans, membership_expiration')
    .eq('id', profileId)
    .single();
  const existingPlans: string[] = Array.isArray(existing?.membership_plans)
    ? existing.membership_plans
    : [];
  const hasPlan = existingPlans.includes(CLUB_PLAN_NAME);
  const plans = hasPlan ? existingPlans : [...existingPlans, CLUB_PLAN_NAME];
  const existingExp = existing?.membership_expiration ?? null;
  const newExpiration =
    existingExp && existingExp > membershipExpiration ? existingExp : membershipExpiration;
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      is_member: true,
      membership_source: 'supabase',
      membership_plans: plans,
      member_since: today,
      membership_expiration: newExpiration,
    })
    .eq('id', profileId);
  if (updateError) {
    console.error('[stripe-webhook] Supabase profile update failed:', updateError);
    return res.status(500).json({ error: 'Failed to update membership' });
  }
  if (emailForWelcome) {
    const emailResult = await sendMemberWelcomeEmail({
      to: emailForWelcome,
      memberSince: today,
      membershipExpiration: newExpiration,
    });
    if (!emailResult.success) {
      console.error('[stripe-webhook] Welcome email failed:', emailResult.error);
    }
  }
  return res.status(200).json({ received: true });
}
