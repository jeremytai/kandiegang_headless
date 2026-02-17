import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '../lib/rateLimit';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

/** Fields that guides are allowed to edit via this endpoint. */
const EDITABLE_FIELDS = new Set([
  'is_guide',
  'is_member',
  'display_name',
  'tags',
  'accepts_marketing',
  'member_since',
  'membership_expiration',
  'order_history',
  'order_count',
  'lifetime_value',
  'avg_order_value',
  'last_order_date',
]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!checkRateLimit(req, res, { windowMs: 60_000, max: 30, keyPrefix: 'admin-update-profile' })) {
    return;
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Not configured' });
  }

  // Verify caller is an authenticated guide
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

  // Parse and validate request body
  const { memberId, updates } = req.body as {
    memberId?: string;
    updates?: Record<string, unknown>;
  };

  if (!memberId || typeof memberId !== 'string') {
    return res.status(400).json({ error: 'memberId is required' });
  }
  if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'updates object is required' });
  }

  // Filter to only allowed fields
  const safeUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (EDITABLE_FIELDS.has(key)) {
      safeUpdates[key] = value;
    }
  }

  if (Object.keys(safeUpdates).length === 0) {
    return res.status(400).json({ error: 'No editable fields provided' });
  }

  try {
    const { data, error } = await adminClient
      .from('profiles')
      .update(safeUpdates)
      .eq('id', memberId)
      .select('id, display_name, is_guide, is_member, tags, accepts_marketing, member_since, membership_expiration')
      .single();

    if (error) {
      console.error('Admin profile update error:', error);
      return res.status(500).json({ error: error.message || 'Failed to update profile' });
    }

    return res.status(200).json({ profile: data });
  } catch (err) {
    console.error('Admin profile update error:', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
}
