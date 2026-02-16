import React from 'react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useAuth } from '../../context/AuthContext';
import { useAnalyticsData } from '../../hooks/useAnalyticsData';
import { MetricCard } from '../../components/admin/MetricCard';
import { LTVDistributionChart } from '../../components/admin/charts/LTVDistributionChart';
import { MemberGrowthChart } from '../../components/admin/charts/MemberGrowthChart';
import { MemberAreasChart } from '../../components/admin/charts/MemberAreasChart';
import { MarketingOptInCard } from '../../components/admin/MarketingOptInCard';
import { MemberTable } from '../../components/admin/MemberTable';

export const AnalyticsDashboardPage: React.FC = () => {
  usePageMeta('Analytics | Kandie Gang', 'Member analytics dashboard');
  const { user, profile, status } = useAuth();
  const { metrics, ltvDistribution, memberGrowth, memberAreas, marketingOptIn, members, loading, error } = useAnalyticsData();

  const hasAccess = Boolean(user && profile?.is_guide);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0f1419] pt-32 md:pt-40 pb-40">
        <div className="max-w-7xl mx-auto px-6 text-[#8899a6]">Loading…</div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#0f1419] pt-32 md:pt-40 pb-40">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-3xl font-light text-white mb-4">
            Member Analytics
          </h1>
          <p className="text-[#8899a6] text-sm">
            Please sign in with a guide account to view the analytics dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f1419] pt-32 md:pt-40 pb-40">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-3xl font-light text-white mb-4">
            Member Analytics
          </h1>
          <div className="bg-[#1a2730] border border-[#ef4444] rounded-lg p-6 text-[#ef4444]">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419] pt-32 md:pt-40 pb-40">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-light text-white mb-2">
            Member Analytics
          </h1>
          <p className="text-[#8899a6] text-sm uppercase tracking-wider">
            Kandie Gang Cycling Club
          </p>
        </div>

        {loading ? (
          <div className="text-[#8899a6]">Loading analytics…</div>
        ) : (
          <div className="space-y-8">
            {/* Section 1: Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Total Members"
                value={metrics?.totalMembers || 0}
                subtitle="All registered members"
              />
              <MetricCard
                title="Active Subscriptions"
                value={metrics?.activeSubs || 0}
                subtitle="Paying members"
              />
              <MetricCard
                title="Total LTV"
                value={`€${(metrics?.totalLTV || 0).toFixed(2)}`}
                subtitle="Lifetime revenue"
              />
              <MetricCard
                title="Average LTV"
                value={`€${(metrics?.avgLTV || 0).toFixed(2)}`}
                subtitle="Per member"
              />
            </div>

            {/* Section 2: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LTVDistributionChart data={ltvDistribution} />
              <MemberGrowthChart data={memberGrowth} />
            </div>

            {/* Section 3: Segmentation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MemberAreasChart data={memberAreas} />
              <MarketingOptInCard data={marketingOptIn} />
            </div>

            {/* Section 4: Member Table */}
            <MemberTable members={members} />
          </div>
        )}
      </div>
    </div>
  );
};
