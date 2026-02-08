/**
 * Stripe webhook handler. On checkout.session.completed for Kandie Gang
 * Club Membership: updates the customer's Supabase profile (1-year member)
 * and sends a welcome email via Resend.
 *
 * Supports both Web Request API (request.text() for raw body) and Node (req, res)
 * so raw body is available for signature verification without bodyParser config.
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
    ? new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' })
    : null;

function isClubMembershipPurchase(productSlugs: string | null | undefined): boolean {
  if (!productSlugs || typeof productSlugs !== 'string') return false;
  return productSlugs.split(',').map((s) => s.trim()).includes(CLUB_MEMBERSHIP_SLUG);
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Get raw body and signature; works with Web Request or Node (req). */
async function getRawBodyAndSignature(
  req: Request | VercelRequest
): Promise<{ rawBody: string; signature: string | null }> {
  const isWebRequest = typeof (req as Request).text === 'function';
  if (isWebRequest) {
    const request = req as Request;
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');
    return { rawBody, signature };
  }
  const nodeReq = req as VercelRequest;
  const signature = Array.isArray(nodeReq.headers['stripe-signature'])
    ? nodeReq.headers['stripe-signature'][0]
    : nodeReq.headers['stripe-signature'];
  const rawBody = await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    nodeReq.on('data', (chunk: Buffer) => chunks.push(chunk));
    nodeReq.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    nodeReq.on('error', reject);
  });
  return { rawBody, signature: signature ?? null };
}

async function handleWebhook(req: Request | VercelRequest): Promise<Response | void> {
  const method = (req as Request).method ?? (req as VercelRequest).method;
  if (method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', Allow: 'POST' },
    });
  }

  if (!stripe || !webhookSecret) {
    console.error('[stripe-webhook] STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET not set');
    return new Response(JSON.stringify({ error: 'Webhook not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let rawBody: string;
  let signature: string | null;
  try {
    const result = await getRawBodyAndSignature(req);
    rawBody = result.rawBody;
    signature = result.signature;
  } catch (err) {
    console.error('[stripe-webhook] Failed to read body:', err);
    return new Response(JSON.stringify({ error: 'Invalid body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing Stripe-Signature header' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[stripe-webhook] Signature verification failed:', message);
    return new Response(JSON.stringify({ error: `Webhook signature verification failed: ${message}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (event.type !== 'checkout.session.completed') {
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const sessionId = session.id;

  if (!isClubMembershipPurchase(session.metadata?.productSlugs)) {
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const customerEmail =
    (session.customer_details?.email as string | undefined) ??
    (session.customer_email as string | undefined);
  const metadataUserId = session.metadata?.userId;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[stripe-webhook] Supabase not configured');
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
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
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
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
    return new Response(JSON.stringify({ error: 'Failed to update membership' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
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

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

/** Vercel handler: supports Node (req, res) and Web Request. */
export default async function handler(
  req: VercelRequest | Request,
  res?: VercelResponse
): Promise<Response | void> {
  const result = (await handleWebhook(req)) as Response;
  if (res) {
    const body = await result.json().catch(() => ({}));
    res.status(result.status).json(body);
  } else {
    return result;
  }
}
