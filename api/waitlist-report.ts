import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from './_rateLimit';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WAITLIST_REPORT_SECRET = process.env.WAITLIST_REPORT_SECRET;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!checkRateLimit(req, res, { windowMs: 60_000, max: 30, keyPrefix: 'waitlist-report' })) {
    return;
  }

  const headerSecret = req.headers['x-waitlist-secret'];
  const secret = Array.isArray(headerSecret) ? headerSecret[0] : headerSecret;
  if (!WAITLIST_REPORT_SECRET || !secret || secret !== WAITLIST_REPORT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Waitlist report is not configured' });
  }

  const eventIdRaw = req.query.eventId as string | string[] | undefined;
  const rideLevelRaw = req.query.rideLevel as string | string[] | undefined;
  const eventId = Array.isArray(eventIdRaw) ? eventIdRaw[0] : eventIdRaw;
  const rideLevel = Array.isArray(rideLevelRaw) ? rideLevelRaw[0] : rideLevelRaw;

  try {
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let query = adminClient
      .from('registrations')
      .select('id,event_id,ride_level,waitlist_joined_at,user_id,profiles(email)')
      .eq('is_waitlist', true)
      .is('cancelled_at', null)
      .order('waitlist_joined_at', { ascending: true });

    if (eventId) {
      const eventIdNumber = Number(eventId);
      if (!Number.isNaN(eventIdNumber)) {
        query = query.eq('event_id', eventIdNumber);
      }
    }

    if (rideLevel) {
      query = query.eq('ride_level', rideLevel);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Waitlist report error:', error);
      return res.status(500).json({ error: error.message || 'Failed to load waitlist' });
    }

    return res.status(200).json({
      total: data?.length ?? 0,
      rows: data ?? [],
    });
  } catch (err) {
    console.error('waitlist-report error:', err);
    return res.status(500).json({ error: 'Failed to load waitlist' });
  }
}
