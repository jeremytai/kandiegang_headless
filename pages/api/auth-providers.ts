// Migrated from /api/auth-providers.ts to Next.js API route
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }
  const body = req.body;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Missing or invalid request body' });
  }
  try {
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await adminClient
      .from('auth_providers')
      .upsert([body], { onConflict: ['provider_type', 'provider_user_id'] });
    if (error) {
      console.error('auth-providers error:', error);
      return res.status(500).json({ error: error.message || 'Failed to insert auth provider' });
    }
    return res.status(200).json({ data });
  } catch (err) {
    console.error('auth-providers error:', err);
    return res.status(500).json({ error: 'Failed to insert auth provider' });
  }
}
