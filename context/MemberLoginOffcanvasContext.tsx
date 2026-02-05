/**
 * MemberLoginOffcanvasContext.tsx
 * Global member login offcanvas: open from Footer "Members", event CTA, or StickyTop user icon.
 * When logged in: shows account info and logout. When not: shows login form.
 */

import React, { createContext, useCallback, useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { OffCanvas } from '../components/OffCanvas';
import { MemberLoginForm } from '../components/MemberLoginForm';
import { useAuth } from './AuthContext';

function hasDiscordIdentity(user: { identities?: Array<{ provider: string }> } | null): boolean {
  return Boolean(user?.identities?.some((i) => i.provider === 'discord'));
}

type MemberLoginOffcanvasContextValue = {
  openMemberLogin: () => void;
  closeMemberLogin: () => void;
};

const MemberLoginOffcanvasContext = createContext<MemberLoginOffcanvasContextValue | null>(null);

export function useMemberLoginOffcanvas(): MemberLoginOffcanvasContextValue {
  const ctx = useContext(MemberLoginOffcanvasContext);
  if (!ctx) {
    throw new Error('useMemberLoginOffcanvas must be used within MemberLoginOffcanvasProvider');
  }
  return ctx;
}

function formatMemberSince(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDaysLeft(expirationStr: string | null | undefined): number | null {
  if (!expirationStr) return null;
  const exp = new Date(expirationStr + 'T23:59:59');
  if (Number.isNaN(exp.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  const diffMs = exp.getTime() - today.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/** True if profile has a plan indicating Kandie Gang Cycling Club membership. */
function isCyclingMember(plans: string[] | null | undefined): boolean {
  if (!Array.isArray(plans)) return false;
  const lower = plans.map((p) => p.toLowerCase());
  return lower.some(
    (p) => (p.includes('cycling') && (p.includes('member') || p.includes('membership'))) || p === 'kandie gang cycling club membership'
  );
}

/** True if profile has a plan indicating Kandie Gang Guide. */
function isGuide(plans: string[] | null | undefined): boolean {
  if (!Array.isArray(plans)) return false;
  return plans.some((p) => p.toLowerCase().includes('guide'));
}

function MemberOffcanvasContent({ onClose }: { onClose: () => void }) {
  const { user, profile, logout, signInWithDiscord } = useAuth();
  const [discordConnecting, setDiscordConnecting] = useState(false);
  const discordConnected = hasDiscordIdentity(user);

  if (user) {
    const handleLogout = async () => {
      await logout();
      onClose();
    };
    const handleConnectDiscord = async () => {
      setDiscordConnecting(true);
      const redirectTo =
        typeof window !== 'undefined'
          ? window.location.origin + window.location.pathname + (window.location.search || '')
          : undefined;
      await signInWithDiscord({ redirectTo });
      setDiscordConnecting(false);
      // On success, Supabase redirects to Discord then back here; session refreshes on return.
    };
    const memberSinceFormatted = formatMemberSince(profile?.member_since ?? null);
    const daysLeft = getDaysLeft(profile?.membership_expiration ?? null);
    const showCyclingMember = isCyclingMember(profile?.membership_plans);
    const showGuide = isGuide(profile?.membership_plans);
    const hasRolePills = showCyclingMember || showGuide;

    return (
      <div className="space-y-6">
        <p className="text-slate-600 text-sm">
          Logged in as <span className="font-medium text-slate-900">{profile?.display_name || user.email}</span>
          {user.email && profile?.display_name && (
            <span className="block text-slate-500 mt-0.5">{user.email}</span>
          )}
        </p>
        {hasRolePills && (
          <div className="flex flex-wrap gap-2">
            {showCyclingMember && (
              <span className="inline-flex items-center rounded-full bg-secondary-purple-rain/15 px-3 py-1 text-xs font-medium text-secondary-purple-rain border border-secondary-purple-rain/30">
                Kandie Gang Cycling Member
              </span>
            )}
            {showGuide && (
              <span className="inline-flex items-center rounded-full bg-secondary-purple-rain/15 px-3 py-1 text-xs font-medium text-secondary-purple-rain border border-secondary-purple-rain/30">
                Kandie Gang Guide
              </span>
            )}
          </div>
        )}
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700 space-y-1">
          <p>
            <span className="font-semibold">Member since</span>{' '}
            {memberSinceFormatted ?? '—'}
          </p>
          <p>
            <span className="font-semibold">
              {daysLeft != null
                ? daysLeft > 0
                  ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left on membership`
                  : daysLeft === 0
                    ? 'Membership expires today'
                    : 'Membership expired'
                : '—'}
            </span>
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold text-slate-700 mb-2">Connected accounts</p>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-slate-600">Discord</span>
            {discordConnected ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
                <span aria-hidden>✓</span>
                Connected
              </span>
            ) : (
              <button
                type="button"
                onClick={handleConnectDiscord}
                disabled={discordConnecting}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#5865F2] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#4752C4] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {discordConnecting ? 'Connecting…' : 'Connect'}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            to="/members"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
          >
            Members area
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-900 hover:border-slate-900 transition"
          >
            Log out
          </button>
        </div>
      </div>
    );
  }

  return <MemberLoginForm compact onSuccess={onClose} />;
}

export const MemberLoginOffcanvasProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  const openMemberLogin = useCallback(() => setOpen(true), []);
  const closeMemberLogin = useCallback(() => setOpen(false), []);

  return (
    <MemberLoginOffcanvasContext.Provider value={{ openMemberLogin, closeMemberLogin }}>
      {children}
      <OffCanvas
        open={open}
        onClose={closeMemberLogin}
        title={user ? 'Account' : 'Members login'}
      >
        <MemberOffcanvasContent onClose={closeMemberLogin} />
      </OffCanvas>
    </MemberLoginOffcanvasContext.Provider>
  );
};
