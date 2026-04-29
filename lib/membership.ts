/**
 * Canonical membership helpers used across UI and API.
 */

export type MembershipLike = {
  is_member?: boolean | null;
  membership_expiration?: string | null;
  stripe_subscription_status?: string | null;
} | null;

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);
const INACTIVE_SUBSCRIPTION_STATUSES = new Set([
  'canceled',
  'unpaid',
  'incomplete',
  'incomplete_expired',
  'paused',
]);

function isExpiredDate(ymd: string): boolean {
  // Compare by date only to avoid timezone drift around midnight.
  const today = new Date();
  const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;
  return ymd < todayYmd;
}

/**
 * Returns true only for explicitly active members.
 * Keeps membership eligibility logic in one place to avoid drift.
 */
export function hasActiveMembership(profile: MembershipLike): boolean {
  if (profile?.is_member !== true) return false;

  const expiration = profile.membership_expiration?.trim();
  if (expiration && /^\d{4}-\d{2}-\d{2}$/.test(expiration) && isExpiredDate(expiration)) {
    return false;
  }

  const status = profile.stripe_subscription_status?.trim().toLowerCase();
  if (!status) return true;
  if (ACTIVE_SUBSCRIPTION_STATUSES.has(status)) return true;
  if (INACTIVE_SUBSCRIPTION_STATUSES.has(status)) return false;

  // Unknown status values should not lock users out if is_member is true.
  return true;
}
