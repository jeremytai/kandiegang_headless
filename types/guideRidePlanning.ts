export type RideLevel = '2' | '2+' | '3';

export type GuidePlanStatus = 'draft' | 'finalized' | 'published';

export type GuideDecisionStatus = 'proposed' | 'assigned' | 'standby' | 'unavailable';

export type ProposalSource = 'in_window' | 'late';
export type GuideChoice = 'level2' | 'level2plus' | 'level3' | 'participant' | 'no_time' | 'injured';

export interface GuidePlanWeek {
  id: string;
  week_start_date: string;
  status: GuidePlanStatus;
  notes: string | null;
  finalized_at: string | null;
  published_at: string | null;
}

export interface GuideAssignmentEntry {
  id: string;
  plan_id: string;
  ride_date: string;
  ride_level: RideLevel;
  guide_profile_id: string;
  decision_status: GuideDecisionStatus;
  source: ProposalSource;
  submitted_at: string;
  override_reason: string | null;
  is_sick_leave: boolean;
  sick_note: string | null;
  notes: string | null;
  guide: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    guide_flinta_priority: boolean;
  } | null;
}

export interface RidePlanningData {
  plans: GuidePlanWeek[];
  assignments: GuideAssignmentEntry[];
  myChoices: Array<{
    id: string;
    plan_id: string;
    ride_date: string;
    guide_profile_id: string;
    choice: GuideChoice;
    updated_at: string;
  }>;
  guideRoster: Array<{
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    guide_flinta_priority: boolean;
    guide_is_coordinator: boolean;
  }>;
  nowIso: string;
  caller: {
    id: string;
    isCoordinator: boolean;
  };
}
