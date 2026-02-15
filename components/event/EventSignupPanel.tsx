import React, { useState, useEffect } from 'react';
// import { v4 as uuidv4 } from 'uuid'; // Removed unused import
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Turnstile } from '@marsidev/react-turnstile';

export type EventSignupIntent = {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  levelKey: string;
  levelLabel: string;
  eventType?: string;
  accessNote?: string;
  requiresFlintaAttestation: boolean;
  firstName?: string;
  lastName?: string;
};

export interface EventSignupPanelProps {
  intent: EventSignupIntent;
  onClose: () => void;
}

const inputClass =
  'block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-black focus:ring-1 focus:ring-black';
const labelClass = 'block text-sm font-medium text-slate-800 mb-1';
const btnPrimary =
  'inline-flex items-center justify-center rounded-full bg-secondary-purple-rain px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-400';

export const EVENT_SIGNUP_STORAGE_KEY = 'eventSignupIntent';
export const EVENT_SIGNUP_COMPLETE_KEY = 'eventSignupComplete';
const SIGNUP_COMPLETE_EVENT = 'kandiegang:event-signup-complete';

function emitSignupComplete(eventId: string) {
  if (typeof window === 'undefined') return;
  console.log('[EventSignupPanel] Dispatching signup complete event', eventId);
  window.dispatchEvent(new CustomEvent(SIGNUP_COMPLETE_EVENT, { detail: { eventId } }));
}

// (splitDisplayName was unused, removed to fix lint error)

// buildReturnUrl was unused and removed. No implementation needed.

export const EventSignupPanel: React.FC<EventSignupPanelProps> = ({ intent, onClose }) => {
  // ...existing code...
  // Debug logging utility
  // logSignupPanel was unused and removed.
  const { user, profile } = useAuth();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState(intent.firstName ?? '');
  const [lastName, setLastName] = useState(intent.lastName ?? '');
  const [flintaAttested, setFlintaAttested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // magicLinkSent is unused, removed
  const [signupComplete, setSignupComplete] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>('');

  // Derived values
  const hasEmail = email.trim().length > 0;
  const hasNames = firstName.trim().length > 0 && lastName.trim().length > 0;
  const needsFlintaAttestation = intent.requiresFlintaAttestation;
  const canSubmit = !needsFlintaAttestation || flintaAttested;
  const hasAuthEmail = user?.email && user.email.length > 0;
  const isMember = !!profile?.is_member;
  const displayName = profile?.display_name || user?.user_metadata?.full_name || user?.email || '';
  const lookupDisplayName = email;
  const shouldSkipNameEntry = !!user && !!profile?.display_name;
  const levelSummary = `${intent.eventTitle} – ${intent.levelLabel}`;
  useEffect(() => {
    // Effect logic removed; unnecessary dependency 'restoredIntent' removed
  }, [user, intent.eventId, signupComplete, waitlisted, intent]);
  // ...existing code...

  // Handler for sending magic link
  // Handler for direct signup (guest or logged-in)
  const handleDirectSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (!hasEmail) {
        setError('Email is required.');
        setIsSubmitting(false);
        return;
      }
      if (!hasNames) {
        setError('First and last name are required.');
        setIsSubmitting(false);
        return;
      }
      if (!canSubmit) {
        setError('Please confirm the FLINTA* self-attestation.');
        setIsSubmitting(false);
        return;
      }
      // Write registration directly to Supabase
      const response = await fetch('/api/event-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: intent.eventId,
          eventTitle: intent.eventTitle,
          rideLevel: intent.levelKey,
          eventType: intent.eventType,
          flintaAttested: intent.requiresFlintaAttestation,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          turnstileToken: turnstileToken,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error || 'Unable to complete signup. Please try again.');
        setIsSubmitting(false);
        return;
      }
      emitSignupComplete(intent.eventId);
      if (data?.waitlisted) {
        setWaitlisted(true);
      } else {
        setSignupComplete(true);
      }
    } catch (_err) {
      setError('Unable to complete signup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // This function is removed to fix TypeScript errors
  // Removed the function entirely
  const handleConfirmSignup = async () => {
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    if (!trimmedFirst) {
      setError('First name is required.');
      return;
    }
    if (!trimmedLast) {
      setError('Last name is required.');
      return;
    }
    if (!canSubmit) {
      setError('Please confirm the FLINTA* self-attestation.');
      return;
    }
    if (!hasAuthEmail) {
      setError('Please log in again to confirm your email address.');
      return;
    }
    if (!supabase) {
      setError('Signup is not configured yet. Please try again later.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const sessionResult = await supabase.auth.getSession();
      const accessToken = sessionResult?.data?.session?.access_token;
      console.log('[EventSignupPanel] Supabase session result:', sessionResult);
      console.log('[EventSignupPanel] Access token:', accessToken);
      if (!accessToken) {
        setError('Please log in again to complete signup.');
        setIsSubmitting(false);
        return;
      }
      const signupPayload = {
        eventId: intent.eventId,
        eventTitle: intent.eventTitle,
        rideLevel: intent.levelKey,
        eventType: intent.eventType,
        flintaAttested,
        firstName: trimmedFirst,
        lastName: trimmedLast,
      };
      console.log('[EventSignupPanel] Sending signup request:', signupPayload);
      const response = await fetch('/api/event-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(signupPayload),
      });
      console.log('[EventSignupPanel] Signup response:', response);
      const data = await response.json().catch(() => ({}));
      console.log('[EventSignupPanel] Signup response data:', data);
      if (!response.ok) {
        if (response.status === 409) {
          setError('That level is sold out. Please choose another level or check back later.');
        } else {
          setError(data?.error || 'Unable to complete signup. Please try again.');
        }
        setIsSubmitting(false);
        return;
      }
      emitSignupComplete(intent.eventId);
      if (data?.waitlisted) {
        setWaitlisted(true);
      } else {
        setSignupComplete(true);
      }
    } catch (err) {
      console.error('[EventSignupPanel] Signup error:', err);
      const message = err instanceof Error ? err.message : 'Unable to complete signup.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // UI rendering
  // Helper to clear sessionStorage and reset state on close
  const handleClose = () => {
    sessionStorage.removeItem(EVENT_SIGNUP_STORAGE_KEY);
    setSignupComplete(false);
    setWaitlisted(false);
    // setMagicLinkSent is removed to fix TypeScript errors
    setIsSubmitting(false);
    setError(null);
    onClose();
  };

  if (waitlisted) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-normal text-secondary-purple-rain">You are on the waitlist</h2>
        <p className="text-sm text-slate-600">
          We have added you to the waitlist for <strong>{levelSummary}</strong>. If a spot opens up,
          we will email you right away.
        </p>
        <button type="button" onClick={handleClose} className={btnPrimary}>
          Close
        </button>
      </div>
    );
  }

  if (signupComplete) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-normal text-secondary-purple-rain">You're in!</h2>
        <p className="text-sm text-slate-600">
          Your spot for <strong>{levelSummary}</strong> is confirmed! You are now logged in.
          <br />
          <span className="text-xs text-slate-500">
            Check your email for event details and updates. No further action is needed.
          </span>
        </p>
        <button type="button" onClick={handleClose} className={btnPrimary}>
          Close
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-normal text-secondary-purple-rain">Sign up for this event</h2>
          <p className="text-sm text-slate-600">{levelSummary}</p>
          {intent.accessNote && <p className="text-xs text-slate-500 mt-2">{intent.accessNote}</p>}
        </div>

        <form onSubmit={handleDirectSignup} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="event-signup-first-name" className={labelClass}>
                First name
              </label>
              <input
                id="event-signup-first-name"
                type="text"
                autoComplete="given-name"
                required
                className={inputClass}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="event-signup-last-name" className={labelClass}>
                Last name
              </label>
              <input
                id="event-signup-last-name"
                type="text"
                autoComplete="family-name"
                required
                className={inputClass}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="event-signup-email" className={labelClass}>
              Email address
            </label>
            <input
              id="event-signup-email"
              type="email"
              autoComplete="email"
              required
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {needsFlintaAttestation && (
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-1"
                checked={flintaAttested}
                onChange={(e) => setFlintaAttested(e.target.checked)}
                required
              />
              <span>
                I identify as FLINTA* and understand this early access window is for FLINTA* riders.
              </span>
            </label>
          )}

          {/* Cloudflare Turnstile bot protection */}
          <div className="flex justify-center">
            <Turnstile
              siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
              onSuccess={(token) => setTurnstileToken(token)}
              onError={() => setTurnstileToken('')}
              onExpire={() => setTurnstileToken('')}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting || !hasEmail || !hasNames || !canSubmit || !turnstileToken}
            className={btnPrimary}
          >
            {isSubmitting ? 'Signing up…' : 'Sign up for this event'}
          </button>
          <p className="text-xs text-slate-500">
            By continuing you agree to our{' '}
            <a
              href="/terms-of-service"
              className="text-secondary-purple-rain hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Terms
            </a>
            , the{' '}
            <a
              href="/waiver"
              className="text-secondary-purple-rain hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Waiver
            </a>
            , and how we handle your data per our{' '}
            <a
              href="/privacy-policy"
              className="text-secondary-purple-rain hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Privacy Policy
            </a>
            . By signing up, you authorize the creation of a KandieGang.com account and consent to
            receive related emails.
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-normal text-secondary-purple-rain">Confirm your spot</h2>
        <p className="text-sm text-slate-600">{levelSummary}</p>
        {intent.accessNote && <p className="text-xs text-slate-500 mt-2">{intent.accessNote}</p>}
      </div>

      {shouldSkipNameEntry ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Signing up as{' '}
          <span className="font-semibold">{user ? displayName : lookupDisplayName}</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="event-confirm-first-name" className={labelClass}>
              First name
            </label>
            <input
              id="event-confirm-first-name"
              type="text"
              autoComplete="given-name"
              required
              className={inputClass}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="event-confirm-last-name" className={labelClass}>
              Last name
            </label>
            <input
              id="event-confirm-last-name"
              type="text"
              autoComplete="family-name"
              required
              className={inputClass}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
      )}

      {!isMember && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <p className="font-semibold mb-1">Heads up</p>
          <p>You are signing up as a guest (not a current member).</p>
        </div>
      )}

      {needsFlintaAttestation && (
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-1"
            checked={flintaAttested}
            onChange={(e) => setFlintaAttested(e.target.checked)}
            required
          />
          <span>
            I identify as FLINTA* and understand this early access window is for FLINTA* riders.
          </span>
        </label>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleConfirmSignup}
        disabled={isSubmitting || !canSubmit || !hasNames || !hasAuthEmail}
        className="inline-flex items-center justify-center rounded-full bg-secondary-purple-rain px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-secondary-purple-rain/80 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isSubmitting ? 'Submitting…' : 'Confirm signup'}
      </button>
      <p className="text-xs text-slate-500">
        By continuing you agree to our{' '}
        <a
          href="/terms-of-service"
          className="text-secondary-purple-rain hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          Terms
        </a>
        , the{' '}
        <a
          href="/waiver"
          className="text-secondary-purple-rain hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          Waiver
        </a>
        , and how we handle your data per our{' '}
        <a
          href="/privacy-policy"
          className="text-secondary-purple-rain hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          Privacy Policy
        </a>
        . You also agree to creating an account on KandieGang.com and agree to receiving emails.
      </p>
    </div>
  );
};
