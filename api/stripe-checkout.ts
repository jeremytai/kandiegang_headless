// Combined Stripe API: checkout session (POST action=checkout), portal session (POST action=portal)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kandiegang.com';

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' })
  : null;

const CLUB_MEMBERSHIP_SLUG = 'kandie-gang-cycling-club-membership';
function isClubMembershipOnly<T extends { productSlug: string }>(items: T[]): boolean {
  return items.length > 0 && items.every((i) => i.productSlug === CLUB_MEMBERSHIP_SLUG);
}

type LineItemInput = {
  priceId: string;
  quantity: number;
  productId: string;
  productTitle: string;
  productSlug: string;
};

function isLineItemInput(x: unknown): x is LineItemInput {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.priceId === 'string' &&
    typeof o.quantity === 'number' &&
    o.quantity >= 1 &&
    typeof o.productId === 'string' &&
    typeof o.productTitle === 'string' &&
    typeof o.productSlug === 'string'
  );
}

function stripeErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'type' in err) {
    const stripeErr = err as { type?: string; code?: string; message?: string };
    if (stripeErr.type === 'StripeInvalidRequestError') {
      return (
        stripeErr.message ?? 'Invalid request to payment provider (e.g. invalid price or product).'
      );
    }
    if (stripeErr.type === 'StripeAuthenticationError') {
      return 'Payment provider configuration error. Check STRIPE_SECRET_KEY (use sk_test_... or sk_live_...).';
    }
    if (stripeErr.message) return stripeErr.message;
  }
  return err instanceof Error ? err.message : 'Unknown error';
}

// ─── Checkout session handler ─────────────────────────────────────────────────
async function handleCheckout(req: VercelRequest, res: VercelResponse) {
  const sendResponse = (status: number, data: Record<string, unknown>) => {
    if (!res.headersSent) return res.status(status).json(data);
  };

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (!stripe) {
    return sendResponse(500, {
      error:
        'Stripe is not configured. Set STRIPE_SECRET_KEY in .env (or Vercel env). Use `vercel dev` for local checkout.',
      hint: 'When using vercel dev, ensure STRIPE_SECRET_KEY is in your .env file.',
    });
  }

  try {
    const body = req.body as Record<string, unknown>;
    const { userId, userEmail } = body;
    const lineItemsRaw = body.lineItems as unknown;
    const legacyPriceId = body.priceId as string | undefined;
    const legacyProductId = body.productId as string | undefined;
    const legacyProductTitle = body.productTitle as string | undefined;
    const legacyProductSlug = body.productSlug as string | undefined;

    let lineItems: LineItemInput[];
    if (Array.isArray(lineItemsRaw) && lineItemsRaw.length > 0) {
      if (!lineItemsRaw.every(isLineItemInput)) {
        return sendResponse(400, {
          error:
            'Invalid lineItems: each item must have priceId, quantity, productId, productTitle, productSlug',
        });
      }
      lineItems = lineItemsRaw.map((i) => ({
        priceId: i.priceId,
        quantity: Math.max(1, Math.floor(i.quantity)),
        productId: i.productId,
        productTitle: i.productTitle,
        productSlug: i.productSlug,
      }));
    } else if (legacyPriceId && legacyProductId && legacyProductTitle && legacyProductSlug) {
      lineItems = [
        {
          priceId: legacyPriceId,
          quantity: 1,
          productId: legacyProductId,
          productTitle: legacyProductTitle,
          productSlug: legacyProductSlug,
        },
      ];
    } else {
      return sendResponse(400, {
        error:
          'Either lineItems array or single priceId + productId + productTitle + productSlug is required',
      });
    }

    let mode: 'payment' | 'subscription' = 'payment';
    const priceIds = Array.from(new Set(lineItems.map((i) => i.priceId)));
    for (let i = 0; i < priceIds.length; i++) {
      const price = await stripe.prices.retrieve(priceIds[i]);
      const isRecurring = price.type === 'recurring';
      const itemMode = isRecurring ? 'subscription' : 'payment';
      if (i === 0) {
        mode = itemMode;
      } else if (mode !== itemMode) {
        return sendResponse(400, {
          error:
            'Basket cannot mix one-time payment and subscription items. Please checkout separately.',
        });
      }
    }

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;
    const successUrl = `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/shop`;

    const FREE_SHIPPING_THRESHOLD = 99;
    const SHIPPING_DE_CENTS = 590;
    const SHIPPING_EU_CENTS = 990;
    const shippingOption = (body.shippingOption as string) || 'de';
    const subtotal = typeof body.subtotal === 'number' ? body.subtotal : undefined;
    const cartIsMembershipOnly = isClubMembershipOnly(lineItems);

    let shippingAmountCents = 0;
    if (subtotal != null && subtotal > 0 && !cartIsMembershipOnly) {
      if (shippingOption === 'pickup' || subtotal >= FREE_SHIPPING_THRESHOLD) {
        shippingAmountCents = 0;
      } else if (shippingOption === 'eu') {
        shippingAmountCents = SHIPPING_EU_CENTS;
      } else {
        shippingAmountCents = SHIPPING_DE_CENTS;
      }
    }

    const shippingLabels: Record<string, string> = {
      de: 'Shipping (Standard – Germany)',
      eu: 'Shipping (Standard – EU)',
      pickup: 'Shipping (Local pickup)',
    };
    const shippingLabel = shippingLabels[shippingOption] || shippingLabels.de;

    const lineItemsForSession: Stripe.Checkout.SessionCreateParams.LineItem[] = lineItems.map(
      ({ priceId, quantity }) => ({ price: priceId, quantity })
    );
    if (subtotal != null) {
      lineItemsForSession.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: shippingAmountCents === 0 ? `${shippingLabel} – Free` : shippingLabel,
          },
          unit_amount: shippingAmountCents,
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItemsForSession,
      mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        productIds: lineItems.map((i) => i.productId).join(','),
        productTitles: lineItems.map((i) => i.productTitle).join('|'),
        productSlugs: lineItems.map((i) => i.productSlug).join(','),
        userId: (userId as string) || 'guest',
        ...(shippingOption && { shippingOption: String(shippingOption) }),
      },
      customer_email: (userEmail as string) || undefined,
      allow_promotion_codes: true,
    });

    return sendResponse(200, { sessionId: session.id, url: session.url });
  } catch (err) {
    console.error('Stripe checkout session creation error:', err);
    const message = stripeErrorMessage(err);
    const details = err instanceof Error ? err.stack : String(err);
    console.error('Error details:', details);
    if (!res.headersSent) {
      return res.status(500).json({
        error: `Checkout failed: ${message}`,
        ...(process.env.NODE_ENV === 'development' && { details }),
      });
    }
  }
}

// ─── Portal session handler ───────────────────────────────────────────────────
async function handlePortal(req: VercelRequest, res: VercelResponse) {
  if (!stripe || !supabaseUrl || !supabaseServiceKey) {
    console.error('[stripe-checkout] Missing required configuration for portal');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { userId } = req.body;
  if (!userId) return res.status(401).json({ error: 'Unauthorized - userId required' });

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    console.error('[stripe-checkout] Profile not found:', error);
    return res.status(404).json({ error: 'Profile not found' });
  }
  if (!profile.stripe_customer_id) {
    return res.status(404).json({ error: 'No Stripe customer found. Please contact support.' });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${siteUrl}/members`,
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[stripe-checkout] Failed to create portal session:', err);
    return res.status(500).json({ error: 'Failed to create portal session' });
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const action = (req.body as Record<string, unknown>)?.action;
  if (action === 'checkout') return handleCheckout(req, res);
  if (action === 'portal') return handlePortal(req, res);
  return res.status(400).json({ error: 'Invalid or missing action' });
}
