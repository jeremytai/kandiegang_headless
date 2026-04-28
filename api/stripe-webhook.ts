// Migrated from /api/stripe-webhook.ts to Next.js API route
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { sendMemberWelcomeEmail } from '../lib/memberWelcomeEmail.js';
import {
  sendDiscordOrderNotification,
  sendOrderConfirmationEmail,
  type OrderNotificationItem,
  type OrderNotificationParams,
} from '../lib/orderNotifications.js';

const CLUB_MEMBERSHIP_SLUG = 'kandie-gang-cycling-club-membership';
const CLUB_PLAN_NAME = 'Kandie Gang Cycling Club Membership';
const ORDER_NOTIFICATIONS_SENT_AT_METADATA_KEY = 'order_notifications_sent_at';

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

function stripeDashboardSessionUrl(session: Stripe.Checkout.Session): string {
  const testPath = session.livemode ? '' : '/test';
  return `https://dashboard.stripe.com${testPath}/checkout/sessions/${session.id}`;
}

function stripeDashboardInvoiceUrl(invoice: Stripe.Invoice): string {
  const testPath = invoice.livemode ? '' : '/test';
  return `https://dashboard.stripe.com${testPath}/invoices/${invoice.id}`;
}

async function buildOrderNotificationParams(
  session: Stripe.Checkout.Session
): Promise<OrderNotificationParams> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
    expand: ['data.price.product'],
  });

  const items: OrderNotificationItem[] = lineItems.data.map((lineItem) => ({
    name: lineItem.description ?? 'Kandie Gang product',
    quantity: lineItem.quantity ?? 1,
    amountTotal: lineItem.amount_total ?? null,
    currency: lineItem.currency ?? session.currency ?? null,
  }));

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://kandiegang.com');

  return {
    sessionId: session.id,
    customerEmail:
      (session.customer_details?.email as string | undefined) ??
      (session.customer_email as string | undefined) ??
      null,
    customerName: (session.customer_details?.name as string | undefined) ?? null,
    amountTotal: session.amount_total ?? null,
    currency: session.currency ?? null,
    items,
    shippingOption:
      typeof session.metadata?.shippingOption === 'string' ? session.metadata.shippingOption : null,
    mode: session.mode ?? null,
    paymentStatus: session.payment_status ?? null,
    stripeDashboardUrl: stripeDashboardSessionUrl(session),
    siteUrl,
  };
}

function buildInvoiceOrderNotificationParams(invoice: Stripe.Invoice): OrderNotificationParams {
  const items: OrderNotificationItem[] = ((invoice as any).lines?.data ?? []).map(
    (lineItem: any) => ({
      name: lineItem.description ?? 'Kandie Gang product',
      quantity: lineItem.quantity ?? 1,
      amountTotal: lineItem.amount ?? null,
      currency: lineItem.currency ?? (invoice as any).currency ?? null,
    })
  );

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://kandiegang.com');

  return {
    sessionId: invoice.id,
    referenceLabel: 'Stripe invoice',
    customerEmail:
      ((invoice as any).customer_email as string | undefined) ??
      ((invoice as any).customer_details?.email as string | undefined) ??
      null,
    customerName:
      ((invoice as any).customer_name as string | undefined) ??
      ((invoice as any).customer_details?.name as string | undefined) ??
      null,
    amountTotal: ((invoice as any).amount_paid ?? (invoice as any).amount_due ?? null) as
      | number
      | null,
    currency: ((invoice as any).currency as string | undefined) ?? null,
    items,
    shippingOption: null,
    mode: 'subscription',
    paymentStatus: ((invoice as any).status as string | undefined) ?? 'paid',
    stripeDashboardUrl: stripeDashboardInvoiceUrl(invoice),
    siteUrl,
  };
}

async function markSubscriptionOrderNotificationsSent(
  subscriptionId: string,
  subscriptionMetadata: Stripe.Metadata | null | undefined
): Promise<void> {
  if (!stripe) return;

  try {
    await stripe.subscriptions.update(subscriptionId, {
      metadata: {
        ...(subscriptionMetadata ?? {}),
        [ORDER_NOTIFICATIONS_SENT_AT_METADATA_KEY]: new Date().toISOString(),
      },
    });
  } catch (metadataErr) {
    console.error('[stripe-webhook] Failed to mark subscription notifications sent:', metadataErr);
  }
}

async function sendCheckoutOrderNotifications(session: Stripe.Checkout.Session): Promise<void> {
  if (!stripe) return;

  try {
    const freshSession = await stripe.checkout.sessions.retrieve(session.id);
    if (freshSession.metadata?.[ORDER_NOTIFICATIONS_SENT_AT_METADATA_KEY]) {
      console.log(`[stripe-webhook] Order notifications already sent for ${session.id}`);
      return;
    }

    const paymentReceived =
      freshSession.payment_status === 'paid' || freshSession.amount_total === 0;
    if (!paymentReceived) {
      console.log(
        `[stripe-webhook] Skipping order notifications for ${session.id}; payment_status=${freshSession.payment_status}`
      );
      return;
    }

    const checkoutSubscription =
      typeof freshSession.subscription === 'string'
        ? await stripe.subscriptions.retrieve(freshSession.subscription)
        : null;

    if (checkoutSubscription?.metadata?.[ORDER_NOTIFICATIONS_SENT_AT_METADATA_KEY]) {
      console.log(
        `[stripe-webhook] Subscription order notifications already sent for ${checkoutSubscription.id}`
      );
      return;
    }

    const params = await buildOrderNotificationParams(freshSession);
    const [buyerEmailResult, discordResult] = await Promise.all([
      sendOrderConfirmationEmail(params),
      sendDiscordOrderNotification(params),
    ]);

    if (!buyerEmailResult.success && !buyerEmailResult.skipped) {
      console.error('[stripe-webhook] Order confirmation email failed:', buyerEmailResult.error);
    } else if (buyerEmailResult.skipped && buyerEmailResult.error) {
      console.warn('[stripe-webhook] Order confirmation email skipped:', buyerEmailResult.error);
    }
    if (!discordResult.success && !discordResult.skipped) {
      console.error('[stripe-webhook] Discord order notification failed:', discordResult.error);
    } else if (discordResult.skipped && discordResult.error) {
      console.warn('[stripe-webhook] Discord order notification skipped:', discordResult.error);
    }

    try {
      await stripe.checkout.sessions.update(session.id, {
        metadata: {
          ...(freshSession.metadata ?? {}),
          [ORDER_NOTIFICATIONS_SENT_AT_METADATA_KEY]: new Date().toISOString(),
        },
      });
    } catch (metadataErr) {
      console.error('[stripe-webhook] Failed to mark order notifications sent:', metadataErr);
    }

    if (checkoutSubscription?.id) {
      await markSubscriptionOrderNotificationsSent(
        checkoutSubscription.id,
        checkoutSubscription.metadata
      );
    }
  } catch (err) {
    console.error('[stripe-webhook] Order notification flow failed:', err);
  }
}

async function sendSubscriptionCreateInvoiceNotifications(
  invoice: Stripe.Invoice,
  subscription: Stripe.Subscription
): Promise<void> {
  if (!stripe) return;

  const billingReason = (invoice as any).billing_reason;
  if (billingReason !== 'subscription_create') {
    return;
  }

  if (subscription.metadata?.[ORDER_NOTIFICATIONS_SENT_AT_METADATA_KEY]) {
    console.log(
      `[stripe-webhook] Subscription order notifications already sent for ${subscription.id}`
    );
    return;
  }

  const params = buildInvoiceOrderNotificationParams(invoice);
  const [buyerEmailResult, discordResult] = await Promise.all([
    sendOrderConfirmationEmail(params),
    sendDiscordOrderNotification(params),
  ]);

  if (!buyerEmailResult.success && !buyerEmailResult.skipped) {
    console.error(
      '[stripe-webhook] Subscription invoice confirmation email failed:',
      buyerEmailResult.error
    );
  } else if (buyerEmailResult.skipped && buyerEmailResult.error) {
    console.warn(
      '[stripe-webhook] Subscription invoice confirmation email skipped:',
      buyerEmailResult.error
    );
  }
  if (!discordResult.success && !discordResult.skipped) {
    console.error(
      '[stripe-webhook] Subscription invoice Discord notification failed:',
      discordResult.error
    );
  } else if (discordResult.skipped && discordResult.error) {
    console.warn(
      '[stripe-webhook] Subscription invoice Discord notification skipped:',
      discordResult.error
    );
  }

  await markSubscriptionOrderNotificationsSent(subscription.id, subscription.metadata);
}

async function handlePaymentIntentSucceeded(event: Stripe.Event, res: NextApiResponse) {
  if (!stripe) {
    console.error('[stripe-webhook] Stripe not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  try {
    const sessions = await stripe.checkout.sessions.list({
      limit: 1,
      payment_intent: paymentIntent.id,
    } as Stripe.Checkout.SessionListParams & { payment_intent: string });
    const session = sessions.data[0];

    if (!session) {
      console.log(
        `[stripe-webhook] No Checkout Session found for payment_intent.succeeded ${paymentIntent.id}`
      );
      return res.status(200).json({ received: true });
    }

    if (session.mode !== 'payment') {
      console.log(
        `[stripe-webhook] Skipping payment_intent fallback for ${session.id}; mode=${session.mode}`
      );
      return res.status(200).json({ received: true });
    }

    await sendCheckoutOrderNotifications(session);
  } catch (err) {
    console.error('[stripe-webhook] payment_intent.succeeded fallback failed:', err);
  }

  return res.status(200).json({ received: true });
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

  // In Stripe API 2026-01-28+, current_period_end lives on the subscription item
  const firstItem = (subscription as any).items?.data?.[0];
  const currentPeriodEnd =
    firstItem?.current_period_end ?? (subscription as any).current_period_end ?? null;

  const updates: any = {
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status,
    subscription_current_period_end: currentPeriodEnd
      ? new Date(currentPeriodEnd * 1000).toISOString()
      : null,
    subscription_cancel_at_period_end: (subscription as any).cancel_at_period_end ?? null,
    is_member: isMember,
    membership_source: 'supabase',
  };

  // Update expiration date
  if (isMember && currentPeriodEnd) {
    updates.membership_expiration = new Date(currentPeriodEnd * 1000).toISOString().split('T')[0];
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
    await sendSubscriptionCreateInvoiceNotifications(invoice, subscription);

    // In Stripe API 2026-01-28+, current_period_end lives on the subscription item
    const firstItem = (subscription as any).items?.data?.[0];
    const currentPeriodEnd =
      firstItem?.current_period_end ?? (subscription as any).current_period_end ?? null;
    const status = (subscription as any).status;

    // ── Order history tracking ──────────────────────────────────────────────
    const amountPaid = ((invoice as any).amount_paid ?? 0) / 100;
    const orderDate = new Date((invoice as any).created * 1000).toISOString().split('T')[0];
    const productNames: string[] = ((invoice as any).lines?.data ?? [])
      .map((l: any) => l.description)
      .filter((d: any): d is string => typeof d === 'string' && d.length > 0);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('order_history, customer_since')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();

    const existingHistory: any[] = Array.isArray(profileData?.order_history)
      ? profileData.order_history
      : [];
    const alreadyTracked = existingHistory.some((e) => e.order_id === (invoice as any).id);
    const mergedHistory =
      alreadyTracked || amountPaid <= 0
        ? existingHistory
        : [
            ...existingHistory,
            {
              order_id: (invoice as any).id,
              date: orderDate,
              total: amountPaid,
              products:
                productNames.length > 0 ? productNames : ['Kandie Gang Cycling Club Membership'],
              status: 'completed',
            },
          ];

    const orderCount = mergedHistory.length;
    const lifetimeValue =
      Math.round(mergedHistory.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0) * 100) / 100;
    const avgOrderValue = orderCount > 0 ? Math.round((lifetimeValue / orderCount) * 100) / 100 : 0;
    const lastOrderDate = mergedHistory.reduce<string | null>(
      (latest, o) => (!o.date ? latest : !latest || o.date > latest ? o.date : latest),
      null
    );
    const customerSince: string | null = profileData?.customer_since ?? orderDate;
    // ────────────────────────────────────────────────────────────────────────

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
        order_history: mergedHistory,
        order_count: orderCount,
        lifetime_value: lifetimeValue,
        avg_order_value: avgOrderValue,
        last_order_date: lastOrderDate,
        customer_since: customerSince,
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
      `[stripe-webhook] invoice.payment_succeeded: customer ${customerId}, LTV €${lifetimeValue}`
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

  if (event.type === 'payment_intent.succeeded') {
    return handlePaymentIntentSucceeded(event, res);
  }

  if (event.type !== 'checkout.session.completed') {
    return res.status(200).json({ received: true });
  }
  const session = event.data.object as Stripe.Checkout.Session;
  const sessionId = session.id;
  await sendCheckoutOrderNotifications(session);

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
    .select('membership_plans, membership_expiration, customer_since')
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
  const stripeCustomerId = typeof session.customer === 'string' ? session.customer : null;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      is_member: true,
      membership_source: 'supabase',
      membership_plans: plans,
      member_since: today,
      membership_expiration: newExpiration,
      // Only set customer_since if not already set — preserves the earliest date
      ...(!existing?.customer_since && { customer_since: today }),
      ...(stripeCustomerId && { stripe_customer_id: stripeCustomerId }),
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
