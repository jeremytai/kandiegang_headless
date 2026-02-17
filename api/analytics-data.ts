// File removed. Logic moved to admin-report.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '../lib/rateLimit';
import { bucketize, aggregateByMonth, countByArea } from '../utils/dataTransformations';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!checkRateLimit(req, res, { windowMs: 60_000, max: 10, keyPrefix: 'analytics-data' })) {
    return;
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Analytics is not configured' });
  }

  // Verify the caller is an authenticated guide
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify the JWT and check is_guide
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
    // Fetch all profiles
    const { data: profiles, error: profilesError } = await adminClient.from('profiles').select(`
      id,
      display_name,
      email,
      lifetime_value,
      order_count,
      stripe_subscription_status,
      membership_expiration,
      accepts_marketing,
      last_order_date,
      customer_since,
      member_areas,
      tags,
      last_login,
      is_guide,
      is_member,
      first_name,
      last_name,
      billing_address_1,
      billing_city,
      billing_postcode,
      billing_country,
      billing_phone,
      discord_id,
      username,
      avatar_url,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_price_id,
      subscription_current_period_end,
      subscription_cancel_at_period_end,
      membership_source,
      membership_plans,
      member_since,
      avg_order_value,
      order_history,
      alternate_emails,
      newsletter_status,
      newsletter_source,
      engagement_score,
      last_engagement,
      email_count,
      last_email_open,
      last_email_click,
      last_page_view
    `);

    if (profilesError) throw profilesError;
    if (!profiles) throw new Error('No data returned');

    // Fetch event participation counts
    const { data: eventCounts } = await adminClient
      .from('registrations')
      .select('user_id')
      .is('cancelled_at', null);

    // Count events per user
    const eventCountByUser: Record<string, number> = {};
    if (eventCounts) {
      eventCounts.forEach((e) => {
        eventCountByUser[e.user_id] = (eventCountByUser[e.user_id] || 0) + 1;
      });
    }

    // Enrich profiles
    const now = new Date();
    const enrichedProfiles = profiles.map((p) => {
      const daysUntilExpiration = p.membership_expiration
        ? Math.ceil(
            (new Date(p.membership_expiration).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )
        : null;

      return {
        ...p,
        event_participation_count: eventCountByUser[p.id] || 0,
        days_until_expiration: daysUntilExpiration,
        is_at_risk:
          daysUntilExpiration !== null && daysUntilExpiration <= 30 && daysUntilExpiration > 0,
      };
    });

    // Key metrics
    const totalMembers = enrichedProfiles.length;
    const activeSubs = enrichedProfiles.filter(
      (p) =>
        p.stripe_subscription_status &&
        ['active', 'trialing'].includes(p.stripe_subscription_status)
    ).length;
    const totalLTV = enrichedProfiles.reduce((sum, p) => sum + (Number(p.lifetime_value) || 0), 0);
    const avgLTV = totalMembers > 0 ? totalLTV / totalMembers : 0;
    const atRiskCount = enrichedProfiles.filter((p) => p.is_at_risk).length;
    const totalEventParticipation = Object.values(eventCountByUser).reduce(
      (sum, count) => sum + count,
      0
    );

    // LTV distribution
    const membersWithLTV = profiles.filter((p) => (Number(p.lifetime_value) || 0) > 0);
    const ltvDistribution = bucketize(
      membersWithLTV.map((p) => ({ lifetime_value: Number(p.lifetime_value) || 0 })),
      [0, 50, 100, 150, 200]
    );

    // Member growth
    const membersWithDates = profiles.filter((p) => p.customer_since);
    const memberGrowth = aggregateByMonth(
      membersWithDates.map((p) => ({ customer_since: p.customer_since || '' }))
    );

    // Member areas
    const memberAreas = countByArea(profiles.map((p) => ({ member_areas: p.member_areas })));

    // Marketing opt-in
    const membersWithMarketingData = profiles.filter((p) => p.accepts_marketing !== null);
    const optedIn = profiles.filter((p) => p.accepts_marketing === true).length;
    const marketingOptIn = {
      optedIn,
      total: membersWithMarketingData.length,
      percentage:
        membersWithMarketingData.length > 0 ? (optedIn / membersWithMarketingData.length) * 100 : 0,
    };

    return res.status(200).json({
      metrics: {
        totalMembers,
        activeSubs,
        totalLTV,
        avgLTV,
        atRiskCount,
        totalEventParticipation,
      },
      ltvDistribution,
      memberGrowth,
      memberAreas,
      marketingOptIn,
      members: enrichedProfiles,
    });
  } catch (err) {
    console.error('Analytics data error:', err);
    return res.status(500).json({ error: 'Failed to load analytics data' });
  }
}
