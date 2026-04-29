import type { NextApiResponse } from 'next';

const WP_GRAPHQL_URL =
  process.env.VITE_WP_GRAPHQL_URL ||
  process.env.WP_GRAPHQL_URL ||
  'https://wp-origin.kandiegang.com/graphql';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleEventParticipation(res: NextApiResponse, adminClient: any) {
  try {
    const { data: rows, error: regError } = await adminClient
      .from('registrations')
      .select(
        'id, event_id, ride_level, event_type, first_name, last_name, user_id, email, is_waitlist, created_at, cancelled_at, no_show_at'
      )
      .order('created_at', { ascending: true });

    if (regError) throw regError;
    if (!rows || rows.length === 0) return res.status(200).json({ events: [] });

    const userIds = [...new Set(rows.map((r: any) => r.user_id).filter(Boolean))] as string[];
    const emailByUserId: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profileRows } = await adminClient.from('profiles').select('id, email').in('id', userIds);
      if (profileRows) {
        for (const p of profileRows) emailByUserId[p.id] = p.email;
      }
    }

    const totalSignupsByUser: Record<string, number> = {};
    const totalCancellationsByUser: Record<string, number> = {};
    for (const row of rows) {
      const uid = row.user_id as string | null;
      if (!uid) continue;
      if (!row.cancelled_at) totalSignupsByUser[uid] = (totalSignupsByUser[uid] || 0) + 1;
      else totalCancellationsByUser[uid] = (totalCancellationsByUser[uid] || 0) + 1;
    }

    const eventMap = new Map<number, { eventType: string; rows: typeof rows }>();
    for (const row of rows) {
      const eid = Number(row.event_id);
      if (!eventMap.has(eid)) eventMap.set(eid, { eventType: row.event_type || 'ride', rows: [] });
      eventMap.get(eid)!.rows.push(row);
    }

    const EXCLUDED_EVENT_IDS = new Set([12989, 13021]);
    const eventIds = [...eventMap.keys()].filter((id) => !EXCLUDED_EVENT_IDS.has(id));
    const wpData = await fetchWpEventsMeta(eventIds);

    const LEVEL_ORDER = ['level1', 'level2', 'level2plus', 'level3', 'gravel', 'workshop'];

    const events = eventIds.map((eid) => {
      const group = eventMap.get(eid)!;
      const meta = wpData[eid] ?? { title: `Event #${eid}`, date: '' };
      const byLevel: Record<string, { confirmed: number; waitlist: number; cancelled: number }> = {};
      let confirmed = 0,
        waitlist = 0,
        cancelled = 0;

      const registrants = group.rows.map((row: any) => {
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
        return {
          registrationId: row.id,
          userId: uid,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email ?? (uid ? (emailByUserId[uid] ?? null) : null),
          rideLevel: level,
          isWaitlist: Boolean(row.is_waitlist),
          signedUpAt: row.created_at,
          cancelledAt: row.cancelled_at ?? null,
          noShowAt: row.no_show_at ?? null,
          totalSignups: uid ? totalSignupsByUser[uid] || 0 : 0,
          totalCancellations: uid ? totalCancellationsByUser[uid] || 0 : 0,
        };
      });

      const sortedByLevel: typeof byLevel = {};
      [...LEVEL_ORDER, ...Object.keys(byLevel).filter((l) => !LEVEL_ORDER.includes(l))].forEach((l) => {
        if (byLevel[l]) sortedByLevel[l] = byLevel[l];
      });

      return {
        eventId: eid,
        title: meta.title,
        date: meta.date,
        eventType: group.eventType,
        confirmed,
        waitlist,
        cancelled,
        byLevel: sortedByLevel,
        registrants,
      };
    });

    events.sort((a, b) => (a.date && b.date ? b.date.localeCompare(a.date) : b.eventId - a.eventId));
    return res.status(200).json({ events });
  } catch (err) {
    console.error('[event-participation] Error:', err);
    return res.status(500).json({ error: 'Failed to load event participation data' });
  }
}

async function fetchWpEventsMeta(
  eventIds: number[]
): Promise<Record<number, { title: string; date: string }>> {
  if (eventIds.length === 0) return {};
  const aliases = eventIds
    .map((id) => `e${id}: rideEvent(id: "${id}", idType: DATABASE_ID) { title eventDetails { eventDate } }`)
    .join('\n    ');
  try {
    const response = await fetch(WP_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: `query BatchEventsMeta {\n    ${aliases}\n  }` }),
    });
    if (!response.ok) return {};
    const json = await response.json().catch(() => ({}));
    const data = json?.data ?? {};
    const result: Record<number, { title: string; date: string }> = {};
    for (const id of eventIds) {
      const entry = data[`e${id}`];
      if (entry)
        result[id] = {
          title: entry.title || `Event #${id}`,
          date: entry.eventDetails?.eventDate ? entry.eventDetails.eventDate.split('T')[0] : '',
        };
    }
    return result;
  } catch {
    return {};
  }
}
