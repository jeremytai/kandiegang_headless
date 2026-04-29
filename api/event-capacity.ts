import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WP_GRAPHQL_URL =
  process.env.VITE_WP_GRAPHQL_URL ||
  process.env.WP_GRAPHQL_URL ||
  'https://wp-origin.kandiegang.com/graphql';

async function fetchHasRegistrationCode(eventId: number): Promise<boolean> {
  const query = `query GetRideEventCode($id: ID!) { rideEvent(id: $id, idType: DATABASE_ID) { eventDetails { registrationCode } } }`;
  try {
    const response = await fetch(WP_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { id: eventId } }),
    });
    if (!response.ok) return false;
    const json = await response.json().catch(() => ({}));
    const code = json?.data?.rideEvent?.eventDetails?.registrationCode;
    return typeof code === 'string' && code.trim().length > 0;
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Capacity lookup is not configured' });
  }

  const eventIdRaw = req.query.eventId;
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
      .select('ride_level, is_waitlist')
      .eq('event_id', eventIdNumber)
      .is('cancelled_at', null);

    if (error) {
      return res.status(500).json({ error: error.message || 'Failed to load capacity' });
    }

    const confirmedCounts: Record<string, number> = {};
    const waitlistCounts: Record<string, number> = {};

    for (const row of data ?? []) {
      const level =
        typeof row.ride_level === 'string' && row.ride_level.trim() ? row.ride_level : 'workshop';
      if (row.is_waitlist === true) {
        waitlistCounts[level] = (waitlistCounts[level] ?? 0) + 1;
      } else {
        confirmedCounts[level] = (confirmedCounts[level] ?? 0) + 1;
      }
    }

    const hasRegistrationCode = await fetchHasRegistrationCode(eventIdNumber);
    return res.status(200).json({
      eventId: eventIdNumber,
      counts: confirmedCounts,
      waitlistCounts,
      total: Object.values(confirmedCounts).reduce((sum, count) => sum + count, 0),
      hasRegistrationCode,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to load capacity' });
  }
}
