// Combined Stripe session API: checkout and portal
import type { NextApiRequest, NextApiResponse } from 'next';
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
type LineItemInput = {
  priceId: string;
  quantity: number;
  productId: string;
  productTitle: string;
  productSlug: string;
};

function isClubMembershipOnly(items: LineItemInput[]): boolean {
  return (
    items.length > 0 && items.every((i: LineItemInput) => i.productSlug === CLUB_MEMBERSHIP_SLUG)
  );
}

function isLineItemInput(x: unknown): x is LineItemInput {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.priceId === 'string' &&
    typeof o.quantity === 'number' &&
    (o.quantity as number) >= 1 &&
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!stripe || !supabaseUrl || !supabaseServiceKey) {
    console.error('[stripe-session] Missing required configuration');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (req.method === 'POST') {
    const { type } = req.body;
    if (type === 'portal') {
      // --- Portal session logic ---
      const { userId } = req.body;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized - userId required' });
      }
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('stripe_customer_id, email')
        .eq('id', userId)
        .single();
      if (error || !profile) {
        console.error('[stripe-session] Profile not found:', error);
        return res.status(404).json({ error: 'Profile not found' });
      }
      if (!profile.stripe_customer_id) {
        console.error('[stripe-session] No Stripe customer ID for user:', userId);
        return res.status(404).json({ error: 'No Stripe customer found. Please contact support.' });
      }
      try {
        const session = await stripe.billingPortal.sessions.create({
          customer: profile.stripe_customer_id,
          return_url: `${siteUrl}/members`,
        });
        console.log(`[stripe-session] Created portal session for user ${userId}`);
        return res.status(200).json({ url: session.url });
      } catch (err) {
        console.error('[stripe-session] Failed to create portal session:', err);
        return res.status(500).json({ error: 'Failed to create portal session' });
      }
    } else {
      // --- Checkout session logic ---
      const sendResponse = (status: number, data: Record<string, unknown>) => {
        if (!res.headersSent) {
          return res.status(status).json(data);
        }
      };
      try {
        const body = req.body;
        const { userId, userEmail } = body;
        const lineItemsRaw = body.lineItems;
        const legacyPriceId = body.priceId;
        const legacyProductId = body.productId;
        const legacyProductTitle = body.productTitle;
        const legacyProductSlug = body.productSlug;
        let lineItems: LineItemInput[];
        if (Array.isArray(lineItemsRaw) && lineItemsRaw.length > 0) {
          if (!lineItemsRaw.every(isLineItemInput)) {
            return sendResponse(400, {
              error:
                'Invalid lineItems: each item must have priceId, quantity, productId, productTitle, productSlug',
            });
          }
          lineItems = (lineItemsRaw as unknown[]).map((i) => {
            const item = i as LineItemInput;
            return {
              priceId: item.priceId,
              quantity: Math.max(1, Math.floor(item.quantity)),
              productId: item.productId,
              productTitle: item.productTitle,
              productSlug: item.productSlug,
            };
          });
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
        let mode: Stripe.Checkout.SessionCreateParams.Mode = 'payment';
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
        const shippingOption = body.shippingOption || 'de';
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

        const shippingLabel = shippingLabels[shippingOption as keyof typeof shippingLabels] || shippingLabels.de;


        const lineItemsForSession: Stripe.Checkout.SessionCreateParams.LineItem[] = lineItems.map(
          ({ priceId, quantity }) => ({
            price: priceId,
            quantity,
          })
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
        const metadata = {
          productIds: lineItems.map((i) => i.productId).join(','),
          productTitles: lineItems.map((i) => i.productTitle).join('|'),
          productSlugs: lineItems.map((i) => i.productSlug).join(','),
          userId: userId || 'guest',
          ...(shippingOption && { shippingOption: String(shippingOption) }),
        };
        const customer_email = userEmail || undefined;
        const allow_promotion_codes = true;
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: lineItemsForSession,
          mode,
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata,
          customer_email,
          allow_promotion_codes,
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
  } else {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
