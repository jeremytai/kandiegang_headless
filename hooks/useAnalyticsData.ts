import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { KeyMetrics, LTVBucket, GrowthDataPoint, AreaCount, MarketingOptIn, MemberAnalytics } from '../types/analytics';
import { bucketize, aggregateByMonth, countByArea } from '../utils/dataTransformations';

interface AnalyticsData {
  metrics: KeyMetrics | null;
  ltvDistribution: LTVBucket[];
  memberGrowth: GrowthDataPoint[];
  memberAreas: AreaCount[];
  marketingOptIn: MarketingOptIn | null;
  members: MemberAnalytics[];
  loading: boolean;
  error: string | null;
}

export function useAnalyticsData() {
  const [data, setData] = useState<AnalyticsData>({
    metrics: null,
    ltvDistribution: [],
    memberGrowth: [],
    memberAreas: [],
    marketingOptIn: null,
    members: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setData(prev => ({ ...prev, loading: true, error: null }));

        // Fetch all profile data
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select(`
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
            last_login
          `);

        // Fetch event participation counts for all users
        const { data: eventCounts, error: eventError } = await supabase
          .from('registrations')
          .select('user_id')
          .is('cancelled_at', null);

        if (eventError) console.error('Event participation fetch error:', eventError);

        if (profilesError) throw profilesError;
        if (!profiles) throw new Error('No data returned');

        // Count event participation by user_id
        const eventCountByUser: Record<string, number> = {};
        if (eventCounts) {
          eventCounts.forEach(event => {
            eventCountByUser[event.user_id] = (eventCountByUser[event.user_id] || 0) + 1;
          });
        }

        // Calculate churn risk and enrich profile data
        const now = new Date();
        const enrichedProfiles = profiles.map(p => {
          const daysUntilExpiration = p.membership_expiration
            ? Math.ceil((new Date(p.membership_expiration).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : null;

          return {
            ...p,
            event_participation_count: eventCountByUser[p.id] || 0,
            days_until_expiration: daysUntilExpiration,
            is_at_risk: daysUntilExpiration !== null && daysUntilExpiration <= 30 && daysUntilExpiration > 0,
          };
        });

        // Calculate key metrics
        const totalMembers = enrichedProfiles.length;
        const activeSubs = enrichedProfiles.filter(p =>
          p.stripe_subscription_status && ['active', 'trialing'].includes(p.stripe_subscription_status)
        ).length;
        const totalLTV = enrichedProfiles.reduce((sum, p) => sum + (Number(p.lifetime_value) || 0), 0);
        const avgLTV = totalMembers > 0 ? totalLTV / totalMembers : 0;
        const atRiskCount = enrichedProfiles.filter(p => p.is_at_risk).length;
        const totalEventParticipation = Object.values(eventCountByUser).reduce((sum, count) => sum + count, 0);

        const metrics: KeyMetrics = {
          totalMembers,
          activeSubs,
          totalLTV,
          avgLTV,
          atRiskCount,
          totalEventParticipation,
        };

        // LTV Distribution
        const membersWithLTV = profiles.filter(p => (Number(p.lifetime_value) || 0) > 0);
        const ltvDistribution = bucketize(
          membersWithLTV.map(p => ({ lifetime_value: Number(p.lifetime_value) || 0 })),
          [0, 50, 100, 150, 200]
        );

        // Member Growth (use customer_since or wp_registered)
        const membersWithDates = profiles.filter(p => p.customer_since || p.wp_registered);
        const memberGrowth = aggregateByMonth(
          membersWithDates.map(p => ({
            customer_since: p.customer_since || p.wp_registered || ''
          }))
        );

        // Member Areas
        const memberAreas = countByArea(
          profiles.map(p => ({ member_areas: p.member_areas }))
        );

        // Marketing Opt-in
        const membersWithMarketingData = profiles.filter(p => p.accepts_marketing !== null);
        const optedIn = profiles.filter(p => p.accepts_marketing === true).length;
        const marketingOptIn: MarketingOptIn = {
          optedIn,
          total: membersWithMarketingData.length,
          percentage: membersWithMarketingData.length > 0
            ? (optedIn / membersWithMarketingData.length) * 100
            : 0,
        };

        setData({
          metrics,
          ltvDistribution,
          memberGrowth,
          memberAreas,
          marketingOptIn,
          members: enrichedProfiles as MemberAnalytics[],
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error('Analytics fetch error:', err);
        setData(prev => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load analytics',
        }));
      }
    }

    fetchAnalytics();
  }, []);

  return data;
}
