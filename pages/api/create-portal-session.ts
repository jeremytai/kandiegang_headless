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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!stripe || !supabaseUrl || !supabaseServiceKey) {
    console.error('[create-portal-session] Missing required configuration');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Get user ID from request body
  // NOTE: Adjust this based on your authentication setup
  // You may want to extract userId from a session token instead
  const { userId } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized - userId required' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Get user's Stripe customer ID from Supabase
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    console.error('[create-portal-session] Profile not found:', error);
    return res.status(404).json({ error: 'Profile not found' });
  }

  if (!profile.stripe_customer_id) {
    console.error('[create-portal-session] No Stripe customer ID for user:', userId);
    return res.status(404).json({ error: 'No Stripe customer found. Please contact support.' });
  }

  try {
    // Create Stripe billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${siteUrl}/members`,
    });

    console.log(`[create-portal-session] Created portal session for user ${userId}`);
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[create-portal-session] Failed to create portal session:', err);
    return res.status(500).json({ error: 'Failed to create portal session' });
  }
}
