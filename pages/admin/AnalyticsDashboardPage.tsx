import React, { useState, useMemo, useRef } from 'react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useAuth } from '../../context/AuthContext';
import { useAnalyticsData } from '../../hooks/useAnalyticsData';
import { useWebsiteAnalytics } from '../../hooks/useWebsiteAnalytics';
import { supabase } from '../../lib/supabaseClient';
import { MetricCard } from '../../components/admin/MetricCard';
import { LTVDistributionChart } from '../../components/admin/charts/LTVDistributionChart';
import { MemberGrowthChart } from '../../components/admin/charts/MemberGrowthChart';
import { MemberAreasChart } from '../../components/admin/charts/MemberAreasChart';
import { MarketingOptInCard } from '../../components/admin/MarketingOptInCard';
import { ChurnRiskCard } from '../../components/admin/ChurnRiskCard';
import { MemberTable } from '../../components/admin/MemberTable';
import { EventParticipationTable } from '../../components/admin/EventParticipationTable';
import { MemberAnalytics } from '../../types/analytics';

type MetricFilter = 'all' | 'active_subs' | 'at_risk' | 'has_ltv' | 'has_events';

type WebsiteMetric = {
  label: string;
  value: string;
  detail: string;
};

const WEBSITE_ANALYTICS_ACTIONS = [
  'Add above-the-fold dual CTA: Join Membership + See Next Rides.',
  'Show upcoming ride preview cards directly on landing page.',
  'Strengthen membership value proposition in first scroll.',
  'Prioritize mobile CTA visibility and tap-target clarity.',
];

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
    refresh,
  } = useAnalyticsData();
  const {
    data: websiteAnalytics,
    loading: websiteLoading,
    error: websiteError,
  } = useWebsiteAnalytics();
  const [activeFilter, setActiveFilter] = useState<MetricFilter>('all');
  const [showEventBreakdown, setShowEventBreakdown] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const eventParticipationBreakdownRef = useRef<HTMLDivElement>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  async function handleStripeSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const {
        data: { session },
      } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      if (!session?.access_token) {
        setSyncResult('Not authenticated');
        return;
      }
      const res = await fetch('/api/stripe-sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSyncResult(body.error || `Error ${res.status}`);
        return;
      }
      setSyncResult(
        `Synced ${body.synced} profile(s), ${body.totalNewOrders} new order(s) added.`
      );
      refresh();
    } catch (err) {
      setSyncResult(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

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

  const toggleEventParticipationBreakdown = () => {
    setShowEventBreakdown((shown) => {
      if (!shown) {
        setTimeout(
          () =>
            eventParticipationBreakdownRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            }),
          100
        );
      }
      return !shown;
    });
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

  const websiteMetrics = useMemo<WebsiteMetric[]>(() => {
    if (!websiteAnalytics) return [];
    const denominator = websiteAnalytics.landingUsers > 0 ? websiteAnalytics.landingUsers : 1;
    const toCommunityPct = (websiteAnalytics.landingToCommunityUsers / denominator) * 100;
    const toMembershipPct = (websiteAnalytics.landingToMembershipUsers / denominator) * 100;

    return [
      {
        label: 'Landing Pageviews',
        value: websiteAnalytics.landingPageviews.toLocaleString(),
        detail: `${websiteAnalytics.landingUsers.toLocaleString()} users on /`,
      },
      {
        label: 'Landing Sessions',
        value: websiteAnalytics.landingSessions.toLocaleString(),
        detail: 'Entry sessions that started on /',
      },
      {
        label: 'Bounce Rate',
        value: `${websiteAnalytics.bounceRatePct.toFixed(2)}%`,
        detail: 'Landing-entry session bounce rate',
      },
      {
        label: 'Avg Session Duration',
        value: `${Math.round(websiteAnalytics.avgSessionSec)}s`,
        detail: 'Average session length from landing traffic',
      },
      {
        label: 'Landing to Community',
        value: `${toCommunityPct.toFixed(1)}%`,
        detail: `${websiteAnalytics.landingToCommunityUsers.toLocaleString()} of ${websiteAnalytics.landingUsers.toLocaleString()} users`,
      },
      {
        label: 'Landing to Membership',
        value: `${toMembershipPct.toFixed(1)}%`,
        detail: `${websiteAnalytics.landingToMembershipUsers.toLocaleString()} of ${websiteAnalytics.landingUsers.toLocaleString()} users`,
      },
    ];
  }, [websiteAnalytics]);

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
        <div className="mb-10 flex items-start justify-between gap-6 flex-wrap">
          <div>
            <p className="text-[#ff611a] text-xs font-medium uppercase tracking-[0.2em] mb-3">
              Dashboard
            </p>
            <h1 className="text-4xl md:text-5xl font-light text-neutral-900 mb-2 tracking-tight">
              Member Analytics
            </h1>
            <p className="text-neutral-400 text-sm">Kandie Gang Cycling Club</p>
          </div>
          <div className="flex flex-col items-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleStripeSync}
              disabled={syncing}
              className="px-4 py-2 bg-neutral-900 text-white text-sm rounded-lg hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {syncing ? 'Syncing…' : 'Sync from Stripe'}
            </button>
            {syncResult && (
              <p className="text-xs text-neutral-500 max-w-xs text-right">{syncResult}</p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-neutral-400">Loading analytics…</div>
        ) : (
          <div className="space-y-10">
            {/* Section 0: Website Analytics (PostHog snapshot) */}
            <div className="bg-white border border-neutral-200 rounded-xl p-6 md:p-7">
              <div className="mb-6">
                <h2 className="text-2xl font-light text-neutral-900 tracking-tight">
                  Website Analytics
                </h2>
                <p className="text-sm text-neutral-500 mt-2">
                  PostHog landing-page snapshot (
                  {websiteAnalytics ? `last ${websiteAnalytics.periodDays} days` : 'last 30 days'}).
                </p>
                {websiteAnalytics?.updatedAt && (
                  <p className="text-xs text-neutral-400 mt-1">
                    Last updated: {new Date(websiteAnalytics.updatedAt).toLocaleString()}
                  </p>
                )}
              </div>
              {websiteLoading ? (
                <div className="text-neutral-500 text-sm mb-6">Loading website analytics…</div>
              ) : websiteError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-6">
                  {websiteError}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                  {websiteMetrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-lg border border-neutral-200 bg-neutral-50 p-4"
                    >
                      <p className="text-xs uppercase tracking-[0.15em] text-neutral-500 mb-1">
                        {metric.label}
                      </p>
                      <p className="text-2xl font-light text-neutral-900 tracking-tight">
                        {metric.value}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">{metric.detail}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-neutral-200 pt-5">
                <p className="text-xs uppercase tracking-[0.15em] text-neutral-500 mb-3">
                  Recommended Landing Page Actions
                </p>
                <ul className="space-y-2 text-sm text-neutral-700">
                  {WEBSITE_ANALYTICS_ACTIONS.map((action) => (
                    <li key={action}>• {action}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Section 1: Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <MetricCard
                title="Total Users"
                value={metrics?.totalMembers || 0}
                subtitle={
                  <span className="flex items-center gap-2 text-sm">
                    <span className="text-emerald-500">
                      {members.filter(
                        (m) =>
                          m.stripe_subscription_status === 'active' ||
                          m.stripe_subscription_status === 'trialing'
                      ).length}{' '}
                      active
                    </span>
                    <span className="text-neutral-300">·</span>
                    <span className="text-neutral-400">
                      {members.filter(
                        (m) =>
                          m.stripe_subscription_status !== 'active' &&
                          m.stripe_subscription_status !== 'trialing'
                      ).length}{' '}
                      inactive
                    </span>
                  </span>
                }
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
                sensitiveValue
              />
              <MetricCard
                title="Average LTV"
                value={`€${(metrics?.avgLTV || 0).toFixed(2)}`}
                subtitle="Per member"
                sensitiveValue
              />
              <MetricCard
                title="Event Participation"
                value={members.filter((m) => (m.event_participation_count || 0) > 0).length}
                subtitle={`${metrics?.totalEventParticipation || 0} total signups`}
                active={showEventBreakdown}
                onClick={toggleEventParticipationBreakdown}
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

            {/* Section 5: Event Participation — Breakdown table (scroll target from metric card) */}
            <div
              ref={eventParticipationBreakdownRef}
              className="scroll-mt-28 md:scroll-mt-40"
            >
              {showEventBreakdown && <EventParticipationTable />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
