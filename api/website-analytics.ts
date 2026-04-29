import type { NextApiRequest, NextApiResponse } from 'next';
import { checkRateLimit } from '../lib/rateLimit.js';
import { requireGuideAuth } from '../lib/adminGuideAuth.js';
import { getOrSetMemoryCache, invalidateMemoryCache } from '../lib/serverMemoryCache.js';
import type { WebsiteAnalytics } from '../types/analytics.js';

const POSTHOG_API_HOST = (process.env.POSTHOG_API_HOST || 'https://eu.posthog.com').replace(
  /\/$/,
  ''
);
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const POSTHOG_PERSONAL_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const PERIOD_DAYS = 30;
const CACHE_KEY = `website-analytics:${PERIOD_DAYS}d`;
const CACHE_TTL_MS = 5 * 60 * 1000;

type HogQLResult = {
  columns?: string[];
  results?: Array<Array<string | number | null>>;
};

function getNumberCell(result: HogQLResult, columnName: string): number {
  const columns = result.columns ?? [];
  const rows = result.results ?? [];
  if (!rows.length) return 0;
  const idx = columns.indexOf(columnName);
  if (idx < 0) return 0;
  const value = rows[0][idx];
  const numeric = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

async function runHogQL(query: string): Promise<HogQLResult> {
  if (!POSTHOG_PROJECT_ID || !POSTHOG_PERSONAL_API_KEY) {
    throw new Error('PostHog server credentials are not configured');
  }

  const response = await fetch(`${POSTHOG_API_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${POSTHOG_PERSONAL_API_KEY}`,
    },
    body: JSON.stringify({
      query: {
        kind: 'HogQLQuery',
        query,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`PostHog query failed (${response.status}): ${body.slice(0, 200)}`);
  }

  const json = (await response.json()) as HogQLResult;
  return json;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (
    !(await checkRateLimit(req, res, { windowMs: 60_000, max: 15, keyPrefix: 'website-analytics' }))
  ) {
    return;
  }
  if (
    !(await requireGuideAuth(req, res, {
      misconfiguredMessage: 'Analytics backend is not configured',
    }))
  ) {
    return;
  }

  try {
    const shouldRefresh = req.query.refresh === '1' || req.query.refresh === 1;
    if (shouldRefresh) invalidateMemoryCache(CACHE_KEY);

    const { value: payload, cached } = await getOrSetMemoryCache<WebsiteAnalytics>(
      CACHE_KEY,
      CACHE_TTL_MS,
      async () => {
        const [landingQuery, sessionQuery, transitionQuery] = await Promise.all([
          runHogQL(
            `SELECT count() AS landing_pageviews, count(DISTINCT distinct_id) AS landing_users
             FROM events
             WHERE event = '$pageview'
               AND properties.$pathname = '/'
               AND timestamp >= now() - INTERVAL ${PERIOD_DAYS} DAY`
          ),
          runHogQL(
            `SELECT count() AS landing_sessions,
                    countIf($is_bounce = 1) AS bounces,
                    round(100.0 * countIf($is_bounce = 1) / count(), 2) AS bounce_rate_pct,
                    round(avg(duration), 2) AS avg_session_sec
             FROM sessions
             WHERE $entry_pathname = '/'
               AND $start_timestamp >= now() - INTERVAL ${PERIOD_DAYS} DAY`
          ),
          runHogQL(
            `WITH landing_users AS (
               SELECT DISTINCT distinct_id
               FROM events
               WHERE event = '$pageview'
                 AND properties.$pathname = '/'
                 AND timestamp >= now() - INTERVAL ${PERIOD_DAYS} DAY
             )
             SELECT
               countIf(has_community = 1) AS landing_to_community_users,
               countIf(has_membership = 1) AS landing_to_membership_users,
               countIf(has_shop = 1) AS landing_to_shop_users
             FROM (
               SELECT
                 lu.distinct_id,
                 max(if(e.properties.$pathname = '/community', 1, 0)) AS has_community,
                 max(if(e.properties.$pathname = '/kandiegangcyclingclub', 1, 0)) AS has_membership,
                 max(if(e.properties.$pathname = '/shop', 1, 0)) AS has_shop
               FROM landing_users lu
               LEFT JOIN events e
                 ON e.distinct_id = lu.distinct_id
                AND e.event = '$pageview'
                AND e.timestamp >= now() - INTERVAL ${PERIOD_DAYS} DAY
               GROUP BY lu.distinct_id
             )`
          ),
        ]);

        return {
          periodDays: PERIOD_DAYS,
          updatedAt: new Date().toISOString(),
          landingPageviews: getNumberCell(landingQuery, 'landing_pageviews'),
          landingUsers: getNumberCell(landingQuery, 'landing_users'),
          landingSessions: getNumberCell(sessionQuery, 'landing_sessions'),
          bounceRatePct: getNumberCell(sessionQuery, 'bounce_rate_pct'),
          avgSessionSec: getNumberCell(sessionQuery, 'avg_session_sec'),
          landingToCommunityUsers: getNumberCell(transitionQuery, 'landing_to_community_users'),
          landingToMembershipUsers: getNumberCell(transitionQuery, 'landing_to_membership_users'),
          landingToShopUsers: getNumberCell(transitionQuery, 'landing_to_shop_users'),
        };
      }
    );

    res.setHeader('x-analytics-cache', cached ? 'hit' : 'miss');
    return res.status(200).json(payload);
  } catch (error) {
    console.error('[website-analytics] Failed to fetch PostHog data:', error);
    return res.status(500).json({ error: 'Failed to load website analytics' });
  }
}
