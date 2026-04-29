export interface OrderHistoryEntry {
  order_id?: string | number;
  date?: string;
  total?: number | string;
  products?: string[];
  status?: string;
  discount?: number;
  net_total?: number;
  returning_customer?: boolean;
}

export interface MemberAnalytics {
  id: string;
  display_name: string;
  email: string;
  wp_user_id: number | null;
  lifetime_value: number;
  order_count: number;
  stripe_subscription_status: string | null;
  membership_expiration: string | null;
  accepts_marketing: boolean;
  last_order_date: string | null;
  customer_since: string | null;
  member_areas: string[] | null;
  tags: string[] | null;
  last_login: string | null;
  is_guide: boolean;
  is_member: boolean;
  is_team: boolean;
  is_archived: boolean | null;
  event_participation_count?: number;
  days_until_expiration?: number;
  is_at_risk?: boolean;
  // Profile details
  first_name: string | null;
  last_name: string | null;
  billing_address_1: string | null;
  billing_city: string | null;
  billing_postcode: string | null;
  billing_country: string | null;
  billing_phone: string | null;
  // Discord
  discord_id: string | null;
  username: string | null;
  avatar_url: string | null;
  // Stripe / subscription
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  subscription_current_period_end: string | null;
  subscription_cancel_at_period_end: boolean | null;
  // Membership
  membership_source: string | null;
  membership_plans: string[] | null;
  member_since: string | null;
  // Orders
  avg_order_value: number | null;
  order_history: OrderHistoryEntry[] | null;
  // Alternate emails (for merged profiles)
  alternate_emails: string[] | null;
  // Newsletter engagement
  newsletter_status: string | null;
  newsletter_source: string | null;
  engagement_score: number | null;
  last_engagement: string | null;
  email_count: number | null;
  last_email_open: string | null;
  last_email_click: string | null;
  last_page_view: string | null;
}

export interface KeyMetrics {
  totalMembers: number;
  activeSubs: number;
  totalLTV: number;
  avgLTV: number;
  atRiskCount: number;
  totalEventParticipation: number;
}

export interface LTVBucket {
  range: string;
  count: number;
}

export interface GrowthDataPoint {
  month: string;
  count: number;
}

export interface AreaCount {
  area: string;
  count: number;
}

export interface MarketingOptIn {
  optedIn: number;
  total: number;
  percentage: number;
}

export type WebsiteAnalyticsStatus = 'ok' | 'partial' | 'unavailable';
export type WebsiteAnalyticsStatusReason =
  | 'missing_credentials'
  | 'invalid_api_key'
  | 'project_not_found'
  | 'rate_limited'
  | 'posthog_unreachable'
  | 'query_failed'
  | 'unknown_error'
  | null;

export interface WebsiteAnalytics {
  status: WebsiteAnalyticsStatus;
  statusReason: WebsiteAnalyticsStatusReason;
  periodDays: number;
  updatedAt: string;
  landingPageviews: number;
  landingUsers: number;
  landingSessions: number;
  bounceRatePct: number;
  avgSessionSec: number;
  landingToCommunityUsers: number;
  landingToMembershipUsers: number;
  landingToShopUsers: number;
}

export interface EventParticipationRegistrant {
  registrationId: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  rideLevel: string;
  isWaitlist: boolean;
  signedUpAt: string;
  cancelledAt: string | null;
  noShowAt: string | null;
  totalSignups: number;
  totalCancellations: number;
}

export interface EventParticipationEvent {
  eventId: number;
  title: string;
  date: string;
  eventType: string;
  confirmed: number;
  waitlist: number;
  cancelled: number;
  byLevel: Record<string, { confirmed: number; waitlist: number; cancelled: number }>;
  registrants: EventParticipationRegistrant[];
}

export interface EventParticipationSummary {
  totalActiveRegistrations: number;
  totalCancelledRegistrations: number;
  flintaAttestedActive: number;
  maleOrUnknownActive: number;
  flintaRatioPct: number | null;
  flintaStatus: 'available' | 'unavailable';
  flintaStatusReason: 'missing_column' | 'not_tracked' | null;
  eventsWithReleaseDate: number;
  earlySignupTotal: number;
  earlySignupPct: number | null;
  earlyFlintaWindowCount: number;
  earlyMemberWindowCount: number;
}

export const CHART_COLORS = {
  primary: '#2A3577', // User's selected color
  secondary: '#3D4A8F', // Lighter variant
  tertiary: '#1E2555', // Darker variant
  accent: '#5063B8', // Bright accent
  success: '#10B981', // Green for positive metrics
  warning: '#F59E0B', // Orange for warnings
  danger: '#EF4444', // Red for negative metrics
  neutral: '#6B7280', // Gray for neutral
};
