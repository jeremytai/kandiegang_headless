import type { NextApiResponse } from 'next';
import type { EventParticipationSummary } from '../../types/analytics.js';

const WP_GRAPHQL_URL =
  process.env.VITE_WP_GRAPHQL_URL ||
  process.env.WP_GRAPHQL_URL ||
  'https://wp-origin.kandiegang.com/graphql';
const FLINTA_EARLY_DAYS = Number(process.env.FLINTA_EARLY_DAYS ?? 7);
const MEMBER_EARLY_DAYS = Number(process.env.MEMBER_EARLY_DAYS ?? 5);

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const value = email.trim().toLowerCase();
  return value.length > 0 ? value : null;
}

type RegistrationRow = {
  id: string;
  event_id: number | string;
  ride_level: string | null;
  event_type: string | null;
  first_name: string;
  last_name: string;
  user_id: string | null;
  email: string | null;
  is_waitlist: boolean | null;
  created_at: string;
  cancelled_at: string | null;
  no_show_at: string | null;
  flinta_attested?: boolean | null;
};

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleEventParticipation(res: NextApiResponse, adminClient: any) {
  try {
    let hasFlintaColumn = true;
    let rows: RegistrationRow[] = [];

    const withFlinta = await adminClient
      .from('registrations')
      .select(
        'id, event_id, ride_level, event_type, first_name, last_name, user_id, email, is_waitlist, created_at, cancelled_at, no_show_at, flinta_attested'
      )
      .order('created_at', { ascending: true });

    if (withFlinta.error) {
      const message = String(withFlinta.error.message || '').toLowerCase();
      if (message.includes('flinta_attested') && message.includes('column')) {
        hasFlintaColumn = false;
        const fallback = await adminClient
          .from('registrations')
          .select(
            'id, event_id, ride_level, event_type, first_name, last_name, user_id, email, is_waitlist, created_at, cancelled_at, no_show_at'
          )
          .order('created_at', { ascending: true });
        if (fallback.error) throw fallback.error;
        rows = (fallback.data ?? []) as RegistrationRow[];
      } else {
        throw withFlinta.error;
      }
    } else {
      rows = (withFlinta.data ?? []) as RegistrationRow[];
    }

    if (!rows || rows.length === 0) return res.status(200).json({ events: [] });

    const userIds = [...new Set(rows.map((r: any) => r.user_id).filter(Boolean))] as string[];
    const emailByUserId: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profileRows } = await adminClient.from('profiles').select('id, email').in('id', userIds);
      if (profileRows) {
        for (const p of profileRows) emailByUserId[p.id] = p.email;
      }
    }

    const userIdByEmail: Record<string, string> = {};
    for (const row of rows) {
      const uid = row.user_id as string | null;
      if (!uid) continue;
      const normalizedRowEmail = normalizeEmail(row.email);
      if (normalizedRowEmail && !userIdByEmail[normalizedRowEmail]) {
        userIdByEmail[normalizedRowEmail] = uid;
      }
      const normalizedProfileEmail = normalizeEmail(emailByUserId[uid]);
      if (normalizedProfileEmail && !userIdByEmail[normalizedProfileEmail]) {
        userIdByEmail[normalizedProfileEmail] = uid;
      }
    }

    function identityKeyForRow(row: any): string | null {
      const uid = row.user_id as string | null;
      if (uid) return `uid:${uid}`;
      const normalizedEmail = normalizeEmail(row.email);
      if (!normalizedEmail) return null;
      const mappedUserId = userIdByEmail[normalizedEmail];
      if (mappedUserId) return `uid:${mappedUserId}`;
      return `email:${normalizedEmail}`;
    }

    const totalSignupsByUser: Record<string, number> = {};
    const totalCancellationsByUser: Record<string, number> = {};
    for (const row of rows) {
      const identityKey = identityKeyForRow(row);
      if (!identityKey) continue;
      if (!row.cancelled_at) totalSignupsByUser[identityKey] = (totalSignupsByUser[identityKey] || 0) + 1;
      else totalCancellationsByUser[identityKey] = (totalCancellationsByUser[identityKey] || 0) + 1;
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
        const identityKey = identityKeyForRow(row);
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
          totalSignups: identityKey ? totalSignupsByUser[identityKey] || 0 : 0,
          totalCancellations: identityKey ? totalCancellationsByUser[identityKey] || 0 : 0,
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

    const activeRows = rows.filter((row) => !row.cancelled_at);
    const cancelledRows = rows.filter((row) => Boolean(row.cancelled_at));
    const flintaAttestedActive = hasFlintaColumn
      ? activeRows.filter((row) => row.flinta_attested === true).length
      : 0;
    const maleOrUnknownActive = Math.max(activeRows.length - flintaAttestedActive, 0);
    const flintaRatioPct =
      hasFlintaColumn && activeRows.length > 0 ? (flintaAttestedActive / activeRows.length) * 100 : null;

    let eventsWithReleaseDate = 0;
    let earlySignupTotal = 0;
    let earlyFlintaWindowCount = 0;
    let earlyMemberWindowCount = 0;
    const dayMs = 24 * 60 * 60 * 1000;

    for (const row of rows) {
      const eventMeta = wpData[Number(row.event_id)];
      const releaseDate = parseIsoDate(eventMeta?.publicReleaseDate);
      const createdAt = parseIsoDate(row.created_at);
      if (!releaseDate || !createdAt) continue;

      eventsWithReleaseDate += 1;
      if (createdAt >= releaseDate) continue;

      earlySignupTotal += 1;
      const msDiff = releaseDate.getTime() - createdAt.getTime();
      const daysBeforeRelease = msDiff / dayMs;
      if (daysBeforeRelease <= MEMBER_EARLY_DAYS) {
        earlyMemberWindowCount += 1;
      } else if (daysBeforeRelease <= FLINTA_EARLY_DAYS) {
        earlyFlintaWindowCount += 1;
      }
    }

    const earlySignupPct =
      eventsWithReleaseDate > 0 ? (earlySignupTotal / eventsWithReleaseDate) * 100 : null;

    const summary: EventParticipationSummary = {
      totalActiveRegistrations: activeRows.length,
      totalCancelledRegistrations: cancelledRows.length,
      flintaAttestedActive,
      maleOrUnknownActive,
      flintaRatioPct,
      flintaStatus: hasFlintaColumn ? 'available' : 'unavailable',
      flintaStatusReason: hasFlintaColumn ? null : 'missing_column',
      eventsWithReleaseDate,
      earlySignupTotal,
      earlySignupPct,
      earlyFlintaWindowCount,
      earlyMemberWindowCount,
    };

    return res.status(200).json({ events, summary });
  } catch (err) {
    console.error('[event-participation] Error:', err);
    return res.status(500).json({ error: 'Failed to load event participation data' });
  }
}

async function fetchWpEventsMeta(
  eventIds: number[]
): Promise<Record<number, { title: string; date: string; publicReleaseDate?: string | null }>> {
  if (eventIds.length === 0) return {};
  const aliases = eventIds
    .map(
      (id) =>
        `e${id}: rideEvent(id: "${id}", idType: DATABASE_ID) { title publicReleaseDate eventDetails { eventDate } }`
    )
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
    const result: Record<number, { title: string; date: string; publicReleaseDate?: string | null }> = {};
    for (const id of eventIds) {
      const entry = data[`e${id}`];
      if (entry)
        result[id] = {
          title: entry.title || `Event #${id}`,
          date: entry.eventDetails?.eventDate ? entry.eventDetails.eventDate.split('T')[0] : '',
          publicReleaseDate: entry.publicReleaseDate ?? null,
        };
    }
    return result;
  } catch {
    return {};
  }
}
