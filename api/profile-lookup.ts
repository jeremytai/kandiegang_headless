// Migrated from /api/profile-lookup.ts to Next.js API route
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '../lib/rateLimit';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!checkRateLimit(req, res, { windowMs: 60_000, max: 20, keyPrefix: 'profile-lookup' })) {
    return;
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(200).json({ displayName: null });
  }
  const body = req.body as { email?: string };
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || !email.includes('@')) {
    return res.status(200).json({ displayName: null });
  }
  try {
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await adminClient
      .from('profiles')
      .select('display_name')
      .ilike('email', email)
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn('Profile lookup error:', error);
      return res.status(200).json({ displayName: null });
    }
    const displayName =
      typeof data?.display_name === 'string' && data.display_name.trim()
        ? data.display_name.trim()
        : null;
    return res.status(200).json({ displayName });
  } catch (err) {
    console.warn('Profile lookup failed:', err);
    return res.status(200).json({ displayName: null });
  }
}
