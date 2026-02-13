import React from 'react';
import type { Profile } from '../../context/AuthContext';

type MemberMetaCardProps = {
  profile: Profile | null;
  variant?: 'sidebar' | 'offcanvas';
  daysLeft?: number | null;
};

function formatMemberSince(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const MemberMetaCard: React.FC<MemberMetaCardProps> = ({
  profile,
  variant = 'offcanvas',
  daysLeft = null,
}) => {
  const memberSinceFormatted = formatMemberSince(profile?.member_since ?? null);
  const memberSinceLabel = memberSinceFormatted ?? '—';
  const membershipSource = profile?.membership_source ?? null;

  if (variant === 'sidebar') {
    return (
      <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 mb-2 w-full max-w-xs flex flex-col items-center">
        <div className="text-sm text-slate-700 dark:text-slate-200 mb-1">
          Member since <span className="font-medium">{memberSinceLabel}</span>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          — &middot; synced from{' '}
          <span className="font-medium">{membershipSource || 'unknown'}</span>
        </div>
      </div>
    );
  }

  const daysLeftClass =
    daysLeft != null && daysLeft > 0 && daysLeft < 30 ? 'font-bold text-red-600' : 'font-light';
  const daysLeftLabel =
    daysLeft != null
      ? daysLeft > 0
        ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left on membership`
        : daysLeft === 0
          ? 'Membership expires today'
          : 'Membership expired'
      : '—';

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700 space-y-1">
      <p>
        <span className="font-semibold">Member since</span> {memberSinceLabel}
      </p>
      <p>
        <span className={daysLeftClass}>{daysLeftLabel}</span>
        {membershipSource && <span className="font-light"> · synced from {membershipSource}</span>}
      </p>
    </div>
  );
};
