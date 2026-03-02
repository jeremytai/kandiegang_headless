import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '../lib/rateLimit.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2026-01-28.clover' })
  : null;

/**
 * POST /api/stripe-sync
 *
 * Backfills all paid Stripe invoices into profile order history and
 * recalculates lifetime_value, order_count, avg_order_value,
 * last_order_date, and customer_since for every profile.
 *
 * Pass 1: profiles that already have stripe_customer_id
 * Pass 2: profiles WITHOUT stripe_customer_id — searches Stripe by email,
 *         links the customer, then syncs their invoices
 *
 * Requires guide authentication.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Low rate limit — this is an expensive operation
  if (!checkRateLimit(req, res, { windowMs: 60_000, max: 3, keyPrefix: 'stripe-sync' })) {
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server not configured' });
  }
  if (!stripe) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  // Verify the caller is an authenticated guide
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error: authError,
  } = await adminClient.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('is_guide')
    .eq('id', user.id)
    .single();

  if (!callerProfile?.is_guide) {
    return res.status(403).json({ error: 'Forbidden — guide access required' });
  }

  let synced = 0;
  let totalNewOrders = 0;
  let customersLinked = 0;
  const errors: string[] = [];

  try {
    // ── Pass 1: profiles that already have stripe_customer_id ────────────────
    const { data: linkedProfiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('id, stripe_customer_id, order_history, customer_since')
      .not('stripe_customer_id', 'is', null);

    if (profilesError) throw profilesError;

    for (const profile of linkedProfiles ?? []) {
      if (!profile.stripe_customer_id) continue;
      const result = await syncCustomerInvoices(
        stripe,
        adminClient,
        profile.id,
        profile.stripe_customer_id,
        profile.order_history,
        profile.customer_since
      );
      if (result.error) {
        errors.push(`${profile.stripe_customer_id}: ${result.error}`);
      } else if (result.updated) {
        synced++;
        totalNewOrders += result.newOrders;
      }
    }

    // ── Pass 2: profiles WITHOUT stripe_customer_id — link via email ─────────
    const { data: unlinkedProfiles } = await adminClient
      .from('profiles')
      .select('id, email, order_history, customer_since')
      .is('stripe_customer_id', null)
      .not('email', 'is', null);

    for (const profile of unlinkedProfiles ?? []) {
      if (!profile.email) continue;
      try {
        // Search Stripe for a customer with this email
        const customers = await stripe.customers.list({
          email: profile.email.toLowerCase(),
          limit: 5,
        });
        if (customers.data.length === 0) continue;

        // Use the most recently created Stripe customer for this email
        const stripeCustomer = customers.data[0];

        // Link the profile to the Stripe customer
        await adminClient
          .from('profiles')
          .update({ stripe_customer_id: stripeCustomer.id })
          .eq('id', profile.id);

        customersLinked++;

        // Sync their invoices
        const result = await syncCustomerInvoices(
          stripe,
          adminClient,
          profile.id,
          stripeCustomer.id,
          profile.order_history,
          profile.customer_since
        );
        if (result.error) {
          errors.push(`${stripeCustomer.id} (email lookup): ${result.error}`);
        } else if (result.updated) {
          synced++;
          totalNewOrders += result.newOrders;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`email ${profile.email}: ${msg}`);
      }
    }

    return res.status(200).json({
      synced,
      totalNewOrders,
      customersLinked,
      ...(errors.length > 0 ? { errors } : {}),
    });
  } catch (err) {
    console.error('[stripe-sync] Error:', err);
    return res.status(500).json({ error: 'Failed to sync Stripe orders' });
  }
}

// ── Shared helper: fetch invoices for a customer and update the profile ───────

async function syncCustomerInvoices(
  stripe: Stripe,
  adminClient: ReturnType<typeof createClient>,
  profileId: string,
  stripeCustomerId: string,
  existingOrderHistory: any,
  existingCustomerSince: string | null
): Promise<{ updated: boolean; newOrders: number; error?: string }> {
  try {
    // Fetch all paid invoices for this customer
    const invoices: Stripe.Invoice[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const page = await stripe.invoices.list({
        customer: stripeCustomerId,
        status: 'paid',
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      invoices.push(...page.data);
      hasMore = page.has_more;
      if (page.data.length > 0) {
        startingAfter = page.data[page.data.length - 1].id;
      }
    }

    // Build order history, deduplicating by invoice ID
    const existingHistory: any[] = Array.isArray(existingOrderHistory) ? existingOrderHistory : [];

    // If Stripe has no invoices AND there are no existing orders, nothing to do
    if (invoices.length === 0 && existingHistory.length === 0) {
      return { updated: false, newOrders: 0 };
    }

    const trackedIds = new Set(existingHistory.map((e: any) => String(e.order_id)));

    let newOrdersAdded = 0;
    const mergedHistory = [...existingHistory];

    for (const invoice of invoices) {
      if (trackedIds.has(invoice.id)) continue;

      const amountPaid = (invoice as any).amount_paid ?? 0;
      if (amountPaid <= 0) continue;

      const orderDate = new Date((invoice as any).created * 1000).toISOString().split('T')[0];
      const productNames: string[] = ((invoice as any).lines?.data ?? [])
        .map((l: any) => l.description)
        .filter((d: any): d is string => typeof d === 'string' && d.length > 0);

      mergedHistory.push({
        order_id: invoice.id,
        date: orderDate,
        total: Math.round((amountPaid / 100) * 100) / 100,
        products:
          productNames.length > 0 ? productNames : ['Kandie Gang Cycling Club Membership'],
        status: 'completed',
      });
      trackedIds.add(invoice.id);
      newOrdersAdded++;
    }

    // Sort chronologically (oldest first)
    mergedHistory.sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''));

    // Recalculate metrics from the full merged history
    const orderCount = mergedHistory.length;
    const lifetimeValue =
      Math.round(
        mergedHistory.reduce((sum: number, o: any) => sum + (parseFloat(o.total) || 0), 0) * 100
      ) / 100;
    const avgOrderValue =
      orderCount > 0 ? Math.round((lifetimeValue / orderCount) * 100) / 100 : 0;
    const lastOrderDate = mergedHistory.reduce<string | null>(
      (latest: string | null, o: any) =>
        !o.date ? latest : !latest || o.date > latest ? o.date : latest,
      null
    );
    const customerSince: string | null = existingCustomerSince ?? mergedHistory[0]?.date ?? null;

    // Always write back: ensures lifetime_value is correct even if no new orders were added
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({
        order_history: mergedHistory,
        order_count: orderCount,
        lifetime_value: lifetimeValue,
        avg_order_value: avgOrderValue,
        last_order_date: lastOrderDate,
        customer_since: customerSince,
      })
      .eq('id', profileId);

    if (updateError) {
      return { updated: false, newOrders: 0, error: updateError.message };
    }

    return { updated: true, newOrders: newOrdersAdded };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { updated: false, newOrders: 0, error: msg };
  }
}
