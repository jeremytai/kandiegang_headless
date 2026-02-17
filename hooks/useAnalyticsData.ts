import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  KeyMetrics,
  LTVBucket,
  GrowthDataPoint,
  AreaCount,
  MarketingOptIn,
  MemberAnalytics,
} from '../types/analytics';

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
        setData((prev) => ({ ...prev, loading: true, error: null }));

        // Get current session token for auth
        const {
          data: { session },
        } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
        if (!session?.access_token) {
          throw new Error('Not authenticated');
        }

        const res = await fetch('/api/analytics-data', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }

        const json = await res.json();

        setData({
          metrics: json.metrics,
          ltvDistribution: json.ltvDistribution,
          memberGrowth: json.memberGrowth,
          memberAreas: json.memberAreas,
          marketingOptIn: json.marketingOptIn,
          members: json.members,
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error('Analytics fetch error:', err);
        setData((prev) => ({
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
