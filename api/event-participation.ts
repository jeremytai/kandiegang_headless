import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '../lib/rateLimit.js';
import type { EventParticipationEvent, EventParticipationRegistrant } from '../types/analytics';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const WP_GRAPHQL_URL =
  process.env.VITE_WP_GRAPHQL_URL ||
  process.env.WP_GRAPHQL_URL ||
  'https://wp-origin.kandiegang.com/graphql';

/**
 * GET /api/event-participation
 *
 * Returns all registrations grouped by event, enriched with WordPress
 * event titles/dates. Each event includes per-level counts and a full
 * participant list with cross-event signup/cancellation totals.
 *
 * Requires guide authentication.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!checkRateLimit(req, res, { windowMs: 60_000, max: 10, keyPrefix: 'event-participation' })) {
    return;
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Not configured' });
  }

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

  try {
    // Fetch all registrations (including cancelled), with profile email via join
    const { data: rows, error: regError } = await adminClient
      .from('registrations')
      .select(
        'event_id, ride_level, event_type, first_name, last_name, user_id, is_waitlist, created_at, cancelled_at, profiles(email)'
      )
      .order('created_at', { ascending: true });

    if (regError) throw regError;
    if (!rows || rows.length === 0) {
      return res.status(200).json({ events: [] });
    }

    // ── Per-user cross-event stats ────────────────────────────────────────────
    const totalSignupsByUser: Record<string, number> = {};
    const totalCancellationsByUser: Record<string, number> = {};

    for (const row of rows) {
      const uid = row.user_id as string | null;
      if (!uid) continue;
      if (!row.cancelled_at) {
        totalSignupsByUser[uid] = (totalSignupsByUser[uid] || 0) + 1;
      } else {
        totalCancellationsByUser[uid] = (totalCancellationsByUser[uid] || 0) + 1;
      }
    }

    // ── Group by event_id ─────────────────────────────────────────────────────
    const eventMap = new Map<
      number,
      { eventType: string; rows: typeof rows }
    >();

    for (const row of rows) {
      const eid = Number(row.event_id);
      if (!eventMap.has(eid)) {
        eventMap.set(eid, { eventType: row.event_type || 'ride', rows: [] });
      }
      eventMap.get(eid)!.rows.push(row);
    }

    const eventIds = [...eventMap.keys()];

    // ── Batch-fetch WordPress titles/dates via aliased GraphQL ────────────────
    const wpData = await fetchWpEventsMeta(eventIds);

    // ── Build output ──────────────────────────────────────────────────────────
    const events: EventParticipationEvent[] = eventIds.map((eid) => {
      const group = eventMap.get(eid)!;
      const meta = wpData[eid] ?? { title: `Event #${eid}`, date: '' };

      const byLevel: Record<string, { confirmed: number; waitlist: number; cancelled: number }> =
        {};

      let confirmed = 0;
      let waitlist = 0;
      let cancelled = 0;

      const registrants: EventParticipationRegistrant[] = group.rows.map((row) => {
        const level = row.ride_level || 'unknown';
        if (!byLevel[level]) byLevel[level] = { confirmed: 0, waitlist: 0, cancelled: 0 };

        const isCancelled = Boolean(row.cancelled_at);
        const isWaitlist = Boolean(row.is_waitlist) && !isCancelled;

        if (isCancelled) {
          byLevel[level].cancelled++;
          cancelled++;
        } else if (isWaitlist) {
          byLevel[level].waitlist++;
          waitlist++;
        } else {
          byLevel[level].confirmed++;
          confirmed++;
        }

        const uid = row.user_id as string | null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const profileEmail = (row as any).profiles?.email ?? null;

        return {
          userId: uid,
          firstName: row.first_name,
          lastName: row.last_name,
          email: profileEmail,
          rideLevel: level,
          isWaitlist: Boolean(row.is_waitlist),
          signedUpAt: row.created_at,
          cancelledAt: row.cancelled_at ?? null,
          totalSignups: uid ? (totalSignupsByUser[uid] || 0) : 0,
          totalCancellations: uid ? (totalCancellationsByUser[uid] || 0) : 0,
        };
      });

      return {
        eventId: eid,
        title: meta.title,
        date: meta.date,
        eventType: group.eventType,
        confirmed,
        waitlist,
        cancelled,
        byLevel,
        registrants,
      };
    });

    // Sort newest first (fallback to eventId desc for events without a date)
    events.sort((a, b) => {
      if (a.date && b.date) return b.date.localeCompare(a.date);
      return b.eventId - a.eventId;
    });

    return res.status(200).json({ events });
  } catch (err) {
    console.error('[event-participation] Error:', err);
    return res.status(500).json({ error: 'Failed to load event participation data' });
  }
}

// ── WordPress batch meta fetch ────────────────────────────────────────────────

async function fetchWpEventsMeta(
  eventIds: number[]
): Promise<Record<number, { title: string; date: string }>> {
  if (eventIds.length === 0) return {};

  // Build aliased GraphQL query — one alias per event ID
  const aliases = eventIds
    .map(
      (id) =>
        `e${id}: rideEvent(id: "${id}", idType: DATABASE_ID) { title date }`
    )
    .join('\n    ');

  const query = `query BatchEventsMeta {\n    ${aliases}\n  }`;

  try {
    const response = await fetch(WP_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) return {};
    const json = await response.json().catch(() => ({}));
    const data = json?.data ?? {};

    const result: Record<number, { title: string; date: string }> = {};
    for (const id of eventIds) {
      const entry = data[`e${id}`];
      if (entry) {
        result[id] = {
          title: entry.title || `Event #${id}`,
          date: entry.date ? entry.date.split('T')[0] : '',
        };
      }
    }
    return result;
  } catch {
    return {};
  }
}
