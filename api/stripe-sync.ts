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
 * For each profile, collects every Stripe customer that matches:
 * - stored stripe_customer_id, and
 * - customers.list by primary email and alternate_emails (paginated).
 *
 * Paid invoices from all of those customers are merged and deduped by
 * invoice id, so split checkouts (multiple Stripe customers for one person)
 * still land on one profile.
 *
 * If stripe_customer_id is null but any customer was found by email, the
 * profile is linked to the customer with the most paid invoices (stable
 * target for webhooks).
 *
 * Requires guide authentication.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Low rate limit — this is an expensive operation
  if (!(await checkRateLimit(req, res, { windowMs: 60_000, max: 3, keyPrefix: 'stripe-sync' }))) {
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

  const body = (req.body ?? {}) as Record<string, unknown>;
  const emailFilter = normalizeEmail(typeof body.email === 'string' ? body.email : null);
  const debug = Boolean(body.debug);

  let synced = 0;
  let totalNewOrders = 0;
  let customersLinked = 0;
  const errors: string[] = [];
  const debugProfiles: Array<Record<string, unknown>> = [];

  try {
    const selectCols =
      'id, email, alternate_emails, stripe_customer_id, order_history, customer_since';
    const [{ data: withStripe, error: errStripe }, { data: emailOnly, error: errEmail }] =
      await Promise.all([
        adminClient.from('profiles').select(selectCols).not('stripe_customer_id', 'is', null),
        adminClient
          .from('profiles')
          .select(selectCols)
          .is('stripe_customer_id', null)
          .not('email', 'is', null),
      ]);
    if (errStripe) throw errStripe;
    if (errEmail) throw errEmail;

    const profileById = new Map<string, (typeof withStripe)[number]>();
    for (const p of withStripe ?? []) profileById.set(p.id, p);
    for (const p of emailOnly ?? []) profileById.set(p.id, p);
    let profiles = [...profileById.values()];

    if (emailFilter) {
      profiles = profiles.filter((p) => {
        if (normalizeEmail(p.email) === emailFilter) return true;
        if (Array.isArray(p.alternate_emails)) {
          return p.alternate_emails.some((e) => normalizeEmail(e) === emailFilter);
        }
        return false;
      });
    }

    for (const profile of profiles) {
      try {
        const customerIds = await collectStripeCustomerIdsForProfile(stripe, {
          stripe_customer_id: profile.stripe_customer_id,
          email: profile.email,
          alternate_emails: profile.alternate_emails,
        });
        if (customerIds.length === 0) continue;

        const result = await syncInvoicesForCustomerIds(
          stripe,
          adminClient,
          profile.id,
          customerIds,
          profile.order_history,
          profile.customer_since,
          profile.stripe_customer_id
        );
        if (result.error) {
          errors.push(`${profile.id}: ${result.error}`);
          continue;
        }
        if (result.didLinkStripeCustomer) {
          customersLinked++;
        }
        if (result.updated) {
          synced++;
          totalNewOrders += result.newOrders;
        }

        if (debug || emailFilter) {
          debugProfiles.push({
            profileId: profile.id,
            email: profile.email,
            alternate_emails: profile.alternate_emails,
            prior_stripe_customer_id: profile.stripe_customer_id,
            customerIds,
            primaryStripeCustomerId: result.primaryStripeCustomerId,
            didLinkStripeCustomer: result.didLinkStripeCustomer,
            newOrdersAdded: result.newOrders,
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`profile ${profile.id}: ${msg}`);
      }
    }

    return res.status(200).json({
      synced,
      totalNewOrders,
      customersLinked,
      ...(debug || emailFilter ? { debugProfiles } : {}),
      ...(errors.length > 0 ? { errors } : {}),
    });
  } catch (err) {
    console.error('[stripe-sync] Error:', err);
    return res.status(500).json({ error: 'Failed to sync Stripe orders' });
  }
}

// ── Stripe customer discovery (multiple customers per email are common) ───────

function normalizeEmail(e: string | null | undefined): string | null {
  if (!e || typeof e !== 'string') return null;
  const t = e.trim().toLowerCase();
  return t.length > 0 ? t : null;
}

function isStripeCustomerId(id: string | null | undefined): id is string {
  return typeof id === 'string' && /^cus_[a-zA-Z0-9]+$/.test(id);
}

async function listCustomerIdsByEmail(stripe: Stripe, email: string): Promise<string[]> {
  const ids: string[] = [];
  let startingAfter: string | undefined;
  for (;;) {
    const page = await stripe.customers.list({
      email: email.toLowerCase(),
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    for (const c of page.data) ids.push(c.id);
    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data[page.data.length - 1].id;
  }
  return ids;
}

async function collectStripeCustomerIdsForProfile(
  stripe: Stripe,
  profile: {
    stripe_customer_id: string | null;
    email: string | null;
    alternate_emails: string[] | null;
  }
): Promise<string[]> {
  const set = new Set<string>();
  // Only trust real Stripe customer IDs. We've seen legacy/other-system ids (e.g. gcus_...)
  // stored in this column which would break invoice listing.
  if (isStripeCustomerId(profile.stripe_customer_id)) set.add(profile.stripe_customer_id);

  const emails = new Set<string>();
  const primary = normalizeEmail(profile.email);
  if (primary) emails.add(primary);
  if (Array.isArray(profile.alternate_emails)) {
    for (const a of profile.alternate_emails) {
      const n = normalizeEmail(a);
      if (n) emails.add(n);
    }
  }

  for (const em of emails) {
    for (const id of await listCustomerIdsByEmail(stripe, em)) {
      set.add(id);
    }
  }
  return [...set];
}

async function fetchAllPaidInvoicesForCustomer(
  stripe: Stripe,
  stripeCustomerId: string
): Promise<Stripe.Invoice[]> {
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
  return invoices;
}

/** Prefer existing linked customer for subscriptions; else the customer with the most paid invoices. */
function pickPrimaryStripeCustomerId(
  customerIds: string[],
  invoiceCountByCustomer: Map<string, number>,
  existingStripeCustomerId: string | null
): string | null {
  if (customerIds.length === 0) return null;
  if (
    existingStripeCustomerId &&
    customerIds.includes(existingStripeCustomerId) &&
    (invoiceCountByCustomer.get(existingStripeCustomerId) ?? 0) > 0
  ) {
    return existingStripeCustomerId;
  }
  let best = customerIds[0];
  let bestCount = -1;
  for (const id of customerIds) {
    const n = invoiceCountByCustomer.get(id) ?? 0;
    if (n > bestCount) {
      bestCount = n;
      best = id;
    }
  }
  if (bestCount > 0) return best;
  if (existingStripeCustomerId && customerIds.includes(existingStripeCustomerId)) {
    return existingStripeCustomerId;
  }
  return customerIds[0];
}

// ── Merge paid invoices from multiple Stripe customers into one profile ───────

async function syncInvoicesForCustomerIds(
  stripe: Stripe,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
  profileId: string,
  customerIds: string[],
  existingOrderHistory: any,
  existingCustomerSince: string | null,
  existingStripeCustomerId: string | null
): Promise<{
  updated: boolean;
  newOrders: number;
  error?: string;
  primaryStripeCustomerId: string | null;
  /** True when this run set stripe_customer_id on a profile that had none. */
  didLinkStripeCustomer: boolean;
}> {
  try {
    const invoiceCountByCustomer = new Map<string, number>();
    const invoicesById = new Map<string, Stripe.Invoice>();

    const validCustomerIds = customerIds.filter((cid) => isStripeCustomerId(cid));
    const deletedCustomerIds = new Set<string>();

    for (const cid of validCustomerIds) {
      try {
        const batch = await fetchAllPaidInvoicesForCustomer(stripe, cid);
        invoiceCountByCustomer.set(cid, batch.length);
        for (const inv of batch) {
          if (!invoicesById.has(inv.id)) invoicesById.set(inv.id, inv);
        }
      } catch (err: any) {
        if (err?.code === 'resource_missing') {
          deletedCustomerIds.add(cid);
        } else {
          console.error(`[stripe-sync] Failed to fetch invoices for ${cid}:`, err);
        }
        invoiceCountByCustomer.set(cid, 0);
      }
    }

    const invoices = [...invoicesById.values()];
    const primaryStripeCustomerId = pickPrimaryStripeCustomerId(
      validCustomerIds,
      invoiceCountByCustomer,
      isStripeCustomerId(existingStripeCustomerId) ? existingStripeCustomerId : null
    );

    const existingHistory: any[] = Array.isArray(existingOrderHistory) ? existingOrderHistory : [];

    if (invoices.length === 0 && existingHistory.length === 0) {
      return {
        updated: false,
        newOrders: 0,
        primaryStripeCustomerId,
        didLinkStripeCustomer: false,
      };
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

    mergedHistory.sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''));

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

    const updatePayload: Record<string, unknown> = {
      order_history: mergedHistory,
      order_count: orderCount,
      lifetime_value: lifetimeValue,
      avg_order_value: avgOrderValue,
      last_order_date: lastOrderDate,
      customer_since: customerSince,
    };

    let didLinkStripeCustomer = false;
    if (
      primaryStripeCustomerId &&
      (!existingStripeCustomerId ||
        primaryStripeCustomerId !== existingStripeCustomerId)
    ) {
      updatePayload.stripe_customer_id = primaryStripeCustomerId;
      if (!existingStripeCustomerId) didLinkStripeCustomer = true;
    } else if (
      existingStripeCustomerId &&
      deletedCustomerIds.has(existingStripeCustomerId) &&
      !primaryStripeCustomerId
    ) {
      // Stored customer ID is confirmed deleted in Stripe and no replacement found — clear it.
      updatePayload.stripe_customer_id = null;
      console.log(`[stripe-sync] Cleared deleted stripe_customer_id ${existingStripeCustomerId} from profile ${profileId}`);
    }

    const { error: updateError } = await adminClient
      .from('profiles')
      .update(updatePayload)
      .eq('id', profileId);

    if (updateError) {
      return {
        updated: false,
        newOrders: 0,
        error: updateError.message,
        primaryStripeCustomerId,
        didLinkStripeCustomer: false,
      };
    }

    return {
      updated: true,
      newOrders: newOrdersAdded,
      primaryStripeCustomerId,
      didLinkStripeCustomer,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      updated: false,
      newOrders: 0,
      error: msg,
      primaryStripeCustomerId: null,
      didLinkStripeCustomer: false,
    };
  }
}
