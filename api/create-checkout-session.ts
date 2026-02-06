/**
 * Vercel serverless function to create Stripe Checkout sessions.
 * Handles both public and member pricing based on user authentication.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY is not set. Stripe checkout will not work.');
}

const stripe = stripeSecretKey 
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
    })
  : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Ensure we always send a response, even on unexpected errors
  const sendResponse = (status: number, data: any) => {
    if (!res.headersSent) {
      return res.status(status).json(data);
    }
  };

  try {
    console.log('Checkout session request received:', { method: req.method, hasBody: !!req.body });
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return sendResponse(405, { error: 'Method not allowed' });
    }

    // Check if Stripe is configured
    const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
    console.log('Stripe configuration check:', { hasStripeKey, stripeInitialized: !!stripe });
    
    if (!stripe) {
      console.error('Stripe is not configured. STRIPE_SECRET_KEY is missing.');
      return sendResponse(500, { 
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in your Vercel environment variables or .env file.',
        hint: 'When using vercel dev, make sure STRIPE_SECRET_KEY is set in your .env file or Vercel project settings.'
      });
    }
    const { priceId, productId, productTitle, productSlug, userId, userEmail } = req.body;

    if (!priceId) {
      return sendResponse(400, { error: 'Price ID is required' });
    }

    if (!productId || !productTitle || !productSlug) {
      return sendResponse(400, { error: 'Product information is required' });
    }

    // Fetch the price to determine if it's recurring (subscription) or one-time (payment)
    const price = await stripe.prices.retrieve(priceId);
    const isRecurring = price.type === 'recurring';
    const mode: 'payment' | 'subscription' = isRecurring ? 'subscription' : 'payment';

    console.log('Price details:', { priceId, type: price.type, mode, recurring: isRecurring });

    // Build success and cancel URLs using request headers for proper host detection
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;
    
    const successUrl = `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/shop/${productSlug}`;

    // Create checkout session with appropriate mode
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        productId,
        productTitle,
        productSlug,
        userId: userId || 'guest',
      },
      customer_email: userEmail || undefined,
      allow_promotion_codes: true,
    });

    return sendResponse(200, { sessionId: session.id, url: session.url });
  } catch (err) {
    console.error('Stripe checkout session creation error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const errorDetails = err instanceof Error ? err.stack : String(err);
    console.error('Error details:', errorDetails);
    
    return sendResponse(500, { 
      error: `Failed to create checkout session: ${errorMessage}`,
      details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    });
  }
}
