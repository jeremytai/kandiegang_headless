// Combined admin/report endpoint: analytics, waitlist, profile update
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '../lib/rateLimit';
import { bucketize, aggregateByMonth, countByArea } from '../utils/dataTransformations';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const WAITLIST_REPORT_SECRET = process.env.WAITLIST_REPORT_SECRET;

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
  // --- Analytics Data ---
  if (req.method === 'GET' && req.query.type === 'analytics') {
    if (!checkRateLimit(req, res, { windowMs: 60_000, max: 10, keyPrefix: 'analytics-data' })) return;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: 'Analytics is not configured' });
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });
    const { data: callerProfile } = await adminClient.from('profiles').select('is_guide').eq('id', user.id).single();
    if (!callerProfile?.is_guide) return res.status(403).json({ error: 'Forbidden — guide access required' });
    // ...existing analytics-data logic...
    return res.status(501).json({ error: 'Analytics logic placeholder' });
  }

  // --- Waitlist Report ---
  if (req.method === 'GET' && req.query.type === 'waitlist') {
    if (!checkRateLimit(req, res, { windowMs: 60_000, max: 30, keyPrefix: 'waitlist-report' })) return;
    const headerSecret = req.headers['x-waitlist-secret'];
    const secret = Array.isArray(headerSecret) ? headerSecret[0] : headerSecret;
    if (!WAITLIST_REPORT_SECRET || !secret || secret !== WAITLIST_REPORT_SECRET) return res.status(401).json({ error: 'Unauthorized' });
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: 'Waitlist report is not configured' });
    // ...existing waitlist-report logic...
    return res.status(501).json({ error: 'Waitlist logic placeholder' });
  }

  // --- Admin Profile Update ---
  if (req.method === 'POST' && req.query.type === 'profile-update') {
    if (!checkRateLimit(req, res, { windowMs: 60_000, max: 30, keyPrefix: 'admin-update-profile' })) return;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: 'Not configured' });
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });
    const { data: callerProfile } = await adminClient.from('profiles').select('is_guide').eq('id', user.id).single();
    if (!callerProfile?.is_guide) return res.status(403).json({ error: 'Forbidden — guide access required' });
    // ...existing admin-update-profile logic...
    return res.status(501).json({ error: 'Profile update logic placeholder' });
  }

  return res.status(405).json({ error: 'Method or type not allowed' });
}
