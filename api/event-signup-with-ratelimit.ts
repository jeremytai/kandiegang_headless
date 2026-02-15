import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from './_rateLimit';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Test rate limiting
    if (!checkRateLimit(req, res, { windowMs: 60_000, max: 20, keyPrefix: 'event-signup' })) {
      return;
    }

    return res.status(200).json({
      message: 'Endpoint with rate limiting working',
      body: req.body,
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: 'Internal error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
