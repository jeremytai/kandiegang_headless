export interface MemberAnalytics {
  id: string;
  display_name: string;
  email: string;
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
  event_participation_count?: number;
  days_until_expiration?: number;
  is_at_risk?: boolean;
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

export const CHART_COLORS = {
  primary: '#2A3577',      // User's selected color
  secondary: '#3D4A8F',    // Lighter variant
  tertiary: '#1E2555',     // Darker variant
  accent: '#5063B8',       // Bright accent
  success: '#10B981',      // Green for positive metrics
  warning: '#F59E0B',      // Orange for warnings
  danger: '#EF4444',       // Red for negative metrics
  neutral: '#6B7280',      // Gray for neutral
};
