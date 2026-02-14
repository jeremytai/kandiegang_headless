/**
 * MemberLoginOffcanvasContext.tsx
 * Global member login offcanvas: open from Footer "Members", event CTA, or StickyTop user icon.
 * When logged in: shows account info and logout. When not: shows login form.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { OffCanvas } from '../components/layout/OffCanvas';
import { useContactModal } from './ContactModalContext';
import { EventSignupPanel, type EventSignupIntent } from '../components/event/EventSignupPanel';
import { MemberMetaCard } from '../components/member/MemberMetaCard';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';

const DELETE_ACCOUNT_CONFIRM_PHRASE = 'Yes, delete account';

function hasDiscordIdentity(user: { identities?: Array<{ provider: string }> } | null): boolean {
  return Boolean(user?.identities?.some((i) => i.provider === 'discord'));
}

type MemberLoginOffcanvasContextValue = {
  openMemberLogin: () => void;
  openEventSignup: (intent: EventSignupIntent) => void;
  closeMemberLogin: () => void;
};

const MemberLoginOffcanvasContext = createContext<MemberLoginOffcanvasContextValue | null>(null);

const LOGIN_GREETINGS: string[] = [
  'Hey Beautiful 👋!', // English
  '¡Hola, guapa 👋!', // Spanish
  'Salut belle 👋!', // French
  'Ciao bella 👋!', // Italian
  'Hey Schöne 👋!', // German
  'Oi linda 👋!', // Portuguese
];

function pickRandomGreeting(): string {
  return LOGIN_GREETINGS[Math.floor(Math.random() * LOGIN_GREETINGS.length)];
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export interface MemberLoginFormProps {
  /** Called after successful login (e.g. close sidebar and navigate). */
  onSuccess?: () => void;
  /** Tighter layout for sidebar/embed use. */
  compact?: boolean;
  /** When set, "Become a member" closes the sidebar/overlay before navigating (e.g. offcanvas). */
  onClose?: () => void;
}

export interface MemberSignupFormProps {
  onSuccess?: () => void;
  onShowLogin?: () => void;
  compact?: boolean;
}

const inputClass =
  'block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-black focus:ring-1 focus:ring-black';
const labelClass = 'block text-sm font-medium text-slate-800 mb-1';
const btnPrimary =
  'inline-flex items-center justify-center rounded-full bg-black px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-400';

export const MemberLoginForm: React.FC<MemberLoginFormProps> = ({
  onSuccess: _onSuccess,
  compact = false,
  onClose,
}) => {
  const { signInWithMagicLink, signInWithDiscord, status } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [discordLoading, setDiscordLoading] = useState(false);

  const handleDiscordSignIn = async () => {
    setError(null);
    setDiscordLoading(true);
    const { error: discordError } = await signInWithDiscord();
    setDiscordLoading(false);
    if (discordError) setError(discordError);
  };

  const handleMagicLink = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    const { error: magicError } = await signInWithMagicLink(email.trim());
    setIsSubmitting(false);
    if (magicError) {
      setError(magicError);
      return;
    }
    setMagicLinkSent(true);
  };

  if (magicLinkSent) {
    return (
      <div className={compact ? 'space-y-3' : 'space-y-4'}>
        <h2
          className={
            compact
              ? 'text-xl font-normal text-primary-ink'
              : 'text-2xl font-normal text-primary-ink'
          }
        >
          Check your email
        </h2>
        <p className="text-slate-600 text-sm">
          We sent a login link to <strong>{email}</strong>. Click the link to sign in; you&apos;ll
          be taken straight to the members area. The link expires in about an hour.
        </p>
        <p className="text-xs text-slate-500">
          Didn&apos;t get it? Check spam, or{' '}
          <button
            type="button"
            onClick={() => setMagicLinkSent(false)}
            className="font-medium text-black underline hover:no-underline"
          >
            try again
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {!compact && (
        <p className="text-slate-600 max-w-prose">
          Welcome back to Kandie Gang. Log in with your password or get a passwordless link by
          email.
        </p>
      )}

      <p className="text-sm font-normal text-primary-ink">
        You are just a few clicks away from goodness.
      </p>

      <form onSubmit={handleMagicLink} className="space-y-4">
        <div>
          <label htmlFor="member-login-email" className={labelClass}>
            Email address
          </label>
          <input
            id="member-login-email"
            type="email"
            autoComplete="email"
            required
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-col gap-3">
          <button
            type="submit"
            disabled={isSubmitting || status === 'loading' || !email.trim()}
            className={btnPrimary}
          >
            {isSubmitting || status === 'loading' ? 'Sending…' : 'Email me a login link'}
          </button>
        </div>
      </form>

      <div className="flex flex-col gap-3">
        <p className="text-center text-sm text-slate-500">or</p>
        <button
          type="button"
          onClick={handleDiscordSignIn}
          disabled={discordLoading || status === 'loading'}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#5865F2] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {discordLoading || status === 'loading' ? (
            'Connecting…'
          ) : (
            <>
              <DiscordIcon className="h-5 w-5" />
              Sign in with Discord
            </>
          )}
        </button>
      </div>

      <p className="text-sm text-slate-600">
        Don&apos;t have an account?{' '}
        <Link
          to="/kandiegangcyclingclub"
          onClick={onClose}
          className="font-medium text-black underline hover:no-underline"
        >
          Become a member
        </Link>
      </p>
      {!compact && (
        <p className="text-xs text-slate-500">
          Check your email for the login link or use the reset link from our emails.
        </p>
      )}
    </div>
  );
};

export const MemberSignupForm: React.FC<MemberSignupFormProps> = ({
  onSuccess,
  onShowLogin,
  compact = false,
}) => {
  const { signInWithMagicLink, signInWithDiscord, status } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [discordLoading, setDiscordLoading] = useState(false);

  const handleDiscordSignUp = async () => {
    setError(null);
    setDiscordLoading(true);
    const { error: discordError } = await signInWithDiscord();
    setDiscordLoading(false);
    if (discordError) setError(discordError);
    else onSuccess?.();
  };

  const handleMagicLink = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    const { error: magicError } = await signInWithMagicLink(email.trim());
    setIsSubmitting(false);
    if (magicError) {
      setError(magicError);
      return;
    }
    setMagicLinkSent(true);
  };

  if (magicLinkSent) {
    return (
      <div className={compact ? 'space-y-3' : 'space-y-4'}>
        <h2
          className={
            compact ? 'text-xl font-bold text-primary-ink' : 'text-2xl font-bold text-primary-ink'
          }
        >
          <span className="font-gtplanar">Check your email</span>
        </h2>
        <p className="text-slate-600 text-sm">
          We sent a signup link to <strong>{email}</strong>. Click the link to create your account
          and sign in. The link expires in about an hour.
        </p>
        <p className="text-xs text-slate-500">
          Didn&apos;t get it? Check spam, or{' '}
          <button
            type="button"
            onClick={() => setMagicLinkSent(false)}
            className="font-medium text-black underline hover:no-underline"
          >
            try again
          </button>
          .
        </p>
        {onShowLogin && (
          <button
            type="button"
            onClick={onShowLogin}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-900"
          >
            Back to log in
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {!compact && (
        <p className="text-slate-600 max-w-prose">
          Sign up to get a Kandie Gang account. After signing in, we can link your membership if
          you&apos;re already a member.
        </p>
      )}

      <form onSubmit={handleMagicLink} className="space-y-4">
        <div>
          <label htmlFor="member-signup-email" className={labelClass}>
            Email address
          </label>
          <input
            id="member-signup-email"
            type="email"
            autoComplete="email"
            required
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting || status === 'loading' || !email.trim()}
          className={`w-full ${btnPrimary}`}
        >
          {isSubmitting || status === 'loading' ? 'Sending…' : 'Email me a signup link'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500">or</p>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleDiscordSignUp}
          disabled={discordLoading || status === 'loading'}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#5865F2] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {discordLoading || status === 'loading' ? (
            'Connecting…'
          ) : (
            <>
              <DiscordIcon className="h-5 w-5" />
              Sign up with Discord
            </>
          )}
        </button>
      </div>

      {onShowLogin && (
        <p className="text-sm text-slate-600">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onShowLogin}
            className="font-medium text-black underline hover:no-underline"
          >
            Log in
          </button>
        </p>
      )}
    </div>
  );
};

export function useMemberLoginOffcanvas(): MemberLoginOffcanvasContextValue {
  const ctx = useContext(MemberLoginOffcanvasContext);
  if (!ctx) {
    throw new Error('useMemberLoginOffcanvas must be used within MemberLoginOffcanvasProvider');
  }
  return ctx;
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
    (p) =>
      (p.includes('cycling') && (p.includes('member') || p.includes('membership'))) ||
      p === 'kandie gang cycling club membership'
  );
}

/** True if profile has a plan name containing "guide". */
function isGuideFromPlans(plans: string[] | null | undefined): boolean {
  if (!Array.isArray(plans)) return false;
  return plans.some((p) => p.toLowerCase().includes('guide'));
}

type PanelView = 'login' | 'signup' | 'event-signup';

/** Account view when user is logged in. Own component so hook count is independent of the auth/form view. */
function MemberOffcanvasAccountContent({
  onClose,
  onLogoutRedirect,
}: {
  onClose: () => void;
  onLogoutRedirect: () => void;
}) {
  const { user, profile, logout, signInWithDiscord, refreshProfile } = useAuth();
  const { openContactModal } = useContactModal();
  const [discordConnecting, setDiscordConnecting] = useState(false);
  const discordConnected = hasDiscordIdentity(user);
  const [isRefreshingMembership, setIsRefreshingMembership] = useState(false);
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);

  const handleLogout = useCallback(async () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('logoutRedirecting', '1');
    }
    onClose();
    await logout();
    onLogoutRedirect();
  }, [logout, onClose, onLogoutRedirect]);

  const handleConnectDiscord = useCallback(async () => {
    setDiscordConnecting(true);
    const redirectTo =
      typeof window !== 'undefined'
        ? window.location.origin + window.location.pathname + (window.location.search || '')
        : undefined;
    await signInWithDiscord({ redirectTo });
    setDiscordConnecting(false);
  }, [signInWithDiscord]);

  const handleRefreshMembership = useCallback(async () => {
    setIsRefreshingMembership(true);
    await refreshProfile();
    setIsRefreshingMembership(false);
  }, [refreshProfile]);

  const daysLeft = getDaysLeft(profile?.membership_expiration ?? null);
  const showCyclingMember = isCyclingMember(profile?.membership_plans);
  const showGuide = Boolean(profile?.is_guide) || isGuideFromPlans(profile?.membership_plans);
  const hasRolePills = showCyclingMember || showGuide;
  const isMember = profile?.is_member === true;

  // FAQ-style accordion state
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  if (!user) return null;
  // General section content
  const generalSection = (
    <div className="mb-6 px-0 md:px-0">
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-900">Logged in with</span>
          {user.email && profile?.display_name && <span className="text-xs">{user.email}</span>}
        </div>
        {/* TODO: Add editable fields for first/last name, email */}
      </div>
      <div className="mt-4">
        <p className="text-xs font-normal text-slate-700 mb-2">Connected accounts</p>
        <div className="rounded-xl border bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 px-4 py-3 text-xs text-amber-900 flex items-center justify-between gap-2 mt-2">
          <span className="flex items-center gap-2 text-sm text-slate-600">
            <img src="/logos/discord-icon.svg" alt="Discord" className="h-5 w-5" />
            Discord
          </span>
          {discordConnected ? (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#5865F2] px-2.5 py-1 text-xs font-medium text-white">
                <span aria-hidden>✓</span>
                Connected
              </span>
            </>
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
    </div>
  );
  const accordionSections = [
    {
      label: 'Membership',
      content: (
        <>
          {hasRolePills && (
            <div className="flex flex-wrap gap-2 mb-2">
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
          {isMember && <MemberMetaCard profile={profile} daysLeft={daysLeft} variant="offcanvas" />}
          {!isMember && (
            <>
              <div className="space-y-3">
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                  <p className="font-semibold mb-1">You&apos;re almost there.</p>
                  <p className="mb-1">
                    We couldn&apos;t find an active membership for this account. We checked our
                    current system (and WordPress) for the email you signed in with.
                  </p>
                  <p>
                    If you&apos;re already a Kandie Gang member from our previous setup,{' '}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        openContactModal();
                      }}
                      className="font-semibold underline"
                    >
                      reach out
                    </button>{' '}
                    and we&apos;ll link your account. Otherwise, keep an eye on our channels for the
                    next membership window.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleRefreshMembership}
                    disabled={isRefreshingMembership}
                    className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-900 disabled:opacity-50"
                  >
                    {isRefreshingMembership ? 'Refreshing…' : 'Refresh membership status'}
                  </button>
                  <div className="flex flex-row items-center gap-3 w-full">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        openContactModal();
                      }}
                      className="flex-1 w-full inline-flex items-center justify-center rounded-full bg-black px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900"
                    >
                      Email us
                    </button>
                    <a
                      href="https://discord.com/channels/1059075420798079036/1472159708361265215"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 w-full inline-flex items-center justify-center rounded-full bg-[#5865F2] px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4752C4]"
                    >
                      Use Discord
                    </a>
                  </div>
                </div>
              </div>
            </>
          )}
          {daysLeft != null && daysLeft < 30 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 mt-3">
              <p className="font-medium mb-2">
                Renew your membership today to extend your Kandie Gang benefits and continued
                support of the club.
              </p>
              <Link
                to="/shop/kandie-gang-cycling-club-membership"
                onClick={onClose}
                className="font-semibold text-amber-800 hover:underline"
              >
                Kandie Gang Membership
              </Link>
            </div>
          )}
        </>
      ),
    },
    {
      label: 'Activity',
      content: (
        <>
          {/* TODO: Fetch and display upcoming/past rides/events and purchase history */}
          <div className="text-sm text-slate-500">
            Coming soon: Your upcoming and past rides/events, purchase history.
          </div>
        </>
      ),
    },
    {
      label: 'Email Notifications',
      content: (
        <>
          {/* TODO: Add toggles for event/ride notifications and newsletter */}
          <div className="text-sm text-slate-500">
            Coming soon: Manage your notification preferences.
          </div>
        </>
      ),
    },
    {
      label: 'Account',
      content: (
        <>
          <div className="flex flex-col gap-3">
            <Link
              to={isMember ? '/members' : '/kandiegangcyclingclub'}
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
            <button
              type="button"
              onClick={() => setDeleteAccountModalOpen(true)}
              className="mt-2 text-sm text-red-600 hover:underline bg-transparent border-none p-0 cursor-pointer font-normal"
            >
              Delete account
            </button>
          </div>
          <DeleteAccountModal
            isOpen={deleteAccountModalOpen}
            onClose={() => setDeleteAccountModalOpen(false)}
            onRequestDelete={async () => {
              if (!supabase) return false;
              const {
                data: { session },
              } = await supabase.auth.getSession();
              if (!session?.access_token) return false;
              const res = await fetch('/api/delete-account', {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}` },
              });
              return res.ok;
            }}
            onDeleted={() => {
              setDeleteAccountModalOpen(false);
              onClose();
              logout();
              onLogoutRedirect();
            }}
          />
        </>
      ),
    },
  ];

  return (
    <div className="flex flex-col">
      {/* General section (not in accordion) */}
      <div className="mb-6 px-0 md:px-0">
        <p className="text-lg md:text-xl font-medium tracking-tight text-secondary-purple-rain">
          Hello {profile?.display_name}
        </p>
        {generalSection}
      </div>
      {/* Accordion sections */}
      {accordionSections.map((section, idx) => (
        <div
          key={section.label}
          className={`overflow-hidden border-t border-secondary-purple-rain/50 py-6 md:py-8 ${idx === accordionSections.length - 1 ? 'border-b' : ''} -mx-6 md:-mx-8`}
        >
          <button
            type="button"
            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
            className="flex w-full cursor-pointer items-start justify-between text-left group px-6 md:px-8"
            aria-expanded={openIndex === idx ? 'true' : 'false'}
            aria-controls={`settings-accordion-panel-${idx}`}
            id={`settings-accordion-button-${idx}`}
          >
            <span className="max-w-[60ch] flex-1 pr-4">
              <p className="text-lg md:text-xl font-medium tracking-tight text-secondary-purple-rain">
                {section.label}
              </p>
            </span>
            <span
              className={`inline-flex shrink-0 pt-1 transition-transform duration-300 ease-in-out ${openIndex === idx ? 'rotate-180' : ''}`}
            >
              {/* ChevronDown icon, use same as FAQ */}
              <svg
                className="h-5 w-5 opacity-60 text-secondary-purple-rain group-hover:opacity-100 transition-opacity"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </button>
          <AnimatePresence initial={false}>
            {openIndex === idx && (
              <motion.div
                id={`settings-accordion-panel-${idx}`}
                role="region"
                aria-labelledby={`settings-accordion-button-${idx}`}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
              >
                <div className="pt-6 pb-2 text-secondary-purple-rain leading-relaxed font-light text-base md:text-lg max-w-[65ch] px-6 md:px-8">
                  {section.content}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

/** Delete account confirmation modal: type "Yes, delete account" to enable delete. On success shows goodbye message, then closes and calls onDeleted. */
function DeleteAccountModal({
  isOpen,
  onClose,
  onRequestDelete,
  onDeleted,
}: {
  isOpen: boolean;
  onClose: () => void;
  onRequestDelete: () => Promise<boolean>;
  onDeleted: () => void;
}) {
  const [confirmText, setConfirmText] = useState('');
  const [deleted, setDeleted] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canDelete = confirmText.trim() === DELETE_ACCOUNT_CONFIRM_PHRASE;

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setDeleted(false);
      setDeleting(false);
      setError(null);
      setConfirmText('');
    }
  }, [isOpen]);

  const handleConfirm = useCallback(async () => {
    if (!canDelete || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const success = await onRequestDelete();
      if (success) {
        setDeleted(true);
        setTimeout(() => {
          onClose();
          onDeleted();
        }, 2500);
      } else {
        setError('Something went wrong. Please try again or contact support.');
      }
    } catch {
      setError('Something went wrong. Please try again or contact support.');
    } finally {
      setDeleting(false);
    }
  }, [canDelete, deleting, onRequestDelete, onClose, onDeleted]);

  const handleClose = useCallback(() => {
    if (deleting) return;
    onClose();
    setConfirmText('');
    setError(null);
  }, [onClose, deleting]);

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="delete-account-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm"
            onClick={deleted ? undefined : handleClose}
            aria-hidden
          />
          <motion.div
            key="delete-account-dialog"
            initial={{ opacity: 0, scale: 0.96, x: '-50%', y: '-50%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.96, x: '-50%', y: '-50%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{
              position: 'fixed',
              left: '50%',
              top: '50%',
              zIndex: 111,
            }}
            className="pointer-events-auto flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-xl bg-primary-breath shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-modal-title"
          >
            {deleted ? (
              <div className="flex flex-1 flex-col overflow-y-auto px-6 pt-12 pb-8 text-center">
                <p
                  id="delete-account-modal-title"
                  className="font-heading text-xl font-normal text-primary-ink"
                >
                  Goodbyes are always difficult; your account has been deleted.
                </p>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={deleting}
                  className="absolute top-3 right-3 z-10 rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                  aria-label="Close"
                >
                  <X className="h-6 w-6" />
                </button>
                <div className="flex flex-1 flex-col overflow-y-auto px-6 pt-12 pb-8">
                  <h2
                    id="delete-account-modal-title"
                    className="font-heading text-xl font-normal text-primary-ink mb-2"
                  >
                    Oh, you&apos;re about to delete your account.
                  </h2>
                  <p className="text-slate-600 text-sm mb-6">
                    To delete your account, type below: <strong>Yes, delete account</strong>
                  </p>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={DELETE_ACCOUNT_CONFIRM_PHRASE}
                    disabled={deleting}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 mb-6 disabled:opacity-60"
                    aria-label="Confirmation phrase"
                  />
                  {error && (
                    <p className="text-red-600 text-sm mb-4" role="alert">
                      {error}
                    </p>
                  )}
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={handleConfirm}
                      disabled={!canDelete || deleting}
                      className="w-full rounded-full py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600 transition"
                    >
                      {deleting ? 'Deleting…' : 'Delete account'}
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={deleting}
                      className="w-full rounded-full border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-900 hover:border-slate-900 transition disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

/** Login or signup form view. Own component so hook count is independent. */
function MemberOffcanvasAuthContent({
  onClose,
  panelView,
  setPanelView,
}: {
  onClose: () => void;
  panelView: PanelView;
  setPanelView: (v: PanelView) => void;
}) {
  if (panelView === 'signup') {
    return (
      <MemberSignupForm compact onSuccess={onClose} onShowLogin={() => setPanelView('login')} />
    );
  }
  return <MemberLoginForm compact onSuccess={onClose} onClose={onClose} />;
}

/** Single hook (useAuth) then branch to account vs auth content. Avoids React #300 hooks order. */
function MemberOffcanvasContent({
  onClose,
  panelView,
  setPanelView,
  onLogoutRedirect,
  eventSignupIntent,
}: {
  onClose: () => void;
  panelView: PanelView;
  setPanelView: (v: PanelView) => void;
  onLogoutRedirect: () => void;
  eventSignupIntent: EventSignupIntent | null;
}) {
  const { user } = useAuth();
  if (panelView === 'event-signup' && eventSignupIntent) {
    return <EventSignupPanel intent={eventSignupIntent} onClose={onClose} />;
  }
  if (user) {
    return <MemberOffcanvasAccountContent onClose={onClose} onLogoutRedirect={onLogoutRedirect} />;
  }
  return (
    <MemberOffcanvasAuthContent
      onClose={onClose}
      panelView={panelView}
      setPanelView={setPanelView}
    />
  );
}

export const MemberLoginOffcanvasProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [panelView, setPanelView] = useState<PanelView>('login');
  const [greeting, setGreeting] = useState(pickRandomGreeting);
  const [eventSignupIntent, setEventSignupIntent] = useState<EventSignupIntent | null>(null);
  const { user } = useAuth();

  const openMemberLogin = useCallback(() => setOpen(true), []);
  const openEventSignup = useCallback((intent: EventSignupIntent) => {
    setEventSignupIntent(intent);
    setPanelView('event-signup');
    setOpen(true);
  }, []);
  const closeMemberLogin = useCallback(() => {
    setOpen(false);
    setPanelView('login');
    setEventSignupIntent(null);
  }, []);
  const onLogoutRedirect = useCallback(() => navigate('/'), [navigate]);

  useEffect(() => {
    if (open && !user) setGreeting(pickRandomGreeting());
  }, [open, user]);

  const title = user
    ? 'Account'
    : panelView === 'event-signup'
      ? 'Event signup'
      : panelView === 'signup'
        ? 'Create account'
        : greeting;

  return (
    <MemberLoginOffcanvasContext.Provider
      value={{ openMemberLogin, openEventSignup, closeMemberLogin }}
    >
      {children}
      <OffCanvas open={open} onClose={closeMemberLogin} title={title}>
        <MemberOffcanvasContent
          onClose={closeMemberLogin}
          panelView={panelView}
          setPanelView={setPanelView}
          onLogoutRedirect={onLogoutRedirect}
          eventSignupIntent={eventSignupIntent}
        />
      </OffCanvas>
    </MemberLoginOffcanvasContext.Provider>
  );
};
