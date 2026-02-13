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
import { OffCanvas } from '../components/OffCanvas';
import { useContactModal } from './ContactModalContext';
import { MemberLoginForm } from '../components/MemberLoginForm';
import { MemberSignupForm } from '../components/MemberSignupForm';
import { EventSignupPanel, type EventSignupIntent } from '../components/event/EventSignupPanel';
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
  'Hey Beautiful 👋!',        // English
  '¡Hola, guapa 👋!',         // Spanish
  'Salut belle 👋!',         // French
  'Ciao bella 👋!',           // Italian
  'Hey Schöne 👋!',           // German
  'Oi linda 👋!',             // Portuguese
];

function pickRandomGreeting(): string {
  return LOGIN_GREETINGS[Math.floor(Math.random() * LOGIN_GREETINGS.length)];
}

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

  const memberSinceFormatted = formatMemberSince(profile?.member_since ?? null);
  const daysLeft = getDaysLeft(profile?.membership_expiration ?? null);
  const showCyclingMember = isCyclingMember(profile?.membership_plans);
  const showGuide = Boolean(profile?.is_guide) || isGuideFromPlans(profile?.membership_plans);
  const hasRolePills = showCyclingMember || showGuide;
  const isMember = Boolean(profile?.is_member);

  if (!user) return null;

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
          <span
            className={
              daysLeft != null && daysLeft > 0 && daysLeft < 30
                ? 'font-bold text-red-600'
                : 'font-light'
            }
          >
            {daysLeft != null
              ? daysLeft > 0
                ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left on membership`
                : daysLeft === 0
                  ? 'Membership expires today'
                  : 'Membership expired'
              : '—'}
          </span>
          {profile?.membership_source && (
            <span className="font-light">
              {' '}
              · synced from {profile.membership_source}
            </span>
          )}
        </p>
      </div>

      {!isMember && (
        <div className="space-y-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            <p className="font-semibold mb-1">You&apos;re almost there.</p>
            <p className="mb-1">
              We couldn&apos;t find an active membership for this account. We checked our current system (and WordPress) for the email you signed in with.
            </p>
            <p>
              If you&apos;re already a Kandie Gang member from our previous setup,{' '}
              <button
                type="button"
                onClick={() => { onClose(); openContactModal(); }}
                className="font-semibold underline"
              >
                reach out
              </button>
              {' '}and we&apos;ll link your account. Otherwise, keep an eye on our channels for the next membership window.
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
            <button
              type="button"
              onClick={() => { onClose(); openContactModal(); }}
              className="inline-flex items-center justify-center rounded-full bg-black px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900"
            >
              Contact us about membership
            </button>
          </div>
        </div>
      )}

      {daysLeft != null && daysLeft < 30 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <p className="font-medium mb-2">
            Renew your membership today to extend your Kandie Gang benefits and continued support of the club.
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
          const { data: { session } } = await supabase.auth.getSession();
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
                <p id="delete-account-modal-title" className="font-heading text-xl font-normal text-primary-ink">
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
                  <h2 id="delete-account-modal-title" className="font-heading text-xl font-normal text-primary-ink mb-2">
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
      <MemberSignupForm
        compact
        onSuccess={onClose}
        onShowLogin={() => setPanelView('login')}
      />
    );
  }
  return (
    <MemberLoginForm
      compact
      onSuccess={onClose}
      onClose={onClose}
    />
  );
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
    return (
      <EventSignupPanel
        intent={eventSignupIntent}
        onClose={onClose}
      />
    );
  }
  if (user) {
    return (
      <MemberOffcanvasAccountContent onClose={onClose} onLogoutRedirect={onLogoutRedirect} />
    );
  }
  return (
    <MemberOffcanvasAuthContent
      onClose={onClose}
      panelView={panelView}
      setPanelView={setPanelView}
    />
  );
}

export const MemberLoginOffcanvasProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
    <MemberLoginOffcanvasContext.Provider value={{ openMemberLogin, openEventSignup, closeMemberLogin }}>
      {children}
      <OffCanvas
        open={open}
        onClose={closeMemberLogin}
        title={title}
      >
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
