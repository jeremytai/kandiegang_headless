import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isGuideProfile } from './guideAccess.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

type GuideAuthContext = {
  adminClient: SupabaseClient;
  userId: string;
};

export async function requireGuideAuth(
  req: NextApiRequest,
  res: NextApiResponse,
  options?: { misconfiguredMessage?: string }
): Promise<GuideAuthContext | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    res.status(500).json({ error: options?.misconfiguredMessage || 'Backend is not configured' });
    return null;
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error: authError,
  } = await adminClient.auth.getUser(token);
  if (authError || !user) {
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }

  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('is_guide, membership_plans')
    .eq('id', user.id)
    .single();

  if (!isGuideProfile(callerProfile)) {
    res.status(403).json({ error: 'Forbidden — guide access required' });
    return null;
  }

  return { adminClient, userId: user.id };
}
