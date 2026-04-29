import { describe, it, expect } from 'vitest';
import { hasActiveMembership } from './membership';

function formatYmd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function ymdOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatYmd(d);
}

describe('hasActiveMembership', () => {
  it('returns false when profile is null', () => {
    expect(hasActiveMembership(null)).toBe(false);
  });

  it('returns false when is_member is false', () => {
    expect(hasActiveMembership({ is_member: false })).toBe(false);
  });

  it('returns true for explicit active member with no lifecycle fields', () => {
    expect(hasActiveMembership({ is_member: true })).toBe(true);
  });

  it('returns false when membership is expired by date', () => {
    expect(hasActiveMembership({ is_member: true, membership_expiration: ymdOffset(-1) })).toBe(false);
  });

  it('returns true when membership expires today', () => {
    expect(hasActiveMembership({ is_member: true, membership_expiration: ymdOffset(0) })).toBe(true);
  });

  it('returns false for explicitly inactive Stripe statuses', () => {
    const statuses = ['canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused'];
    for (const status of statuses) {
      expect(hasActiveMembership({ is_member: true, stripe_subscription_status: status })).toBe(false);
    }
  });

  it('returns true for active Stripe statuses', () => {
    expect(hasActiveMembership({ is_member: true, stripe_subscription_status: 'active' })).toBe(true);
    expect(hasActiveMembership({ is_member: true, stripe_subscription_status: 'trialing' })).toBe(
      true
    );
  });

  it('returns true for unknown Stripe status when is_member is true', () => {
    expect(hasActiveMembership({ is_member: true, stripe_subscription_status: 'legacy_manual' })).toBe(
      true
    );
  });
});
