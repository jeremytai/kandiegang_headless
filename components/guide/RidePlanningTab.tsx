import React, { useMemo, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useGuideRidePlanning } from '../../hooks/useGuideRidePlanning';
import type {
  GuideAssignmentEntry,
  GuideChoice,
  GuidePlanWeek,
  GuideDecisionStatus,
  RideLevel,
} from '../../types/guideRidePlanning';

const LEVELS: RideLevel[] = ['2', '2+', '3'];
const SHOW_ADVANCED_AVAILABILITY = false;
const GUIDE_CHOICE_OPTIONS: Array<{ value: GuideChoice; label: string }> = [
  { value: 'level2', label: 'Level 2' },
  { value: 'level2plus', label: 'Level 2+' },
  { value: 'level3', label: 'Level 3' },
  { value: 'participant', label: 'Teilnehmer:in' },
  { value: 'no_time', label: 'Keine Zeit' },
  { value: 'injured', label: 'Verletzt' },
];

function statusBadgeClass(status: GuideDecisionStatus): string {
  if (status === 'assigned') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'standby') return 'bg-violet-50 text-violet-700 border-violet-200';
  if (status === 'unavailable') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-neutral-50 text-neutral-700 border-neutral-200';
}

function planStatusBadgeClass(status: GuidePlanWeek['status']): string {
  if (status === 'published') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (status === 'finalized') return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-neutral-100 text-neutral-700 border-neutral-200';
}

function sortConflictCandidates(entries: GuideAssignmentEntry[]): GuideAssignmentEntry[] {
  return [...entries].sort((a, b) => {
    const aFlinta = a.guide?.guide_flinta_priority ? 1 : 0;
    const bFlinta = b.guide?.guide_flinta_priority ? 1 : 0;
    if (aFlinta !== bFlinta) return bFlinta - aFlinta;
    return a.submitted_at.localeCompare(b.submitted_at);
  });
}

function isStandbyEntry(entry: GuideAssignmentEntry): boolean {
  return entry.decision_status === 'standby';
}

function isUnavailableEntry(entry: GuideAssignmentEntry): boolean {
  return entry.decision_status === 'unavailable';
}

function selectStandbyEntries(entries: GuideAssignmentEntry[]): GuideAssignmentEntry[] {
  return entries.filter(isStandbyEntry);
}

function selectLevelDetailEntries(entries: GuideAssignmentEntry[]): GuideAssignmentEntry[] {
  return entries.filter((entry) => !isStandbyEntry(entry));
}

function selectLevelSummaryEntries(entries: GuideAssignmentEntry[]): GuideAssignmentEntry[] {
  return entries.filter((entry) => !isStandbyEntry(entry) && !isUnavailableEntry(entry));
}

function toDashboardDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return date.toISOString().slice(0, 10);
}

function toDashboardDateTime(value: string): string {
  const date = new Date(value);
  const iso = date.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

function getGuideInitial(displayName: string | null, username: string | null): string {
  const base = (displayName ?? username ?? '').trim().replace(/^@/, '');
  if (!base) return '?';
  return base[0].toUpperCase();
}

function AvatarStack({
  guides,
}: {
  guides: Array<{ id: string; display_name: string | null; username: string | null; avatar_url: string | null }>;
}) {
  if (guides.length === 0) {
    return <span className="text-[11px] text-neutral-400">—</span>;
  }

  const visible = guides.slice(0, 5);
  const overflow = guides.length - visible.length;

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {visible.map((guide, idx) => (
          <div
            key={guide.id}
            className="w-6 h-6 rounded-full border border-white overflow-hidden bg-neutral-200 text-[10px] text-neutral-700 font-medium flex items-center justify-center"
            style={{ marginLeft: idx === 0 ? 0 : -6 }}
            title={guide.display_name ?? guide.username ?? 'Guide'}
          >
            {guide.avatar_url ? (
              <img src={guide.avatar_url} alt={guide.display_name ?? 'Guide avatar'} className="w-full h-full object-cover" />
            ) : (
              getGuideInitial(guide.display_name, guide.username)
            )}
          </div>
        ))}
      </div>
      {overflow > 0 && <span className="text-[11px] text-neutral-500">+{overflow}</span>}
    </div>
  );
}

function buildTuesdayWindow(): string[] {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  while (start.getUTCDay() !== 2) {
    start.setUTCDate(start.getUTCDate() + 1);
  }
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 0));

  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return dates;
}

export function RidePlanningTab({
  currentUserId,
  isCoordinator,
}: {
  currentUserId: string;
  isCoordinator: boolean;
}) {
  const { data, loading, error, mutate, runAction, refresh } = useGuideRidePlanning();
  const canCoordinate = Boolean(data?.caller?.isCoordinator) || isCoordinator;
  const [weekStartDateInput, setWeekStartDateInput] = useState('');
  const [proposal, setProposal] = useState({
    planId: '',
    rideDate: '',
    rideLevel: '2' as RideLevel,
    source: 'in_window' as 'in_window' | 'late',
    notes: '',
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const [discordPreview, setDiscordPreview] = useState<{ title: string; message: string } | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [manualAssignment, setManualAssignment] = useState<{
    planId: string;
    rideDate: string;
    rideLevel: RideLevel;
    assignmentStatus: 'assigned' | 'standby';
    guideProfileIds: string[];
  }>({
    planId: '',
    rideDate: '',
    rideLevel: '2',
    assignmentStatus: 'assigned',
    guideProfileIds: [],
  });
  const [coordinatorRoleForm, setCoordinatorRoleForm] = useState<{
    guideProfileId: string;
    isCoordinator: 'true' | 'false';
  }>({
    guideProfileId: '',
    isCoordinator: 'true',
  });

  const plans = data?.plans ?? [];
  const assignments = data?.assignments ?? [];
  const myChoices = data?.myChoices ?? [];
  const guideRoster = data?.guideRoster ?? [];

  const assignmentsByPlan = useMemo(() => {
    const grouped: Record<string, GuideAssignmentEntry[]> = {};
    for (const entry of assignments) {
      if (!grouped[entry.plan_id]) grouped[entry.plan_id] = [];
      grouped[entry.plan_id].push(entry);
    }
    return grouped;
  }, [assignments]);

  const tuesdayPlans = useMemo(
    () => [...plans].sort((a, b) => a.week_start_date.localeCompare(b.week_start_date)),
    [plans]
  );
  const planByDate = useMemo(
    () => Object.fromEntries(tuesdayPlans.map((plan) => [plan.week_start_date, plan])),
    [tuesdayPlans]
  );
  const overviewDates = useMemo(() => buildTuesdayWindow(), []);
  const todayDateIso = useMemo(() => {
    const source = data?.nowIso ? new Date(data.nowIso) : new Date();
    return source.toISOString().slice(0, 10);
  }, [data?.nowIso]);
  const upcomingPlans = useMemo(
    () => plans.filter((plan) => plan.week_start_date >= todayDateIso),
    [plans, todayDateIso]
  );
  const pastPlans = useMemo(
    () => plans.filter((plan) => plan.week_start_date < todayDateIso),
    [plans, todayDateIso]
  );
  const visiblePlans = showPastEvents ? [...upcomingPlans, ...pastPlans] : upcomingPlans;

  const levelGuidesByPlanDate = useMemo(() => {
    const map: Record<string, Record<RideLevel, Array<{ id: string; display_name: string | null; username: string | null; avatar_url: string | null }>>> = {};
    for (const row of selectLevelSummaryEntries(assignments)) {
      if (!row.guide) continue;
      const key = `${row.plan_id}|${row.ride_date}`;
      if (!map[key]) {
        map[key] = { '2': [], '2+': [], '3': [] };
      }
      const bucket = map[key][row.ride_level as RideLevel];
      if (!bucket.some((g) => g.id === row.guide!.id)) {
        bucket.push({
          id: row.guide.id,
          display_name: row.guide.display_name,
          username: row.guide.username,
          avatar_url: row.guide.avatar_url ?? null,
        });
      }
    }
    return map;
  }, [assignments]);

  const springerGuidesByPlanDate = useMemo(() => {
    const map: Record<string, Array<{ id: string; display_name: string | null; username: string | null; avatar_url: string | null }>> = {};
    for (const row of selectStandbyEntries(assignments)) {
      if (!row.guide) continue;
      const key = `${row.plan_id}|${row.ride_date}`;
      if (!map[key]) map[key] = [];
      if (!map[key].some((guide) => guide.id === row.guide!.id)) {
        map[key].push({
          id: row.guide.id,
          display_name: row.guide.display_name,
          username: row.guide.username,
          avatar_url: row.guide.avatar_url ?? null,
        });
      }
    }
    return map;
  }, [assignments]);

  const myChoiceByPlanDate = useMemo(() => {
    const map: Record<string, GuideChoice> = {};
    for (const row of myChoices) {
      map[`${row.plan_id}|${row.ride_date}`] = row.choice;
    }
    return map;
  }, [myChoices]);

  async function guardedAction(task: () => Promise<void>) {
    try {
      setActionError(null);
      setIsWorking(true);
      await task();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsWorking(false);
    }
  }

  async function createPlan() {
    if (!weekStartDateInput) return;
    await guardedAction(async () => {
      await mutate({ action: 'create-plan', weekStartDate: weekStartDateInput });
      setWeekStartDateInput('');
    });
  }

  async function submitProposal() {
    if (!proposal.planId || !proposal.rideDate) return;
    await guardedAction(async () => {
      await mutate({
        action: 'submit-proposal',
        planId: proposal.planId,
        rideDate: proposal.rideDate,
        rideLevel: proposal.rideLevel,
        source: proposal.source,
        notes: proposal.notes,
      });
      setProposal((prev) => ({ ...prev, notes: '' }));
    });
  }

  async function setGuideChoice(planId: string, rideDate: string, choice: GuideChoice) {
    await guardedAction(async () => {
      await mutate({
        action: 'set-guide-choice',
        planId,
        rideDate,
        choice,
      });
    });
  }

  async function assignGuideManually() {
    if (
      !manualAssignment.planId ||
      !manualAssignment.rideDate ||
      manualAssignment.guideProfileIds.length === 0
    ) {
      return;
    }
    await guardedAction(async () => {
      for (const guideProfileId of manualAssignment.guideProfileIds) {
        await runAction(
          {
            action: 'coordinator-assign-guide',
            planId: manualAssignment.planId,
            rideDate: manualAssignment.rideDate,
            rideLevel: manualAssignment.rideLevel,
            assignmentStatus: manualAssignment.assignmentStatus,
            guideProfileId,
          },
          { refresh: false }
        );
      }
      refresh();
      const assignmentLabel = manualAssignment.assignmentStatus === 'standby' ? 'as Springer (standby)' : `to Level ${manualAssignment.rideLevel}`;
      const selectedCount = manualAssignment.guideProfileIds.length;
      const previewGuides = manualAssignment.guideProfileIds
        .slice(0, 2)
        .map((id) => {
          const selectedGuide = guideRoster.find((guide) => guide.id === id);
          return selectedGuide?.display_name ?? selectedGuide?.username ?? 'Guide';
        })
        .join(', ');
      toast.success(
        selectedCount === 1
          ? `${previewGuides} assigned ${assignmentLabel} on ${toDashboardDate(
              manualAssignment.rideDate
            )}.`
          : `${selectedCount} guides assigned ${assignmentLabel} on ${toDashboardDate(
              manualAssignment.rideDate
            )} (${previewGuides}${selectedCount > 2 ? ', …' : ''}).`
      );
    });
  }

  async function setDecision(assignmentId: string, decisionStatus: GuideDecisionStatus, overrideReason?: string) {
    await guardedAction(async () => {
      await mutate({
        action: 'set-decision',
        assignmentId,
        decisionStatus,
        overrideReason: overrideReason ?? null,
      });
    });
  }

  async function updateGuideCoordinatorAccess() {
    if (!coordinatorRoleForm.guideProfileId) return;
    await guardedAction(async () => {
      await mutate({
        action: 'set-guide-coordinator',
        guideProfileId: coordinatorRoleForm.guideProfileId,
        isCoordinator: coordinatorRoleForm.isCoordinator === 'true',
      });
      const selectedGuide = guideRoster.find((guide) => guide.id === coordinatorRoleForm.guideProfileId);
      const guideLabel = selectedGuide?.display_name ?? selectedGuide?.username ?? 'Guide';
      toast.success(
        coordinatorRoleForm.isCoordinator === 'true'
          ? `${guideLabel} now has coordinator access.`
          : `${guideLabel} coordinator access removed.`
      );
      setCoordinatorRoleForm((prev) => ({ ...prev, guideProfileId: '' }));
    });
  }

  async function markUnavailable(assignmentId: string) {
    const reason = window.prompt('Reason for unavailability (optional):') ?? '';
    await guardedAction(async () => {
      await mutate({
        action: 'mark-unavailable',
        assignmentId,
        reason,
      });
    });
  }

  async function updatePlanStatus(planId: string, action: 'finalize-plan' | 'publish-plan') {
    await guardedAction(async () => {
      await mutate({ action, planId });
    });
  }

  async function buildDiscordCopy(planId: string) {
    await guardedAction(async () => {
      const result = await runAction<{ title: string; message: string }>(
        { action: 'build-discord-copy', planId },
        { refresh: false }
      );
      setDiscordPreview(result);
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${result.title}\n\n${result.message}`);
      }
    });
  }

  if (loading) {
    return <div className="text-neutral-400 text-sm">Poller…</div>;
  }

  if (error) {
    return <div className="text-red-500 text-sm">{error}</div>;
  }

  const currentCoordinators = guideRoster.filter((guide) => guide.guide_is_coordinator);

  return (
    <div className="space-y-6">
      <Toaster />
      <div className="bg-white border border-neutral-200 rounded-lg p-5">
        <p className="text-[#ff611a] text-xs font-medium uppercase tracking-[0.2em] mb-1">
          Monthly Planning
        </p>
        <h2 className="text-xl font-light text-neutral-900">Guide Ride Planning</h2>
        <p className="text-neutral-500 text-sm mt-2">
          Tuesday Social Rides only. FLINTA-first, then first-come-first-serve within the same
          priority group. Late proposals are accepted only for unfilled slots.
        </p>
      </div>

      {actionError && <div className="text-sm text-red-500">{actionError}</div>}

      <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-3">
        <h3 className="text-sm uppercase tracking-[0.1em] text-neutral-500">
          Tuesday Social Ride Overview
        </h3>
        <p className="text-sm text-neutral-500">
          Plan across multiple Tuesdays at once. Pick one option per date, similar to the Google
          Sheet flow.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="sticky left-0 z-20 bg-white text-left px-2 py-2 text-neutral-500 uppercase tracking-[0.08em]">
                  Level
                </th>
                {overviewDates.map((dateIso) => (
                  <th
                    key={dateIso}
                    className="bg-white text-left px-2 py-2 text-neutral-500 uppercase tracking-[0.08em] whitespace-nowrap"
                  >
                    {toDashboardDate(dateIso)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-neutral-200 bg-white">
                <td className="sticky left-0 z-10 bg-white px-2 py-2 font-medium text-neutral-800 whitespace-nowrap">
                  Deine Auswahl
                </td>
                {overviewDates.map((dateIso) => {
                  const plan = planByDate[dateIso];
                  const locked = !plan || plan.status !== 'draft';
                  const selectedChoice = plan ? myChoiceByPlanDate[`${plan.id}|${dateIso}`] ?? '' : '';
                  return (
                    <td key={`${dateIso}-choice`} className="px-1 py-1">
                      {!plan ? (
                        <div className="w-full min-w-[150px] rounded-md border border-neutral-200 bg-neutral-50 px-2 py-2 text-[11px] text-neutral-700">
                          Not opened yet
                        </div>
                      ) : (
                        <select
                          value={selectedChoice}
                          disabled={isWorking || locked}
                          onChange={(e) =>
                            setGuideChoice(plan.id, dateIso, e.target.value as GuideChoice)
                          }
                          aria-label={`Guide choice for ${toDashboardDate(dateIso)}`}
                          title={`Guide choice for ${toDashboardDate(dateIso)}`}
                          className="w-full min-w-[150px] rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm text-neutral-800 disabled:opacity-50"
                        >
                          <option value="" disabled>
                            —
                          </option>
                          {GUIDE_CHOICE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <td className="sticky left-0 z-10 bg-neutral-50 px-2 py-2 font-medium text-neutral-800 whitespace-nowrap">
                  Guides L2
                </td>
                {overviewDates.map((dateIso) => {
                  const plan = planByDate[dateIso];
                  const guides = plan ? levelGuidesByPlanDate[`${plan.id}|${dateIso}`]?.['2'] ?? [] : [];
                  const count = guides.length;
                  return (
                    <td key={`${dateIso}-total-l2`} className="px-1 py-1">
                      <div className="w-full min-w-[150px] px-1 py-1 text-[11px] text-neutral-700 flex items-center justify-between gap-2">
                        <span className="text-neutral-500">{plan ? count : '—'}</span>
                        {plan ? <AvatarStack guides={guides} /> : <span className="text-neutral-400">—</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>
              <tr className="border-b border-neutral-200 bg-white">
                <td className="sticky left-0 z-10 bg-white px-2 py-2 font-medium text-neutral-800 whitespace-nowrap">
                  Guides L2+
                </td>
                {overviewDates.map((dateIso) => {
                  const plan = planByDate[dateIso];
                  const guides = plan ? levelGuidesByPlanDate[`${plan.id}|${dateIso}`]?.['2+'] ?? [] : [];
                  const count = guides.length;
                  return (
                    <td key={`${dateIso}-total-l2plus`} className="px-1 py-1">
                      <div className="w-full min-w-[150px] px-1 py-1 text-[11px] text-neutral-700 flex items-center justify-between gap-2">
                        <span className="text-neutral-500">{plan ? count : '—'}</span>
                        {plan ? <AvatarStack guides={guides} /> : <span className="text-neutral-400">—</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>
              <tr className="bg-neutral-50">
                <td className="sticky left-0 z-10 bg-neutral-50 px-2 py-2 font-medium text-neutral-800 whitespace-nowrap">
                  Guides L3
                </td>
                {overviewDates.map((dateIso) => {
                  const plan = planByDate[dateIso];
                  const guides = plan ? levelGuidesByPlanDate[`${plan.id}|${dateIso}`]?.['3'] ?? [] : [];
                  const count = guides.length;
                  return (
                    <td key={`${dateIso}-total-l3`} className="px-1 py-1">
                      <div className="w-full min-w-[150px] px-1 py-1 text-[11px] text-neutral-700 flex items-center justify-between gap-2">
                        <span className="text-neutral-500">{plan ? count : '—'}</span>
                        {plan ? <AvatarStack guides={guides} /> : <span className="text-neutral-400">—</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>
              <tr className="border-t border-neutral-200 bg-white">
                <td className="sticky left-0 z-10 bg-white px-2 py-2 font-medium text-neutral-800 whitespace-nowrap">
                  Springer
                </td>
                {overviewDates.map((dateIso) => {
                  const plan = planByDate[dateIso];
                  const guides = plan ? springerGuidesByPlanDate[`${plan.id}|${dateIso}`] ?? [] : [];
                  const count = guides.length;
                  return (
                    <td key={`${dateIso}-total-springer`} className="px-1 py-1">
                      <div className="w-full min-w-[150px] px-1 py-1 text-[11px] text-neutral-700 flex items-center justify-between gap-2">
                        <span className="text-neutral-500">{plan ? count : '—'}</span>
                        {plan ? <AvatarStack guides={guides} /> : <span className="text-neutral-400">—</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        className={`grid grid-cols-1 ${SHOW_ADVANCED_AVAILABILITY ? 'xl:grid-cols-2' : ''} gap-6`}
      >
        {SHOW_ADVANCED_AVAILABILITY && (
          <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-4">
          <h3 className="text-sm uppercase tracking-[0.1em] text-neutral-500">Submit Availability</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm text-neutral-700">
              Week
              <select
                className="w-full mt-1 border border-neutral-200 rounded-lg px-3 py-2 text-sm"
                value={proposal.planId}
                onChange={(e) => {
                  const selectedPlan = plans.find((plan) => plan.id === e.target.value);
                  setProposal((prev) => ({
                    ...prev,
                    planId: e.target.value,
                    rideDate: selectedPlan?.week_start_date ?? '',
                  }));
                }}
              >
                <option value="">Select week</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {toDashboardDate(plan.week_start_date)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-neutral-700">
              Tuesday ride date
              <input
                type="text"
                className="w-full mt-1 border border-neutral-200 rounded-lg px-3 py-2 text-sm"
                value={proposal.rideDate ? toDashboardDate(proposal.rideDate) : ''}
                readOnly
                placeholder="Pick a week first"
              />
            </label>
            <label className="text-sm text-neutral-700">
              Level
              <select
                className="w-full mt-1 border border-neutral-200 rounded-lg px-3 py-2 text-sm"
                value={proposal.rideLevel}
                onChange={(e) =>
                  setProposal((prev) => ({ ...prev, rideLevel: e.target.value as RideLevel }))
                }
              >
                {LEVELS.map((level) => (
                  <option key={level} value={level}>
                    Level {level}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-neutral-700">
              Priority window
              <select
                className="w-full mt-1 border border-neutral-200 rounded-lg px-3 py-2 text-sm"
                value={proposal.source}
                onChange={(e) =>
                  setProposal((prev) => ({
                    ...prev,
                    source: e.target.value as 'in_window' | 'late',
                  }))
                }
              >
                <option value="in_window">In planning window</option>
                <option value="late">Late submission</option>
              </select>
            </label>
          </div>
          <label className="text-sm text-neutral-700 block">
            Notes
            <textarea
              className="w-full mt-1 border border-neutral-200 rounded-lg px-3 py-2 text-sm resize-none"
              rows={3}
              value={proposal.notes}
              onChange={(e) => setProposal((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Optional context for coordinator"
            />
          </label>
          <button
            type="button"
            onClick={submitProposal}
            disabled={isWorking || !proposal.planId || !proposal.rideDate}
            className="px-4 py-2 rounded-lg bg-[#ff611a] text-white text-sm font-medium hover:bg-[#e35617] disabled:opacity-50"
          >
            Save proposal
          </button>
          </div>
        )}

        {canCoordinate && (
          <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-5">
            <h3 className="text-sm uppercase tracking-[0.1em] text-neutral-500">Coordinator Controls</h3>

            <div className="space-y-3">
              <h4 className="text-xs uppercase tracking-[0.1em] text-neutral-500">
                Manual level assignment
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-sm text-neutral-700">
                  Tuesday date
                  <select
                    className="w-full mt-1 border border-neutral-200 rounded-lg px-3 py-2 text-sm"
                    value={manualAssignment.planId}
                    onChange={(e) => {
                      const selectedPlan = tuesdayPlans.find((plan) => plan.id === e.target.value);
                      setManualAssignment((prev) => ({
                        ...prev,
                        planId: e.target.value,
                        rideDate: selectedPlan?.week_start_date ?? '',
                      }));
                    }}
                  >
                    <option value="">Select date</option>
                    {tuesdayPlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {toDashboardDate(plan.week_start_date)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-neutral-700">
                  Level
                  <select
                    className="w-full mt-1 border border-neutral-200 rounded-lg px-3 py-2 text-sm"
                    value={manualAssignment.rideLevel}
                    onChange={(e) =>
                      setManualAssignment((prev) => ({
                        ...prev,
                        rideLevel: e.target.value as RideLevel,
                      }))
                    }
                  >
                    <option value="2">Level 2</option>
                    <option value="2+">Level 2+</option>
                    <option value="3">Level 3</option>
                  </select>
                </label>
                <label className="text-sm text-neutral-700">
                  Assignment
                  <select
                    className="w-full mt-1 border border-neutral-200 rounded-lg px-3 py-2 text-sm"
                    value={manualAssignment.assignmentStatus}
                    onChange={(e) =>
                      setManualAssignment((prev) => ({
                        ...prev,
                        assignmentStatus: e.target.value as 'assigned' | 'standby',
                      }))
                    }
                  >
                    <option value="assigned">Level assignment</option>
                    <option value="standby">Springer (standby)</option>
                  </select>
                </label>
                <label className="text-sm text-neutral-700 md:col-span-2">
                  Guides
                  <select
                    multiple
                    size={Math.min(8, Math.max(4, guideRoster.length))}
                    className="w-full mt-1 border border-neutral-200 rounded-lg px-3 py-2 text-sm"
                    value={manualAssignment.guideProfileIds}
                    onChange={(e) =>
                      setManualAssignment((prev) => ({
                        ...prev,
                        guideProfileIds: Array.from(e.target.selectedOptions).map(
                          (option) => option.value
                        ),
                      }))
                    }
                  >
                    {guideRoster.map((guide) => (
                      <option key={guide.id} value={guide.id}>
                        {guide.display_name ?? guide.username ?? guide.id}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-neutral-500">
                    Select multiple guides with Cmd/Ctrl or Shift.
                  </p>
                </label>
              </div>
              <button
                type="button"
                onClick={assignGuideManually}
                disabled={
                  isWorking ||
                  !manualAssignment.planId ||
                  !manualAssignment.rideDate ||
                  manualAssignment.guideProfileIds.length === 0
                }
                className="px-4 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-800 hover:bg-neutral-100 disabled:opacity-50"
              >
                Assign guides
              </button>
            </div>

            <div className="border-t border-neutral-100 pt-4 space-y-3">
              <h4 className="text-xs uppercase tracking-[0.1em] text-neutral-500">
                Coordinator access
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-sm text-neutral-700">
                  Guide
                  <select
                    className="w-full mt-1 border border-neutral-200 rounded-lg px-3 py-2 text-sm"
                    value={coordinatorRoleForm.guideProfileId}
                    onChange={(e) =>
                      setCoordinatorRoleForm((prev) => ({
                        ...prev,
                        guideProfileId: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select guide</option>
                    {guideRoster.map((guide) => (
                      <option key={guide.id} value={guide.id}>
                        {guide.display_name ?? guide.username ?? guide.id}
                        {guide.guide_is_coordinator ? ' (Coordinator)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-neutral-700">
                  Access
                  <select
                    className="w-full mt-1 border border-neutral-200 rounded-lg px-3 py-2 text-sm"
                    value={coordinatorRoleForm.isCoordinator}
                    onChange={(e) =>
                      setCoordinatorRoleForm((prev) => ({
                        ...prev,
                        isCoordinator: e.target.value as 'true' | 'false',
                      }))
                    }
                  >
                    <option value="true">Grant coordinator</option>
                    <option value="false">Remove coordinator</option>
                  </select>
                </label>
              </div>
              <button
                type="button"
                onClick={updateGuideCoordinatorAccess}
                disabled={isWorking || !coordinatorRoleForm.guideProfileId}
                className="px-4 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-800 hover:bg-neutral-100 disabled:opacity-50"
              >
                Save coordinator access
              </button>
              <p className="text-xs text-neutral-500">
                Current coordinators:{' '}
                {currentCoordinators.length > 0
                  ? currentCoordinators
                      .map((guide) => guide.display_name ?? guide.username ?? 'Unknown')
                      .join(', ')
                  : 'None'}
              </p>
            </div>

            <div className="border-t border-neutral-100 pt-4 space-y-4">
              <h4 className="text-xs uppercase tracking-[0.1em] text-neutral-500">Planning window</h4>
              <label className="text-sm text-neutral-700 block">
                Create or reopen planning week
                <input
                  type="date"
                  className="w-full mt-1 border border-neutral-200 rounded-lg px-3 py-2 text-sm"
                  value={weekStartDateInput}
                  onChange={(e) => setWeekStartDateInput(e.target.value)}
                />
              </label>
              <button
                type="button"
                onClick={createPlan}
                disabled={isWorking || !weekStartDateInput}
                className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-black disabled:opacity-50"
              >
                Save week
              </button>
              <p className="text-xs text-neutral-500">
                Tuesday-only planning for social rides. This keeps planning in the dashboard while
                replacing the Google Sheet flow.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {plans.length === 0 && (
          <div className="bg-white border border-neutral-200 rounded-lg p-5 text-sm text-neutral-500">
            No planning weeks yet. {canCoordinate ? 'Create the first week above.' : 'Ask a coordinator to create one.'}
          </div>
        )}

        {pastPlans.length > 0 && (
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setShowPastEvents((prev) => !prev)}
              className="px-3 py-1.5 rounded-md border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-100"
            >
              {showPastEvents
                ? `Hide ${pastPlans.length} past events`
                : `Show ${pastPlans.length} past events`}
            </button>
          </div>
        )}

        {plans.length > 0 && visiblePlans.length === 0 && (
          <div className="bg-white border border-neutral-200 rounded-lg p-5 text-sm text-neutral-500">
            No upcoming events. {pastPlans.length > 0 ? `Use "Show ${pastPlans.length} past events".` : ''}
          </div>
        )}

        {visiblePlans.map((plan) => {
          const planAssignments = assignmentsByPlan[plan.id] ?? [];
          const springerEntries = sortConflictCandidates(selectStandbyEntries(planAssignments));

          const grouped = new Map<string, GuideAssignmentEntry[]>();
          for (const row of selectLevelDetailEntries(planAssignments)) {
            const key = `${row.ride_date}|${row.ride_level}`;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)?.push(row);
          }
          const groups = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));

          return (
            <div key={plan.id} className="bg-white border border-neutral-200 rounded-lg p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-light text-neutral-900">
                    Tuesday Social Ride - {toDashboardDate(plan.week_start_date)}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    Required weekly levels: 2, 2+, 3. Missing levels can still publish (available-only policy).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex border rounded-full px-2 py-1 text-xs font-medium ${planStatusBadgeClass(plan.status)}`}>
                    {plan.status}
                  </span>
                  {canCoordinate && (
                    <>
                      <button
                        type="button"
                        onClick={() => updatePlanStatus(plan.id, 'finalize-plan')}
                        disabled={isWorking}
                        className="px-3 py-1.5 rounded-md border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
                      >
                        Finalize
                      </button>
                      <button
                        type="button"
                        onClick={() => updatePlanStatus(plan.id, 'publish-plan')}
                        disabled={isWorking}
                        className="px-3 py-1.5 rounded-md bg-[#ff611a] text-white text-xs hover:bg-[#e35617] disabled:opacity-50"
                      >
                        Publish
                      </button>
                      <button
                        type="button"
                        onClick={() => buildDiscordCopy(plan.id)}
                        disabled={isWorking}
                        className="px-3 py-1.5 rounded-md border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
                      >
                        Copy Discord Format
                      </button>
                    </>
                  )}
                </div>
              </div>

              {groups.length === 0 && (
                <p className="text-sm text-neutral-500">No proposals yet.</p>
              )}

              {groups.map(([groupKey, rawEntries]) => {
                const candidates = sortConflictCandidates(rawEntries);
                const [rideDate, rideLevel] = groupKey.split('|');
                const topRecommendation = candidates[0];

                return (
                  <div key={groupKey} className="border border-neutral-200 rounded-lg p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          {toDashboardDate(rideDate)} - Level {rideLevel}
                        </p>
                        {topRecommendation && (
                          <p className="text-xs text-neutral-500 mt-1">
                            Recommendation: {topRecommendation.guide?.display_name ?? 'Unknown'} (
                            {topRecommendation.guide?.guide_flinta_priority ? 'FLINTA-first' : 'FCFS'}
                            ).
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {candidates.map((entry) => {
                        const isOwner = entry.guide_profile_id === currentUserId;
                        const submittedAt = toDashboardDateTime(entry.submitted_at);
                        return (
                          <div
                            key={entry.id}
                            className="border border-neutral-200 rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2"
                          >
                            <div>
                              <p className="text-sm text-neutral-900">
                                {entry.guide?.display_name ?? 'Unknown guide'}{' '}
                                {entry.guide?.guide_flinta_priority && (
                                  <span className="text-[11px] uppercase tracking-[0.08em] text-violet-600">
                                    FLINTA priority
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-neutral-500">
                                submitted {submittedAt} · {entry.source === 'late' ? 'Late' : 'In window'}
                              </p>
                              {entry.notes && <p className="text-xs text-neutral-600 mt-1">{entry.notes}</p>}
                              {entry.override_reason && (
                                <p className="text-xs text-neutral-500 mt-1">
                                  Override reason: {entry.override_reason}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`inline-flex border rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(entry.decision_status)}`}>
                                {entry.decision_status}
                              </span>
                              {canCoordinate && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setDecision(entry.id, 'assigned')}
                                    className="px-2 py-1 text-xs rounded border border-neutral-200 hover:bg-neutral-100"
                                  >
                                    Assign
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDecision(entry.id, 'standby')}
                                    className="px-2 py-1 text-xs rounded border border-neutral-200 hover:bg-neutral-100"
                                  >
                                    Standby
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDecision(entry.id, 'proposed')}
                                    className="px-2 py-1 text-xs rounded border border-neutral-200 hover:bg-neutral-100"
                                  >
                                    Reset
                                  </button>
                                </>
                              )}
                              {(isOwner || canCoordinate) && entry.decision_status === 'assigned' && (
                                <button
                                  type="button"
                                  onClick={() => markUnavailable(entry.id)}
                                  className="px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50"
                                >
                                  Mark unavailable
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {springerEntries.length > 0 && (
                <div className="border border-neutral-200 rounded-lg p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <p className="text-sm font-medium text-neutral-900">Springer</p>
                    <p className="text-xs text-neutral-500">Standby / Springer Guides</p>
                  </div>
                  <div className="space-y-2">
                    {springerEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="border border-neutral-200 rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2"
                      >
                        <div>
                          <p className="text-sm text-neutral-900">
                            {entry.guide?.display_name ?? 'Unknown guide'}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {toDashboardDate(entry.ride_date)} · submitted{' '}
                            {toDashboardDateTime(entry.submitted_at)} ·{' '}
                            {entry.source === 'late' ? 'Late' : 'In window'}
                          </p>
                        </div>
                        <span
                          className={`inline-flex border rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(
                            entry.decision_status
                          )}`}
                        >
                          {entry.decision_status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {discordPreview && (
        <div className="bg-neutral-900 text-white rounded-lg p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-neutral-300 mb-2">Discord preview</p>
          <p className="font-medium">{discordPreview.title}</p>
          <pre className="mt-3 text-xs whitespace-pre-wrap font-mono">{discordPreview.message}</pre>
          <p className="text-xs text-neutral-400 mt-2">
            Copied to clipboard. Paste into your guides-only Discord thread.
          </p>
        </div>
      )}
    </div>
  );
}
