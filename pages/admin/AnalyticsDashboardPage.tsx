import React, { useState, useMemo, useRef } from 'react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useAuth } from '../../context/AuthContext';
import { useAnalyticsData } from '../../hooks/useAnalyticsData';
import { MetricCard } from '../../components/admin/MetricCard';
import { LTVDistributionChart } from '../../components/admin/charts/LTVDistributionChart';
import { MemberGrowthChart } from '../../components/admin/charts/MemberGrowthChart';
import { MemberAreasChart } from '../../components/admin/charts/MemberAreasChart';
import { MarketingOptInCard } from '../../components/admin/MarketingOptInCard';
import { ChurnRiskCard } from '../../components/admin/ChurnRiskCard';
import { MemberTable } from '../../components/admin/MemberTable';
import { MemberAnalytics } from '../../types/analytics';

type MetricFilter = 'all' | 'active_subs' | 'at_risk' | 'has_ltv' | 'has_events';

export const AnalyticsDashboardPage: React.FC = () => {
  usePageMeta('Analytics | Kandie Gang', 'Member analytics dashboard');
  const { user, profile, status } = useAuth();
  const {
    metrics,
    ltvDistribution,
    memberGrowth,
    memberAreas,
    marketingOptIn,
    members,
    loading,
    error,
  } = useAnalyticsData();
  const [activeFilter, setActiveFilter] = useState<MetricFilter>('all');
  const tableRef = useRef<HTMLDivElement>(null);

  const hasAccess = Boolean(user && profile?.is_guide);

  const toggleFilter = (filter: MetricFilter) => {
    setActiveFilter((prev) => (prev === filter ? 'all' : filter));
    if (activeFilter !== filter) {
      setTimeout(
        () => tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        100
      );
    }
  };

  const filteredMembers = useMemo(() => {
    if (activeFilter === 'all') return members;

    const filters: Record<MetricFilter, (m: MemberAnalytics) => boolean> = {
      all: () => true,
      active_subs: (m) =>
        m.stripe_subscription_status === 'active' || m.stripe_subscription_status === 'trialing',
      at_risk: (m) => Boolean(m.is_at_risk),
      has_ltv: (m) => (Number(m.lifetime_value) || 0) > 0,
      has_events: (m) => (m.event_participation_count || 0) > 0,
    };

    return members.filter(filters[activeFilter]);
  }, [members, activeFilter]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#fafafa] pt-32 md:pt-40 pb-40">
        <div className="max-w-7xl mx-auto px-6 text-neutral-400">Loading…</div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#fafafa] pt-32 md:pt-40 pb-40">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-3xl font-light text-neutral-900 mb-4">Member Analytics</h1>
          <p className="text-neutral-500 text-sm">
            Please sign in with a guide account to view the analytics dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fafafa] pt-32 md:pt-40 pb-40">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-3xl font-light text-neutral-900 mb-4">Member Analytics</h1>
          <div className="bg-white border border-red-200 rounded-lg p-6 text-red-600">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] pt-32 md:pt-40 pb-40">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-10">
          <p className="text-[#ff611a] text-xs font-medium uppercase tracking-[0.2em] mb-3">
            Dashboard
          </p>
          <h1 className="text-4xl md:text-5xl font-light text-neutral-900 mb-2 tracking-tight">
            Member Analytics
          </h1>
          <p className="text-neutral-400 text-sm">Kandie Gang Cycling Club</p>
        </div>

        {loading ? (
          <div className="text-neutral-400">Loading analytics…</div>
        ) : (
          <div className="space-y-10">
            {/* Section 1: Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <MetricCard
                title="Total Members"
                value={metrics?.totalMembers || 0}
                subtitle="All registered members"
                active={activeFilter === 'all'}
                onClick={() => toggleFilter('all')}
              />
              <MetricCard
                title="Active Subscriptions"
                value={metrics?.activeSubs || 0}
                subtitle="Paying members"
                active={activeFilter === 'active_subs'}
                onClick={() => toggleFilter('active_subs')}
              />
              <MetricCard
                title="At Risk"
                value={metrics?.atRiskCount || 0}
                subtitle="Expiring within 30 days"
                active={activeFilter === 'at_risk'}
                onClick={() => toggleFilter('at_risk')}
              />
              <MetricCard
                title="Total LTV"
                value={`€${(metrics?.totalLTV || 0).toFixed(2)}`}
                subtitle="Lifetime revenue"
                active={activeFilter === 'has_ltv'}
                onClick={() => toggleFilter('has_ltv')}
              />
              <MetricCard
                title="Average LTV"
                value={`€${(metrics?.avgLTV || 0).toFixed(2)}`}
                subtitle="Per member"
              />
              <MetricCard
                title="Event Participation"
                value={metrics?.totalEventParticipation || 0}
                subtitle="Total event signups"
                active={activeFilter === 'has_events'}
                onClick={() => toggleFilter('has_events')}
              />
            </div>

            {/* Section 2: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <LTVDistributionChart data={ltvDistribution} />
              <MemberGrowthChart data={memberGrowth} />
            </div>

            {/* Section 3: Segmentation & Risk */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <MemberAreasChart data={memberAreas} />
              <MarketingOptInCard data={marketingOptIn} />
              <ChurnRiskCard members={members} />
            </div>

            {/* Section 4: Member Table */}
            <div ref={tableRef}>
              {activeFilter !== 'all' && (
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-neutral-500 text-sm">
                    Filtered:{' '}
                    <span className="text-neutral-900 font-medium">
                      {activeFilter.replace('_', ' ')}
                    </span>{' '}
                    ({filteredMembers.length} members)
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('all')}
                    className="text-[#ff611a] text-sm hover:underline"
                  >
                    Clear filter
                  </button>
                </div>
              )}
              <MemberTable members={filteredMembers} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
