// Migrated from /api/event-capacity.ts to Next.js API route
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Capacity lookup is not configured' });
  }
  const eventIdRaw = req.query.eventId as string | string[] | undefined;
  const eventId = Array.isArray(eventIdRaw) ? eventIdRaw[0] : eventIdRaw;
  const eventIdNumber = eventId ? Number(eventId) : NaN;
  if (!eventId || Number.isNaN(eventIdNumber)) {
    return res.status(400).json({ error: 'Missing or invalid eventId' });
  }
  try {
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await adminClient
      .from('registrations')
      .select('ride_level')
      .eq('event_id', eventIdNumber)
      .eq('is_waitlist', false)
      .is('cancelled_at', null);
    if (error) {
      console.error('Event capacity error:', error);
      return res.status(500).json({ error: error.message || 'Failed to load capacity' });
    }
    const counts: Record<string, number> = {};
    const rows = Array.isArray(data) ? data : [];
    rows.forEach((row) => {
      const level =
        typeof row.ride_level === 'string' && row.ride_level.trim() ? row.ride_level : 'workshop';
      counts[level] = (counts[level] ?? 0) + 1;
    });
    return res.status(200).json({
      eventId: eventIdNumber,
      total: rows.length,
      counts,
    });
  } catch (err) {
    console.error('event-capacity error:', err);
    return res.status(500).json({ error: 'Failed to load capacity' });
  }
}
