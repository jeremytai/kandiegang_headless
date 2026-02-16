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
            tags
          `);

        if (profilesError) throw profilesError;
        if (!profiles) throw new Error('No data returned');

        // Calculate key metrics
        const totalMembers = profiles.length;
        const activeSubs = profiles.filter(p =>
          p.stripe_subscription_status && ['active', 'trialing'].includes(p.stripe_subscription_status)
        ).length;
        const totalLTV = profiles.reduce((sum, p) => sum + (Number(p.lifetime_value) || 0), 0);
        const avgLTV = totalMembers > 0 ? totalLTV / totalMembers : 0;

        const metrics: KeyMetrics = {
          totalMembers,
          activeSubs,
          totalLTV,
          avgLTV,
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
          members: profiles as MemberAnalytics[],
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
