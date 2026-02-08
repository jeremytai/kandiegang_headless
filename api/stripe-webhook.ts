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
import { Resend } from 'resend';

/**
 * Inlined from lib/shipping.ts and lib/memberWelcomeEmail.ts.
 * Vercel serverless functions in /api cannot import from outside the api/ directory.
 */

const CLUB_MEMBERSHIP_SLUG = 'kandie-gang-cycling-club-membership';
const CLUB_PLAN_NAME = 'Kandie Gang Cycling Club Membership';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'Kandie Gang <onboarding@resend.dev>';
const SITE_BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://kandiegang.com');

interface WelcomeEmailParams {
  to: string;
  memberSince: string;
  membershipExpiration: string;
}

/** Design system colors (match index.css) — keep email in sync with site. */
const COLOR_PRIMARY_INK = '#1F2223';
const COLOR_SECONDARY_PURPLE_RAIN = '#46519C';
const COLOR_MUTED = '#5f6264';

function buildWelcomeHtml(params: WelcomeEmailParams): string {
  const membersUrl = `${SITE_BASE_URL}/members`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: ${COLOR_PRIMARY_INK}; max-width: 560px; margin: 0 auto; padding: 24px;"><h1 style="font-size: 1.5rem; color: ${COLOR_SECONDARY_PURPLE_RAIN}; font-weight: 600;">Welcome to the Kandie Gang Cycling Club</h1><p>Thank you for becoming a member. You're in.</p><p>Your membership is active for one year:</p><ul style="margin: 16px 0;"><li><strong>Start:</strong> ${params.memberSince}</li><li><strong>Expires:</strong> ${params.membershipExpiration}</li></ul><p><a href="${membersUrl}" style="display: inline-block; background: ${COLOR_SECONDARY_PURPLE_RAIN}; color: white; text-decoration: none; padding: 12px 24px; border-radius: 9999px; font-weight: 600;">Go to Members Area</a></p><p style="margin-top: 32px; font-size: 0.875rem; color: ${COLOR_MUTED};">Kandie Gang Cycling Club</p></body></html>`;
}

function buildWelcomeText(params: WelcomeEmailParams): string {
  const membersUrl = `${SITE_BASE_URL}/members`;
  return [
    'Welcome to the Kandie Gang Cycling Club', '',
    "Thank you for becoming a member. You're in.", '',
    'Your membership is active for one year:',
    `Start: ${params.memberSince}`,
    `Expires: ${params.membershipExpiration}`, '',
    `Go to Members Area: ${membersUrl}`, '',
    'Kandie Gang Cycling Club',
  ].join('\n');
}

async function sendMemberWelcomeEmail(
  params: WelcomeEmailParams
): Promise<{ success: boolean; error?: string }> {
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
