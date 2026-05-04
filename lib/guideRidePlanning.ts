import type { SupabaseClient } from '@supabase/supabase-js';

type CallerProfile = {
  id: string;
  guide_is_coordinator: boolean | null;
  is_guide: boolean | null;
};

type ActionResult = {
  status: number;
  payload: Record<string, unknown>;
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

async function handleFetch(adminClient: SupabaseClient, userId: string): Promise<ActionResult> {
  const caller = await loadCallerProfile(adminClient, userId);
  if (!caller) return { status: 403, payload: { error: 'Caller profile not found' } };

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

  if (plansError) return { status: 500, payload: { error: plansError.message || 'Failed to load plans' } };

  const planIds = (plans ?? []).map((p) => p.id);
  if (planIds.length === 0) {
    return {
      status: 200,
      payload: {
        plans: [],
        assignments: [],
        myChoices: [],
        guideRoster: [],
        nowIso: new Date().toISOString(),
        caller: { id: userId, isCoordinator: Boolean(caller.guide_is_coordinator) },
      },
    };
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
    return { status: 500, payload: { error: assignmentsError.message || 'Failed to load assignments' } };
  }

  const guideIds = [...new Set((assignments ?? []).map((a) => a.guide_profile_id))];
  let guideById: Record<
    string,
    { id: string; display_name: string | null; username: string | null; avatar_url: string | null; guide_flinta_priority: boolean }
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
    return { status: 500, payload: { error: myChoicesError.message || 'Failed to load guide choices' } };
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
      return { status: 500, payload: { error: rosterError.message || 'Failed to load guide roster' } };
    }
    guideRoster = (rosterRows ?? []).map((row) => ({
      id: row.id,
      display_name: row.display_name ?? null,
      username: row.username ?? null,
      avatar_url: row.avatar_url ?? null,
      guide_flinta_priority: Boolean(row.guide_flinta_priority),
    }));
  }

  return {
    status: 200,
    payload: {
      plans: plans ?? [],
      assignments: hydratedAssignments,
      myChoices: myChoices ?? [],
      guideRoster,
      nowIso: new Date().toISOString(),
      caller: { id: userId, isCoordinator: Boolean(caller.guide_is_coordinator) },
    },
  };
}

async function handleCreatePlan(
  adminClient: SupabaseClient,
  userId: string,
  caller: CallerProfile,
  body: Record<string, unknown>
): Promise<ActionResult> {
  if (!caller.guide_is_coordinator) return { status: 403, payload: { error: 'Coordinator access required' } };
  const weekStartDate = typeof body.weekStartDate === 'string' ? body.weekStartDate : '';
  const notes = typeof body.notes === 'string' ? body.notes.trim() : null;
  if (!isIsoDate(weekStartDate)) return { status: 400, payload: { error: 'weekStartDate must be YYYY-MM-DD' } };
  if (!isTuesday(weekStartDate)) {
    return { status: 400, payload: { error: 'Planning weeks must start on Tuesday for social rides' } };
  }
  const { data, error } = await adminClient
    .from('guide_ride_plans')
    .upsert({ week_start_date: weekStartDate, status: 'draft', notes, created_by: userId }, { onConflict: 'week_start_date' })
    .select('id, week_start_date, status, notes, finalized_at, published_at')
    .single();
  if (error || !data) return { status: 500, payload: { error: error?.message || 'Failed to create plan' } };
  return { status: 200, payload: { plan: data } };
}

async function handleSubmitProposal(
  adminClient: SupabaseClient,
  userId: string,
  body: Record<string, unknown>
): Promise<ActionResult> {
  const planId = typeof body.planId === 'string' ? body.planId : '';
  const rideDate = typeof body.rideDate === 'string' ? body.rideDate : '';
  const rideLevel = typeof body.rideLevel === 'string' ? body.rideLevel : '';
  const notes = typeof body.notes === 'string' ? body.notes.trim() : null;
  const source = body.source === 'late' ? 'late' : 'in_window';
  if (!RIDE_LEVELS.has(rideLevel)) return { status: 400, payload: { error: 'rideLevel must be one of: 2, 2+, 3' } };
  const validity = await validatePlanAndDate(adminClient, planId, rideDate);
  if (!validity.ok) return { status: validity.status, payload: { error: validity.error } };
  const { data, error } = await upsertLevelAssignment(adminClient, {
    planId,
    rideDate,
    rideLevel,
    userId,
    notes,
    source: source as 'in_window' | 'late',
  });
  if (error || !data) return { status: 500, payload: { error: error?.message || 'Failed to save proposal' } };
  return { status: 200, payload: { assignment: data } };
}

async function handleSetGuideChoice(
  adminClient: SupabaseClient,
  userId: string,
  body: Record<string, unknown>
): Promise<ActionResult> {
  const planId = typeof body.planId === 'string' ? body.planId : '';
  const rideDate = typeof body.rideDate === 'string' ? body.rideDate : '';
  const choice = typeof body.choice === 'string' ? body.choice : '';
  const validity = await validatePlanAndDate(adminClient, planId, rideDate);
  if (!validity.ok) return { status: validity.status, payload: { error: validity.error } };

  if (choice === '') {
    await adminClient.from('guide_ride_availability').delete().eq('plan_id', planId).eq('ride_date', rideDate).eq('guide_profile_id', userId);
    const { error: deleteError } = await adminClient
      .from('guide_ride_assignments')
      .delete()
      .eq('plan_id', planId)
      .eq('ride_date', rideDate)
      .eq('guide_profile_id', userId);
    if (deleteError) return { status: 500, payload: { error: deleteError.message || 'Failed to clear assignment' } };
    return { status: 200, payload: { choice: null, assignment: null } };
  }

  if (!GUIDE_CHOICES.has(choice)) return { status: 400, payload: { error: 'Invalid choice' } };

  const { data: choiceRow, error: choiceError } = await adminClient
    .from('guide_ride_availability')
    .upsert(
      { plan_id: planId, ride_date: rideDate, guide_profile_id: userId, choice, updated_at: new Date().toISOString() },
      { onConflict: 'plan_id,ride_date,guide_profile_id' }
    )
    .select('id, plan_id, ride_date, guide_profile_id, choice, updated_at')
    .single();
  if (choiceError || !choiceRow) return { status: 500, payload: { error: choiceError?.message || 'Failed to save guide choice' } };

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
      return { status: 500, payload: { error: error?.message || 'Failed to update assignment from choice' } };
    }
    return { status: 200, payload: { choice: choiceRow, assignment } };
  }

  const { error: deleteError } = await adminClient
    .from('guide_ride_assignments')
    .delete()
    .eq('plan_id', planId)
    .eq('ride_date', rideDate)
    .eq('guide_profile_id', userId);
  if (deleteError) return { status: 500, payload: { error: deleteError.message || 'Failed to clear assignment' } };
  return { status: 200, payload: { choice: choiceRow, assignment: null } };
}

async function handleSetDecision(
  adminClient: SupabaseClient,
  caller: CallerProfile,
  body: Record<string, unknown>
): Promise<ActionResult> {
  if (!caller.guide_is_coordinator) return { status: 403, payload: { error: 'Coordinator access required' } };
  const assignmentId = typeof body.assignmentId === 'string' ? body.assignmentId : '';
  const decisionStatus = typeof body.decisionStatus === 'string' ? body.decisionStatus : '';
  const overrideReason = typeof body.overrideReason === 'string' ? body.overrideReason.trim() : null;
  if (!assignmentId) return { status: 400, payload: { error: 'assignmentId is required' } };
  if (!DECISION_STATES.has(decisionStatus)) return { status: 400, payload: { error: 'Invalid decisionStatus' } };
  const { data, error } = await adminClient
    .from('guide_ride_assignments')
    .update({ decision_status: decisionStatus, override_reason: overrideReason })
    .eq('id', assignmentId)
    .select(
      'id, plan_id, ride_date, ride_level, guide_profile_id, decision_status, source, submitted_at, override_reason, is_sick_leave, sick_note, notes'
    )
    .single();
  if (error || !data) return { status: 500, payload: { error: error?.message || 'Failed to update assignment' } };
  return { status: 200, payload: { assignment: data } };
}

async function handleMarkUnavailable(
  adminClient: SupabaseClient,
  caller: CallerProfile,
  userId: string,
  body: Record<string, unknown>
): Promise<ActionResult> {
  const assignmentId = typeof body.assignmentId === 'string' ? body.assignmentId : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim() : null;
  if (!assignmentId) return { status: 400, payload: { error: 'assignmentId is required' } };
  const { data: assignment, error: assignmentError } = await adminClient
    .from('guide_ride_assignments')
    .select('id, guide_profile_id')
    .eq('id', assignmentId)
    .single();
  if (assignmentError || !assignment) return { status: 404, payload: { error: 'Assignment not found' } };
  const isOwner = assignment.guide_profile_id === userId;
  if (!isOwner && !caller.guide_is_coordinator) {
    return { status: 403, payload: { error: 'Only the assigned guide or coordinator can mark unavailable' } };
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
  if (error || !data) return { status: 500, payload: { error: error?.message || 'Failed to mark unavailable' } };
  return { status: 200, payload: { assignment: data } };
}

async function handlePlanStatus(
  adminClient: SupabaseClient,
  caller: CallerProfile,
  body: Record<string, unknown>,
  status: 'finalized' | 'published'
): Promise<ActionResult> {
  if (!caller.guide_is_coordinator) return { status: 403, payload: { error: 'Coordinator access required' } };
  const planId = typeof body.planId === 'string' ? body.planId : '';
  if (!planId) return { status: 400, payload: { error: 'planId is required' } };
  const patch: Record<string, unknown> = { status };
  if (status === 'finalized') patch.finalized_at = new Date().toISOString();
  if (status === 'published') patch.published_at = new Date().toISOString();
  const { data, error } = await adminClient
    .from('guide_ride_plans')
    .update(patch)
    .eq('id', planId)
    .select('id, week_start_date, status, notes, finalized_at, published_at')
    .single();
  if (error || !data) return { status: 500, payload: { error: error?.message || 'Failed to update plan' } };
  return { status: 200, payload: { plan: data } };
}

async function handleDiscordCopy(
  adminClient: SupabaseClient,
  body: Record<string, unknown>
): Promise<ActionResult> {
  const planId = typeof body.planId === 'string' ? body.planId : '';
  if (!planId) return { status: 400, payload: { error: 'planId is required' } };
  const { data: plan } = await adminClient.from('guide_ride_plans').select('id, week_start_date').eq('id', planId).single();
  if (!plan) return { status: 404, payload: { error: 'Plan not found' } };
  const { data: assignments, error } = await adminClient
    .from('guide_ride_assignments')
    .select('id, ride_date, ride_level, decision_status, guide_profile_id')
    .eq('plan_id', planId)
    .order('ride_date', { ascending: true })
    .order('submitted_at', { ascending: true });
  if (error) return { status: 500, payload: { error: error.message || 'Failed to build Discord copy' } };

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
    ? standby.map((row) => buildGuideTag(guideLookup[row.guide_profile_id]?.username ?? null, guideLookup[row.guide_profile_id]?.display_name ?? null)).join(' ')
    : '—';
  const titleDate = assigned[0]?.ride_date ?? plan.week_start_date;
  const title = `${titleDate} ${formatWeekday(titleDate)} Social Ride`;
  const message = ['Level 2', levelText('2'), '', 'Level 2+', levelText('2+'), '', 'Level 3', levelText('3'), '', 'Springer', springerText].join('\n');
  return { status: 200, payload: { title, message } };
}

async function handleCoordinatorAssignGuide(
  adminClient: SupabaseClient,
  caller: CallerProfile,
  body: Record<string, unknown>
): Promise<ActionResult> {
  if (!caller.guide_is_coordinator) return { status: 403, payload: { error: 'Coordinator access required' } };
  const planId = typeof body.planId === 'string' ? body.planId : '';
  const rideDate = typeof body.rideDate === 'string' ? body.rideDate : '';
  const rideLevel = typeof body.rideLevel === 'string' ? body.rideLevel : '';
  const assignmentStatus = typeof body.assignmentStatus === 'string' ? body.assignmentStatus : 'assigned';
  const guideProfileId = typeof body.guideProfileId === 'string' ? body.guideProfileId : '';
  if (!guideProfileId) return { status: 400, payload: { error: 'guideProfileId is required' } };
  if (!RIDE_LEVELS.has(rideLevel)) return { status: 400, payload: { error: 'rideLevel must be one of: 2, 2+, 3' } };
  if (assignmentStatus !== 'assigned' && assignmentStatus !== 'standby') {
    return { status: 400, payload: { error: 'assignmentStatus must be assigned or standby' } };
  }
  const validity = await validatePlanAndDate(adminClient, planId, rideDate);
  if (!validity.ok) return { status: validity.status, payload: { error: validity.error } };
  const { data: guide, error: guideError } = await adminClient
    .from('profiles')
    .select('id, is_guide')
    .eq('id', guideProfileId)
    .single();
  if (guideError || !guide || !guide.is_guide) return { status: 400, payload: { error: 'Selected profile is not a valid guide' } };
  const { data: assignment, error } = await upsertLevelAssignment(adminClient, {
    planId,
    rideDate,
    rideLevel,
    userId: guideProfileId,
    notes: null,
    source: 'in_window',
    decisionStatus: assignmentStatus,
    overrideReason:
      assignmentStatus === 'standby'
        ? 'Coordinator manual Springer assignment'
        : 'Coordinator manual assignment',
  });
  if (error || !assignment) return { status: 500, payload: { error: error?.message || 'Failed to assign guide manually' } };
  await adminClient.from('guide_ride_availability').upsert(
    {
      plan_id: planId,
      ride_date: rideDate,
      guide_profile_id: guideProfileId,
      choice: CHOICE_BY_LEVEL[rideLevel as '2' | '2+' | '3'],
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'plan_id,ride_date,guide_profile_id' }
  );
  return { status: 200, payload: { assignment } };
}

export async function handleGuideRidePlanningAction(params: {
  action: string;
  body: Record<string, unknown>;
  adminClient: SupabaseClient;
  userId: string;
}): Promise<ActionResult | null> {
  const { action, body, adminClient, userId } = params;
  const caller = await loadCallerProfile(adminClient, userId);
  if (!caller) return { status: 403, payload: { error: 'Caller profile not found' } };

  if (action === 'guide-ride-fetch') return handleFetch(adminClient, userId);
  if (action === 'create-plan') return handleCreatePlan(adminClient, userId, caller, body);
  if (action === 'submit-proposal') return handleSubmitProposal(adminClient, userId, body);
  if (action === 'set-guide-choice') return handleSetGuideChoice(adminClient, userId, body);
  if (action === 'set-decision') return handleSetDecision(adminClient, caller, body);
  if (action === 'mark-unavailable') return handleMarkUnavailable(adminClient, caller, userId, body);
  if (action === 'finalize-plan') return handlePlanStatus(adminClient, caller, body, 'finalized');
  if (action === 'publish-plan') return handlePlanStatus(adminClient, caller, body, 'published');
  if (action === 'build-discord-copy') return handleDiscordCopy(adminClient, body);
  if (action === 'coordinator-assign-guide')
    return handleCoordinatorAssignGuide(adminClient, caller, body);
  return null;
}
