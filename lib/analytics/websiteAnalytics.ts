import type { NextApiRequest, NextApiResponse } from 'next';
import { getOrSetMemoryCache, invalidateMemoryCache } from '../serverMemoryCache.js';
import type { WebsiteAnalytics } from '../../types/analytics.js';

const POSTHOG_API_HOST = (process.env.POSTHOG_API_HOST || 'https://eu.posthog.com').replace(
  /\/$/,
  ''
);
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const POSTHOG_PERSONAL_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const WEBSITE_PERIOD_DAYS = 30;
const WEBSITE_CACHE_KEY = `website-analytics:${WEBSITE_PERIOD_DAYS}d`;
const WEBSITE_CACHE_TTL_MS = 5 * 60 * 1000;

type HogQLResult = {
  columns?: string[];
  results?: Array<Array<string | number | null>>;
};

type WebsiteAnalyticsFailureReason = NonNullable<WebsiteAnalytics['statusReason']>;

function inferFailureReason(error: unknown): WebsiteAnalyticsFailureReason {
  const message = error instanceof Error ? error.message : String(error ?? '');

  if (message.includes('(401') || message.includes('(403')) return 'invalid_api_key';
  if (message.includes('(404')) return 'project_not_found';
  if (message.includes('(429')) return 'rate_limited';
  if (/fetch failed|network|ECONNRESET|ENOTFOUND|ETIMEDOUT/i.test(message)) {
    return 'posthog_unreachable';
  }
  if (message.includes('PostHog query failed')) return 'query_failed';
  return 'unknown_error';
}

function buildEmptyWebsiteAnalytics(
  statusReason: WebsiteAnalyticsFailureReason = 'unknown_error'
): WebsiteAnalytics {
  return {
    status: 'unavailable',
    statusReason,
    periodDays: WEBSITE_PERIOD_DAYS,
    updatedAt: new Date().toISOString(),
    landingPageviews: 0,
    landingUsers: 0,
    landingSessions: 0,
    bounceRatePct: 0,
    avgSessionSec: 0,
    landingToCommunityUsers: 0,
    landingToMembershipUsers: 0,
    landingToShopUsers: 0,
  };
}

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

  return (await response.json()) as HogQLResult;
}

export async function handleWebsiteAnalytics(req: NextApiRequest, res: NextApiResponse) {
  try {
    const shouldRefresh = req.query.refresh === '1' || req.query.refresh === 1;
    if (shouldRefresh) invalidateMemoryCache(WEBSITE_CACHE_KEY);

    if (!POSTHOG_PROJECT_ID || !POSTHOG_PERSONAL_API_KEY) {
      console.warn('[website-analytics] PostHog credentials are not configured; returning empty data');
      res.setHeader('x-analytics-cache', 'miss');
      res.setHeader('x-analytics-status', 'unavailable');
      return res.status(200).json(buildEmptyWebsiteAnalytics('missing_credentials'));
    }

    const { value: payload, cached } = await getOrSetMemoryCache<WebsiteAnalytics>(
      WEBSITE_CACHE_KEY,
      WEBSITE_CACHE_TTL_MS,
      async () => {
        let failedQueryCount = 0;
        let firstFailureReason: WebsiteAnalyticsFailureReason | null = null;
        const queryResults = await Promise.allSettled([
          runHogQL(
            `SELECT count() AS landing_pageviews, count(DISTINCT distinct_id) AS landing_users
             FROM events
             WHERE event = '$pageview'
               AND properties.$pathname = '/'
               AND timestamp >= now() - INTERVAL ${WEBSITE_PERIOD_DAYS} DAY`
          ),
          runHogQL(
            `SELECT count() AS landing_sessions,
                    countIf($is_bounce = 1) AS bounces,
                    round(100.0 * countIf($is_bounce = 1) / count(), 2) AS bounce_rate_pct,
                    round(avg(duration), 2) AS avg_session_sec
             FROM sessions
             WHERE $entry_pathname = '/'
               AND $start_timestamp >= now() - INTERVAL ${WEBSITE_PERIOD_DAYS} DAY`
          ),
          runHogQL(
            `WITH landing_users AS (
               SELECT DISTINCT distinct_id
               FROM events
               WHERE event = '$pageview'
                 AND properties.$pathname = '/'
                 AND timestamp >= now() - INTERVAL ${WEBSITE_PERIOD_DAYS} DAY
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
                AND e.timestamp >= now() - INTERVAL ${WEBSITE_PERIOD_DAYS} DAY
               GROUP BY lu.distinct_id
             )`
          ),
        ]);

        const [landingQuery, sessionQuery, transitionQuery] = queryResults.map((result, index) => {
          if (result.status === 'fulfilled') return result.value;
          failedQueryCount += 1;
          if (!firstFailureReason) {
            firstFailureReason = inferFailureReason(result.reason);
          }
          const queryName = ['landing', 'session', 'transition'][index] ?? 'unknown';
          console.error(`[website-analytics] ${queryName} query failed:`, result.reason);
          return { columns: [], results: [] } satisfies HogQLResult;
        });

        const status =
          failedQueryCount === 0
            ? 'ok'
            : failedQueryCount === queryResults.length
              ? 'unavailable'
              : 'partial';

        return {
          status,
          statusReason: status === 'ok' ? null : (firstFailureReason ?? 'query_failed'),
          periodDays: WEBSITE_PERIOD_DAYS,
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
    if (payload.status !== 'ok') res.setHeader('x-analytics-status', payload.status);
    return res.status(200).json(payload);
  } catch (error) {
    console.error('[website-analytics] Failed to fetch PostHog data; returning empty fallback:', error);
    res.setHeader('x-analytics-cache', 'miss');
    res.setHeader('x-analytics-status', 'unavailable');
    return res.status(200).json(buildEmptyWebsiteAnalytics(inferFailureReason(error)));
  }
}
