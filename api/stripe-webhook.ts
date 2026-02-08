/**
 * Stripe webhook handler. On checkout.session.completed for Kandie Gang
 * Club Membership: updates the customer's Supabase profile (1-year member)
 * and sends a welcome email via Resend.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { CLUB_MEMBERSHIP_SLUG } from '../lib/shipping';
import { sendMemberWelcomeEmail, CLUB_PLAN_NAME } from '../lib/memberWelcomeEmail';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const stripe =
  stripeSecretKey && webhookSecret
    ? new Stripe(stripeSecretKey, { apiVersion: '2024-12-18.acacia' })
    : null;

/** Read raw body from request stream (required for Stripe signature verification). */
function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function isClubMembershipPurchase(productSlugs: string | null | undefined): boolean {
  if (!productSlugs || typeof productSlugs !== 'string') return false;
  return productSlugs.split(',').map((s) => s.trim()).includes(CLUB_MEMBERSHIP_SLUG);
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!stripe || !webhookSecret) {
    console.error('[stripe-webhook] STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET not set');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  const signature = req.headers['stripe-signature'];
  if (!signature || typeof signature !== 'string') {
    return res.status(400).json({ error: 'Missing Stripe-Signature header' });
  }

  let rawBody: Buffer;
  try {
    rawBody = await getRawBody(req);
  } catch (err) {
    console.error('[stripe-webhook] Failed to read raw body:', err);
    return res.status(400).json({ error: 'Invalid body' });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[stripe-webhook] Signature verification failed:', message);
    return res.status(400).json({ error: `Webhook signature verification failed: ${message}` });
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
    console.warn('[stripe-webhook] No profile found for session', sessionId, 'userId=', metadataUserId, 'email=', customerEmail);
    return res.status(200).json({ received: true });
  }

  if (!emailForWelcome) {
    const { data: profileRow } = await supabase.from('profiles').select('email').eq('id', profileId).single();
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
