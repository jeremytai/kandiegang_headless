import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useAuth } from '../../context/AuthContext';
import { useEventParticipation } from '../../hooks/useEventParticipation';
import { MetricCard } from '../../components/admin/MetricCard';
import { EventParticipationTable } from '../../components/admin/EventParticipationTable';
import type { EventParticipationEvent } from '../../types/analytics';
import { isGuideProfile } from '../../lib/guideAccess';
import { RidePlanningTab } from '../../components/guide/RidePlanningTab';

/* ─── Constants ─── */
const LEVEL_LABELS: Record<string, string> = {
  level1: 'L1',
  level2: 'L2',
  level2plus: 'L2+',
  level3: 'L3',
  gravel: 'Gravel',
  workshop: 'Workshop',
};
const LEVEL_ORDER = ['level1', 'level2', 'level2plus', 'level3', 'gravel', 'workshop'];

/** Matches guide/admin accent (labels, monthly chart, MetricCard). */
const ACCENT_ORANGE = '#ff611a';

const TOOLTIP_STYLE = {
  backgroundColor: '#fff',
  border: '1px solid #e5e5e5',
  borderRadius: '8px',
  color: '#171717',
  fontSize: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};

/* ─── Stats computation ─── */
function computeStats(events: EventParticipationEvent[]) {
  const now = new Date();
  const pastEvents = events.filter((e) => e.date && new Date(e.date) < now);
  const upcomingEvents = events.filter((e) => !e.date || new Date(e.date) >= now);

  // Average confirmed participants across past events that had anyone
  const pastWithRiders = pastEvents.filter((e) => e.confirmed > 0);
  const avgParticipants =
    pastWithRiders.length > 0
      ? Math.round(
          pastWithRiders.reduce((s, e) => s + e.confirmed, 0) / pastWithRiders.length
        )
      : 0;

  // Flatten all registrants
  const allRegistrants = events.flatMap((e) => e.registrants);

  // No-show rate: confirmed (not waitlist, not cancelled) who were marked no-show
  const confirmedRegistrants = allRegistrants.filter((r) => !r.isWaitlist && !r.cancelledAt);
  const totalNoShows = confirmedRegistrants.filter((r) => r.noShowAt).length;
  const noShowRate =
    confirmedRegistrants.length > 0
      ? Math.round((totalNoShows / confirmedRegistrants.length) * 100)
      : 0;

  // Cancellation rate: of all registrations ever created, what % cancelled
  const totalCancelled = allRegistrants.filter((r) => r.cancelledAt).length;
  const cancellationRate =
    allRegistrants.length > 0
      ? Math.round((totalCancelled / allRegistrants.length) * 100)
      : 0;

  // Unique riders + repeat rider rate (authenticated users only; exclude guests)
  const userEvents: Record<string, Set<number>> = {};
  for (const event of events) {
    for (const r of event.registrants) {
      if (r.userId && !r.cancelledAt && !r.isWaitlist) {
        if (!userEvents[r.userId]) userEvents[r.userId] = new Set();
        userEvents[r.userId].add(event.eventId);
      }
    }
  }
  const uniqueRiders = Object.keys(userEvents).length;
  const repeatRiders = Object.values(userEvents).filter((s) => s.size >= 2).length;
  const repeatRate =
    uniqueRiders > 0 ? Math.round((repeatRiders / uniqueRiders) * 100) : 0;

  // Level popularity: total confirmed spots per level across all events
  const levelCounts: Record<string, number> = {};
  for (const event of events) {
    for (const [level, counts] of Object.entries(event.byLevel)) {
      levelCounts[level] = (levelCounts[level] || 0) + counts.confirmed;
    }
  }
  const levelData = [
    ...LEVEL_ORDER.filter((l) => levelCounts[l]),
    ...Object.keys(levelCounts).filter((l) => !LEVEL_ORDER.includes(l) && levelCounts[l]),
  ].map((l) => ({
    level: LEVEL_LABELS[l] ?? l,
    count: levelCounts[l],
  }));

  // Monthly event volume: last 12 months using event.date (actual event date from WordPress)
  const monthCounts: Record<string, number> = {};
  for (const event of events) {
    if (event.date) {
      const key = event.date.substring(0, 7); // YYYY-MM
      monthCounts[key] = (monthCounts[key] || 0) + 1;
    }
  }
  const monthlyData: { month: string; events: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
    monthlyData.push({ month: label, events: monthCounts[key] || 0 });
  }

  return {
    totalEvents: events.length,
    pastCount: pastEvents.length,
    upcomingCount: upcomingEvents.length,
    avgParticipants,
    noShowRate,
    cancellationRate,
    uniqueRiders,
    repeatRate,
    levelData,
    monthlyData,
  };
}

/* ─── Page ─── */
export const GuideAnalyticsPage: React.FC = () => {
  usePageMeta('Guide Dashboard | Kandie Gang', 'Guide event dashboard');
  const { user, profile } = useAuth();
  const { events, loading, error } = useEventParticipation();
  const [activeTab, setActiveTab] = useState<'analytics' | 'ride-planning'>('analytics');

  const stats = useMemo(() => computeStats(events), [events]);

  const hasAccess = Boolean(user && isGuideProfile(profile));

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#fafafa] pt-32 md:pt-40 pb-40">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-3xl font-light text-neutral-900 mb-4">Guide Dashboard</h1>
          <p className="text-neutral-500 text-sm">
            Please sign in with a guide account to view the dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] pt-32 md:pt-40 pb-40">
      <div className="max-w-7xl mx-auto px-6 space-y-8">

        {/* Header */}
        <div>
          <p className="text-[#ff611a] text-xs font-medium uppercase tracking-[0.2em] mb-1">
            Guide Dashboard
          </p>
          <h1 className="text-3xl font-light text-neutral-900">Guide Workspace</h1>
          <div className="mt-4 inline-flex p-1 rounded-lg border border-neutral-200 bg-white">
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-[#ff611a] text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              Analytics
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ride-planning')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'ride-planning'
                  ? 'bg-[#ff611a] text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              Ride Planning
            </button>
          </div>
        </div>

        {activeTab === 'analytics' && (
          <>
            {loading && (
              <div className="text-neutral-400 text-sm">Kurzer…</div>
            )}
            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            {!loading && !error && (
              <>
                {/* ─── Metric cards ─── */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                  <MetricCard
                    title="Total Rides"
                    value={stats.totalEvents}
                    subtitle={`${stats.pastCount} past · ${stats.upcomingCount} upcoming`}
                  />
                  <MetricCard
                    title="Avg Participants"
                    value={stats.avgParticipants}
                    subtitle="per past event"
                  />
                  <MetricCard
                    title="No-show Rate"
                    value={`${stats.noShowRate}%`}
                    subtitle="of confirmed spots"
                  />
                  <MetricCard
                    title="Cancellation Rate"
                    value={`${stats.cancellationRate}%`}
                    subtitle="of all registrations"
                  />
                  <MetricCard
                    title="Unique Riders"
                    value={stats.uniqueRiders}
                    subtitle="across all events"
                  />
                  <MetricCard
                    title="Repeat Riders"
                    value={`${stats.repeatRate}%`}
                    subtitle="attended 2+ events"
                  />
                </div>

                {/* ─── Charts ─── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Level popularity */}
                  <div className="bg-white border border-neutral-200 rounded-lg p-6">
                    <p className="text-[#ff611a] text-xs font-medium uppercase tracking-[0.2em] mb-1">
                      All-time
                    </p>
                    <h2 className="text-lg font-light text-neutral-900 mb-5">
                      Confirmed Spots by Level
                    </h2>
                    {stats.levelData.length === 0 ? (
                      <p className="text-neutral-400 text-sm">No data yet.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart
                          data={stats.levelData}
                          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                          <XAxis
                            dataKey="level"
                            stroke="#a3a3a3"
                            style={{ fontSize: '12px' }}
                            tick={{ fill: '#737373' }}
                          />
                          <YAxis
                            stroke="#a3a3a3"
                            style={{ fontSize: '12px' }}
                            tick={{ fill: '#737373' }}
                            allowDecimals={false}
                          />
                          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#f5f5f5' }} />
                          <Bar
                            dataKey="count"
                            name="Confirmed spots"
                            fill={ACCENT_ORANGE}
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Monthly event volume */}
                  <div className="bg-white border border-neutral-200 rounded-lg p-6">
                    <p className="text-[#ff611a] text-xs font-medium uppercase tracking-[0.2em] mb-1">
                      Last 12 months
                    </p>
                    <h2 className="text-lg font-light text-neutral-900 mb-5">Events per Month</h2>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={stats.monthlyData}
                        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                        <XAxis
                          dataKey="month"
                          stroke="#a3a3a3"
                          style={{ fontSize: '11px' }}
                          tick={{ fill: '#737373' }}
                        />
                        <YAxis
                          stroke="#a3a3a3"
                          style={{ fontSize: '12px' }}
                          tick={{ fill: '#737373' }}
                          allowDecimals={false}
                        />
                        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#f5f5f5' }} />
                        <Bar
                          dataKey="events"
                          name="Events"
                          fill={ACCENT_ORANGE}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                </div>

                {/* ─── Full event & participant table ─── */}
                <EventParticipationTable hideEmail />
              </>
            )}
          </>
        )}

        {activeTab === 'ride-planning' && user && (
          <RidePlanningTab
            currentUserId={user.id}
            isCoordinator={Boolean(profile?.guide_is_coordinator)}
          />
        )}
      </div>
    </div>
  );
};
