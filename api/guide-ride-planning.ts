import type { NextApiRequest, NextApiResponse } from 'next';
import type { SupabaseClient } from '@supabase/supabase-js';
import { checkRateLimit } from '../lib/rateLimit.js';
import { requireGuideAuth } from '../lib/adminGuideAuth.js';

type ApiError = { error: string };

type CallerProfile = {
  id: string;
  guide_is_coordinator: boolean | null;
  is_guide: boolean | null;
};

const RIDE_LEVELS = new Set(['2', '2+', '3']);
const DECISION_STATES = new Set(['proposed', 'assigned', 'standby', 'unavailable']);
const GUIDE_CHOICES = new Set([
  'level2',
  'level2plus',
  'level3',
  'participant',
  'no_time',
  'injured',
]);

const LEVEL_BY_CHOICE: Record<string, '2' | '2+' | '3'> = {
  level2: '2',
  level2plus: '2+',
  level3: '3',
};

const CHOICE_BY_LEVEL: Record<'2' | '2+' | '3', 'level2' | 'level2plus' | 'level3'> = {
  '2': 'level2',
  '2+': 'level2plus',
  '3': 'level3',
};

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTuesday(dateIso: string): boolean {
  const date = new Date(`${dateIso}T00:00:00Z`);
  return date.getUTCDay() === 2;
}

function formatWeekday(dateIso: string): string {
  const date = new Date(`${dateIso}T00:00:00Z`);
  return date.toLocaleDateString('en-GB', { weekday: 'long' });
}

function buildGuideTag(username: string | null, displayName: string | null): string {
  if (username?.trim()) {
    const trimmed = username.trim();
    return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
  }
  if (displayName?.trim()) {
    return `@${displayName.trim().replace(/\s+/g, '')}`;
  }
  return '@unknown-guide';
}

async function loadCallerProfile(adminClient: SupabaseClient, userId: string): Promise<CallerProfile | null> {
  const { data, error } = await adminClient
    .from('profiles')
    .select('id, guide_is_coordinator, is_guide')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data as CallerProfile;
}

async function validatePlanAndDate(
  adminClient: SupabaseClient,
  planId: string,
  rideDate: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!planId) return { ok: false, status: 400, error: 'planId is required' };
  if (!isIsoDate(rideDate)) return { ok: false, status: 400, error: 'rideDate must be YYYY-MM-DD' };
  if (!isTuesday(rideDate)) {
    return { ok: false, status: 400, error: 'Only Tuesday social rides are supported in this planning view' };
  }

  const { data: plan, error } = await adminClient
    .from('guide_ride_plans')
    .select('id, status, week_start_date')
    .eq('id', planId)
    .single();

  if (error || !plan) return { ok: false, status: 404, error: 'Plan not found' };
  if (plan.status !== 'draft') {
    return { ok: false, status: 409, error: 'This plan is locked. Ask a coordinator for changes.' };
  }
  if (plan.week_start_date !== rideDate) {
    return {
      ok: false,
      status: 400,
      error: 'For Tuesday social rides, proposal date must match the selected planning week date',
    };
  }
  return { ok: true };
}

async function upsertLevelAssignment(
  adminClient: SupabaseClient,
  params: {
    planId: string;
    rideDate: string;
    rideLevel: string;
    userId: string;
    notes: string | null;
    source: 'in_window' | 'late';
    decisionStatus?: 'proposed' | 'assigned' | 'standby' | 'unavailable';
    overrideReason?: string | null;
  }
): Promise<{ data: unknown; error: { message?: string } | null }> {
  const {
    planId,
    rideDate,
    rideLevel,
    userId,
    notes,
    source,
    decisionStatus = 'proposed',
    overrideReason = null,
  } = params;
  const nowIso = new Date().toISOString();

  const { data: existingRows, error: existingError } = await adminClient
    .from('guide_ride_assignments')
    .select('id, created_at')
    .eq('plan_id', planId)
    .eq('ride_date', rideDate)
    .eq('guide_profile_id', userId)
    .order('created_at', { ascending: true });

  if (existingError) {
    return { data: null, error: { message: existingError.message || 'Failed to validate existing proposal' } };
  }

  const primaryExisting = existingRows?.[0];
  const staleIds = (existingRows ?? []).slice(1).map((row) => row.id);
  if (staleIds.length > 0) {
    await adminClient.from('guide_ride_assignments').delete().in('id', staleIds);
  }

  if (primaryExisting) {
    const updateResult = await adminClient
      .from('guide_ride_assignments')
      .update({
        ride_level: rideLevel,
        decision_status: decisionStatus,
        source,
        notes,
        submitted_at: nowIso,
        is_sick_leave: false,
        sick_note: null,
        override_reason: overrideReason,
      })
      .eq('id', primaryExisting.id)
      .select(
        'id, plan_id, ride_date, ride_level, guide_profile_id, decision_status, source, submitted_at, override_reason, is_sick_leave, sick_note, notes'
      )
      .single();
    return { data: updateResult.data, error: updateResult.error };
  }

  const insertResult = await adminClient
    .from('guide_ride_assignments')
    .insert({
      plan_id: planId,
      ride_date: rideDate,
      ride_level: rideLevel,
      guide_profile_id: userId,
      decision_status: decisionStatus,
      source,
      notes,
      submitted_at: nowIso,
      is_sick_leave: false,
      sick_note: null,
      override_reason: overrideReason,
    })
    .select(
      'id, plan_id, ride_date, ride_level, guide_profile_id, decision_status, source, submitted_at, override_reason, is_sick_leave, sick_note, notes'
    )
    .single();
  return { data: insertResult.data, error: insertResult.error };
}

async function handleGet(res: NextApiResponse, adminClient: SupabaseClient, userId: string) {
  const caller = await loadCallerProfile(adminClient, userId);
  if (!caller) return res.status(403).json({ error: 'Caller profile not found' });

  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 14);
  const to = new Date(today);
  to.setDate(to.getDate() + 120);

  const fromIso = from.toISOString().slice(0, 10);
  const toIso = to.toISOString().slice(0, 10);

  const { data: plans, error: plansError } = await adminClient
    .from('guide_ride_plans')
    .select('id, week_start_date, status, notes, finalized_at, published_at')
    .gte('week_start_date', fromIso)
    .lte('week_start_date', toIso)
    .order('week_start_date', { ascending: true });

  if (plansError) {
    return res.status(500).json({ error: plansError.message || 'Failed to load plans' });
  }

  const planIds = (plans ?? []).map((p) => p.id);
  if (planIds.length === 0) {
    return res.status(200).json({
      plans: [],
      assignments: [],
      myChoices: [],
      guideRoster: [],
      nowIso: new Date().toISOString(),
      caller: { id: userId, isCoordinator: Boolean(caller.guide_is_coordinator) },
    });
  }

  const { data: assignments, error: assignmentsError } = await adminClient
    .from('guide_ride_assignments')
    .select(
      'id, plan_id, ride_date, ride_level, guide_profile_id, decision_status, source, submitted_at, override_reason, is_sick_leave, sick_note, notes'
    )
    .in('plan_id', planIds)
    .order('ride_date', { ascending: true })
    .order('submitted_at', { ascending: true });

  if (assignmentsError) {
    return res.status(500).json({ error: assignmentsError.message || 'Failed to load assignments' });
  }

  const guideIds = [...new Set((assignments ?? []).map((a) => a.guide_profile_id))];
  let guideById: Record<
    string,
    {
      id: string;
      display_name: string | null;
      username: string | null;
      avatar_url: string | null;
      guide_flinta_priority: boolean;
    }
  > = {};

  if (guideIds.length > 0) {
    const { data: guideRows } = await adminClient
      .from('profiles')
      .select('id, display_name, username, avatar_url, guide_flinta_priority')
      .in('id', guideIds);

    guideById = Object.fromEntries(
      (guideRows ?? []).map((guide) => [
        guide.id,
        {
          id: guide.id,
          display_name: guide.display_name ?? null,
          username: guide.username ?? null,
          avatar_url: guide.avatar_url ?? null,
          guide_flinta_priority: Boolean(guide.guide_flinta_priority),
        },
      ])
    );
  }

  const hydratedAssignments = (assignments ?? []).map((entry) => ({
    ...entry,
    guide: guideById[entry.guide_profile_id] ?? null,
  }));

  const { data: myChoices, error: myChoicesError } = await adminClient
    .from('guide_ride_availability')
    .select('id, plan_id, ride_date, guide_profile_id, choice, updated_at')
    .in('plan_id', planIds)
    .eq('guide_profile_id', userId)
    .order('ride_date', { ascending: true });

  if (myChoicesError) {
    return res.status(500).json({ error: myChoicesError.message || 'Failed to load guide choices' });
  }

  let guideRoster: Array<{
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    guide_flinta_priority: boolean;
  }> = [];

  if (caller.guide_is_coordinator) {
    const { data: rosterRows, error: rosterError } = await adminClient
      .from('profiles')
      .select('id, display_name, username, avatar_url, guide_flinta_priority, is_guide')
      .eq('is_guide', true)
      .order('display_name', { ascending: true, nullsFirst: false });

    if (rosterError) {
      return res.status(500).json({ error: rosterError.message || 'Failed to load guide roster' });
    }

    guideRoster = (rosterRows ?? []).map((row) => ({
      id: row.id,
      display_name: row.display_name ?? null,
      username: row.username ?? null,
      avatar_url: row.avatar_url ?? null,
      guide_flinta_priority: Boolean(row.guide_flinta_priority),
    }));
  }

  return res.status(200).json({
    plans: plans ?? [],
    assignments: hydratedAssignments,
    myChoices: myChoices ?? [],
    guideRoster,
    nowIso: new Date().toISOString(),
    caller: { id: userId, isCoordinator: Boolean(caller.guide_is_coordinator) },
  });
}

async function handleCreatePlan(
  req: NextApiRequest,
  res: NextApiResponse<ApiError | { plan: unknown }>,
  adminClient: SupabaseClient,
  caller: CallerProfile
) {
  if (!caller.guide_is_coordinator) {
    return res.status(403).json({ error: 'Coordinator access required' });
  }

  const weekStartDate = typeof req.body?.weekStartDate === 'string' ? req.body.weekStartDate : '';
  const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : null;

  if (!isIsoDate(weekStartDate)) {
    return res.status(400).json({ error: 'weekStartDate must be YYYY-MM-DD' });
  }
  if (!isTuesday(weekStartDate)) {
    return res.status(400).json({ error: 'Planning weeks must start on Tuesday for social rides' });
  }

  const { data, error } = await adminClient
    .from('guide_ride_plans')
    .upsert(
      {
        week_start_date: weekStartDate,
        status: 'draft',
        notes,
        created_by: caller.id,
      },
      { onConflict: 'week_start_date' }
    )
    .select('id, week_start_date, status, notes, finalized_at, published_at')
    .single();

  if (error || !data) {
    return res.status(500).json({ error: error?.message || 'Failed to create plan' });
  }

  return res.status(200).json({ plan: data });
}

async function handleSubmitProposal(
  req: NextApiRequest,
  res: NextApiResponse<ApiError | { assignment: unknown }>,
  adminClient: SupabaseClient,
  userId: string
) {
  const planId = typeof req.body?.planId === 'string' ? req.body.planId : '';
  const rideDate = typeof req.body?.rideDate === 'string' ? req.body.rideDate : '';
  const rideLevel = typeof req.body?.rideLevel === 'string' ? req.body.rideLevel : '';
  const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : null;
  const source = req.body?.source === 'late' ? 'late' : 'in_window';

  if (!RIDE_LEVELS.has(rideLevel)) return res.status(400).json({ error: 'rideLevel must be one of: 2, 2+, 3' });
  const validity = await validatePlanAndDate(adminClient, planId, rideDate);
  if (!validity.ok) {
    return res.status(validity.status).json({ error: validity.error });
  }

  const { data, error } = await upsertLevelAssignment(adminClient, {
    planId,
    rideDate,
    rideLevel,
    userId,
    notes,
    source,
  });

  if (error || !data) {
    return res.status(500).json({ error: error?.message || 'Failed to save proposal' });
  }

  return res.status(200).json({ assignment: data });
}

async function handleSetGuideChoice(
  req: NextApiRequest,
  res: NextApiResponse<ApiError | { choice: unknown; assignment: unknown | null }>,
  adminClient: SupabaseClient,
  userId: string
) {
  const planId = typeof req.body?.planId === 'string' ? req.body.planId : '';
  const rideDate = typeof req.body?.rideDate === 'string' ? req.body.rideDate : '';
  const choice = typeof req.body?.choice === 'string' ? req.body.choice : '';

  const validity = await validatePlanAndDate(adminClient, planId, rideDate);
  if (!validity.ok) {
    return res.status(validity.status).json({ error: validity.error });
  }

  if (choice === '') {
    await adminClient
      .from('guide_ride_availability')
      .delete()
      .eq('plan_id', planId)
      .eq('ride_date', rideDate)
      .eq('guide_profile_id', userId);

    const { error: deleteError } = await adminClient
      .from('guide_ride_assignments')
      .delete()
      .eq('plan_id', planId)
      .eq('ride_date', rideDate)
      .eq('guide_profile_id', userId);

    if (deleteError) {
      return res.status(500).json({ error: deleteError.message || 'Failed to clear assignment' });
    }

    return res.status(200).json({ choice: null, assignment: null });
  }

  if (!GUIDE_CHOICES.has(choice)) {
    return res.status(400).json({ error: 'Invalid choice' });
  }

  const { data: choiceRow, error: choiceError } = await adminClient
    .from('guide_ride_availability')
    .upsert(
      {
        plan_id: planId,
        ride_date: rideDate,
        guide_profile_id: userId,
        choice,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'plan_id,ride_date,guide_profile_id' }
    )
    .select('id, plan_id, ride_date, guide_profile_id, choice, updated_at')
    .single();

  if (choiceError || !choiceRow) {
    return res.status(500).json({ error: choiceError?.message || 'Failed to save guide choice' });
  }

  const rideLevel = LEVEL_BY_CHOICE[choice];
  if (rideLevel) {
    const { data: assignment, error } = await upsertLevelAssignment(adminClient, {
      planId,
      rideDate,
      rideLevel,
      userId,
      notes: null,
      source: 'in_window',
    });
    if (error || !assignment) {
      return res.status(500).json({ error: error?.message || 'Failed to update assignment from choice' });
    }
    return res.status(200).json({ choice: choiceRow, assignment });
  }

  const { error: deleteError } = await adminClient
    .from('guide_ride_assignments')
    .delete()
    .eq('plan_id', planId)
    .eq('ride_date', rideDate)
    .eq('guide_profile_id', userId);

  if (deleteError) {
    return res.status(500).json({ error: deleteError.message || 'Failed to clear assignment' });
  }

  return res.status(200).json({ choice: choiceRow, assignment: null });
}

async function handleCoordinatorAssignGuide(
  req: NextApiRequest,
  res: NextApiResponse<ApiError | { assignment: unknown }>,
  adminClient: SupabaseClient,
  caller: CallerProfile
) {
  if (!caller.guide_is_coordinator) {
    return res.status(403).json({ error: 'Coordinator access required' });
  }

  const planId = typeof req.body?.planId === 'string' ? req.body.planId : '';
  const rideDate = typeof req.body?.rideDate === 'string' ? req.body.rideDate : '';
  const rideLevel = typeof req.body?.rideLevel === 'string' ? req.body.rideLevel : '';
  const guideProfileId = typeof req.body?.guideProfileId === 'string' ? req.body.guideProfileId : '';

  if (!guideProfileId) return res.status(400).json({ error: 'guideProfileId is required' });
  if (!RIDE_LEVELS.has(rideLevel)) return res.status(400).json({ error: 'rideLevel must be one of: 2, 2+, 3' });

  const validity = await validatePlanAndDate(adminClient, planId, rideDate);
  if (!validity.ok) {
    return res.status(validity.status).json({ error: validity.error });
  }

  const { data: guide, error: guideError } = await adminClient
    .from('profiles')
    .select('id, is_guide')
    .eq('id', guideProfileId)
    .single();

  if (guideError || !guide || !guide.is_guide) {
    return res.status(400).json({ error: 'Selected profile is not a valid guide' });
  }

  const { data: assignment, error } = await upsertLevelAssignment(adminClient, {
    planId,
    rideDate,
    rideLevel,
    userId: guideProfileId,
    notes: null,
    source: 'in_window',
    decisionStatus: 'assigned',
    overrideReason: 'Coordinator manual assignment',
  });

  if (error || !assignment) {
    return res.status(500).json({ error: error?.message || 'Failed to assign guide manually' });
  }

  const choice = CHOICE_BY_LEVEL[rideLevel as '2' | '2+' | '3'];
  await adminClient.from('guide_ride_availability').upsert(
    {
      plan_id: planId,
      ride_date: rideDate,
      guide_profile_id: guideProfileId,
      choice,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'plan_id,ride_date,guide_profile_id' }
  );

  return res.status(200).json({ assignment });
}

async function handleSetDecision(
  req: NextApiRequest,
  res: NextApiResponse<ApiError | { assignment: unknown }>,
  adminClient: SupabaseClient,
  caller: CallerProfile
) {
  if (!caller.guide_is_coordinator) {
    return res.status(403).json({ error: 'Coordinator access required' });
  }

  const assignmentId = typeof req.body?.assignmentId === 'string' ? req.body.assignmentId : '';
  const decisionStatus =
    typeof req.body?.decisionStatus === 'string' ? req.body.decisionStatus : '';
  const overrideReason =
    typeof req.body?.overrideReason === 'string' ? req.body.overrideReason.trim() : null;

  if (!assignmentId) return res.status(400).json({ error: 'assignmentId is required' });
  if (!DECISION_STATES.has(decisionStatus)) {
    return res.status(400).json({ error: 'Invalid decisionStatus' });
  }

  const { data, error } = await adminClient
    .from('guide_ride_assignments')
    .update({
      decision_status: decisionStatus,
      override_reason: overrideReason,
    })
    .eq('id', assignmentId)
    .select(
      'id, plan_id, ride_date, ride_level, guide_profile_id, decision_status, source, submitted_at, override_reason, is_sick_leave, sick_note, notes'
    )
    .single();

  if (error || !data) {
    return res.status(500).json({ error: error?.message || 'Failed to update assignment' });
  }

  return res.status(200).json({ assignment: data });
}

async function handleMarkUnavailable(
  req: NextApiRequest,
  res: NextApiResponse<ApiError | { assignment: unknown }>,
  adminClient: SupabaseClient,
  caller: CallerProfile,
  userId: string
) {
  const assignmentId = typeof req.body?.assignmentId === 'string' ? req.body.assignmentId : '';
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : null;

  if (!assignmentId) return res.status(400).json({ error: 'assignmentId is required' });

  const { data: assignment, error: assignmentError } = await adminClient
    .from('guide_ride_assignments')
    .select('id, guide_profile_id')
    .eq('id', assignmentId)
    .single();

  if (assignmentError || !assignment) {
    return res.status(404).json({ error: 'Assignment not found' });
  }

  const isOwner = assignment.guide_profile_id === userId;
  if (!isOwner && !caller.guide_is_coordinator) {
    return res.status(403).json({ error: 'Only the assigned guide or coordinator can mark unavailable' });
  }

  const { data, error } = await adminClient
    .from('guide_ride_assignments')
    .update({
      decision_status: 'unavailable',
      is_sick_leave: true,
      sick_note: reason,
      override_reason: caller.guide_is_coordinator ? reason : 'Guide marked unavailable',
    })
    .eq('id', assignmentId)
    .select(
      'id, plan_id, ride_date, ride_level, guide_profile_id, decision_status, source, submitted_at, override_reason, is_sick_leave, sick_note, notes'
    )
    .single();

  if (error || !data) {
    return res.status(500).json({ error: error?.message || 'Failed to mark unavailable' });
  }

  return res.status(200).json({ assignment: data });
}

async function handlePlanStatus(
  req: NextApiRequest,
  res: NextApiResponse<ApiError | { plan: unknown }>,
  adminClient: SupabaseClient,
  caller: CallerProfile,
  status: 'finalized' | 'published'
) {
  if (!caller.guide_is_coordinator) {
    return res.status(403).json({ error: 'Coordinator access required' });
  }
  const planId = typeof req.body?.planId === 'string' ? req.body.planId : '';
  if (!planId) return res.status(400).json({ error: 'planId is required' });

  const patch: Record<string, unknown> = { status };
  if (status === 'finalized') patch.finalized_at = new Date().toISOString();
  if (status === 'published') patch.published_at = new Date().toISOString();

  const { data, error } = await adminClient
    .from('guide_ride_plans')
    .update(patch)
    .eq('id', planId)
    .select('id, week_start_date, status, notes, finalized_at, published_at')
    .single();

  if (error || !data) {
    return res.status(500).json({ error: error?.message || 'Failed to update plan' });
  }

  return res.status(200).json({ plan: data });
}

async function handleDiscordCopy(
  req: NextApiRequest,
  res: NextApiResponse<ApiError | { title: string; message: string }>,
  adminClient: SupabaseClient
) {
  const planId = typeof req.body?.planId === 'string' ? req.body.planId : '';
  if (!planId) return res.status(400).json({ error: 'planId is required' });

  const { data: plan } = await adminClient
    .from('guide_ride_plans')
    .select('id, week_start_date')
    .eq('id', planId)
    .single();
  if (!plan) return res.status(404).json({ error: 'Plan not found' });

  const { data: assignments, error } = await adminClient
    .from('guide_ride_assignments')
    .select('id, ride_date, ride_level, decision_status, guide_profile_id')
    .eq('plan_id', planId)
    .order('ride_date', { ascending: true })
    .order('submitted_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message || 'Failed to build Discord copy' });

  const guideIds = [...new Set((assignments ?? []).map((a) => a.guide_profile_id))];
  const { data: guides } = guideIds.length
    ? await adminClient.from('profiles').select('id, display_name, username').in('id', guideIds)
    : { data: [] as Array<{ id: string; display_name: string | null; username: string | null }> };
  const guideLookup = Object.fromEntries((guides ?? []).map((g) => [g.id, g]));

  const assigned = (assignments ?? []).filter((row) => row.decision_status === 'assigned');
  const standby = (assignments ?? []).filter((row) => row.decision_status === 'standby');

  const levelText = (level: '2' | '2+' | '3') => {
    const handles = assigned
      .filter((row) => row.ride_level === level)
      .sort((a, b) => a.ride_date.localeCompare(b.ride_date))
      .map((row) => {
        const guide = guideLookup[row.guide_profile_id];
        return buildGuideTag(guide?.username ?? null, guide?.display_name ?? null);
      });
    return handles.length ? handles.join(' ') : '—';
  };

  const springerText = standby.length
    ? standby
        .map((row) => {
          const guide = guideLookup[row.guide_profile_id];
          return buildGuideTag(guide?.username ?? null, guide?.display_name ?? null);
        })
        .join(' ')
    : '—';

  const titleDate = assigned[0]?.ride_date ?? plan.week_start_date;
  const title = `${titleDate} ${formatWeekday(titleDate)} Social Ride`;

  const message = [
    'Level 2',
    levelText('2'),
    '',
    'Level 2+',
    levelText('2+'),
    '',
    'Level 3',
    levelText('3'),
    '',
    'Springer',
    springerText,
  ].join('\n');

  return res.status(200).json({ title, message });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await checkRateLimit(req, res, { windowMs: 60_000, max: 60, keyPrefix: 'guide-ride-planning' }))) {
    return;
  }

  const guideAuth = await requireGuideAuth(req, res, {
    misconfiguredMessage: 'Ride planning is not configured',
  });
  if (!guideAuth) return;

  const { adminClient, userId } = guideAuth;

  if (req.method === 'GET') {
    return handleGet(res, adminClient, userId);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const action = typeof req.body?.action === 'string' ? req.body.action : '';
  const caller = await loadCallerProfile(adminClient, userId);
  if (!caller) return res.status(403).json({ error: 'Caller profile not found' });

  if (action === 'create-plan') return handleCreatePlan(req, res, adminClient, caller);
  if (action === 'submit-proposal') return handleSubmitProposal(req, res, adminClient, userId);
  if (action === 'set-guide-choice') return handleSetGuideChoice(req, res, adminClient, userId);
  if (action === 'coordinator-assign-guide')
    return handleCoordinatorAssignGuide(req, res, adminClient, caller);
  if (action === 'set-decision') return handleSetDecision(req, res, adminClient, caller);
  if (action === 'mark-unavailable')
    return handleMarkUnavailable(req, res, adminClient, caller, userId);
  if (action === 'finalize-plan') return handlePlanStatus(req, res, adminClient, caller, 'finalized');
  if (action === 'publish-plan') return handlePlanStatus(req, res, adminClient, caller, 'published');
  if (action === 'build-discord-copy') return handleDiscordCopy(req, res, adminClient);

  return res.status(400).json({ error: 'Unknown action' });
}
