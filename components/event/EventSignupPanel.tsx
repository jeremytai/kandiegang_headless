import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';

export type EventSignupIntent = {
  eventId: string;
  eventTitle: string;
  levelKey: string;
  levelLabel: string;
  eventType?: string;
  accessNote?: string;
  requiresFlintaAttestation: boolean;
};

export interface EventSignupPanelProps {
  intent: EventSignupIntent;
  onClose: () => void;
}

const inputClass =
  'block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-black focus:ring-1 focus:ring-black';
const labelClass = 'block text-sm font-medium text-slate-800 mb-1';
const btnPrimary =
  'inline-flex items-center justify-center rounded-full bg-black px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-400';

const EVENT_SIGNUP_STORAGE_KEY = 'eventSignupIntent';

function buildReturnUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const url = new URL(window.location.href);
  url.searchParams.set('eventSignup', '1');
  return url.toString();
}

function storeIntent(intent: EventSignupIntent): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(EVENT_SIGNUP_STORAGE_KEY, JSON.stringify(intent));
  } catch {
    // Ignore storage failures (private mode, etc.).
  }
}

export const EventSignupPanel: React.FC<EventSignupPanelProps> = ({ intent, onClose }) => {
  const { user, profile, signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [flintaAttested, setFlintaAttested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);

  const isMember = Boolean(profile?.is_member);
  const needsFlintaAttestation = intent.requiresFlintaAttestation;
  const canSubmit = !needsFlintaAttestation || flintaAttested;

  const levelSummary = useMemo(
    () => `${intent.eventTitle} · ${intent.levelLabel}`,
    [intent.eventTitle, intent.levelLabel]
  );

  const handleSendMagicLink = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }
    if (!canSubmit) {
      setError('Please confirm the FLINTA self-attestation.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    storeIntent({ ...intent, requiresFlintaAttestation: needsFlintaAttestation });
    const { error: magicError } = await signInWithMagicLink(email.trim(), buildReturnUrl());
    setIsSubmitting(false);
    if (magicError) {
      setError(magicError);
      return;
    }
    setMagicLinkSent(true);
  };

  const handleConfirmSignup = async () => {
    if (!canSubmit) {
      setError('Please confirm the FLINTA self-attestation.');
      return;
    }
    if (!supabase) {
      setError('Signup is not configured yet. Please try again later.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        setError('Please log in again to complete signup.');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('/api/event-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          eventId: intent.eventId,
          eventTitle: intent.eventTitle,
          rideLevel: intent.levelKey,
          eventType: intent.eventType,
          flintaAttested,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 409) {
          setError('That level is sold out. Please choose another level or check back later.');
        } else {
          setError(data?.error || 'Unable to complete signup. Please try again.');
        }
        setIsSubmitting(false);
        return;
      }
      if (data?.waitlisted) {
        setWaitlisted(true);
      } else {
        setSignupComplete(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to complete signup.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (waitlisted) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-primary-ink">You are on the waitlist</h2>
        <p className="text-sm text-slate-600">
          We have added you to the waitlist for <strong>{levelSummary}</strong>. If a spot opens up, we will email you right away.
        </p>
        <button type="button" onClick={onClose} className={btnPrimary}>
          Close
        </button>
      </div>
    );
  }

  if (signupComplete) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-primary-ink">You are in!</h2>
        <p className="text-sm text-slate-600">
          We have saved your spot for <strong>{levelSummary}</strong>. You will receive a confirmation email shortly.
        </p>
        <button type="button" onClick={onClose} className={btnPrimary}>
          Close
        </button>
      </div>
    );
  }

  if (!user) {
    if (magicLinkSent) {
      return (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-primary-ink">Check your email</h2>
          <p className="text-sm text-slate-600">
            We sent a signup link to <strong>{email}</strong>. Open it to finish registering for <strong>{levelSummary}</strong>.
          </p>
          <p className="text-xs text-slate-500">
            The link expires in about an hour. If you do not see it, check spam or try again.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-primary-ink">Sign up for this event</h2>
          <p className="text-sm text-slate-600">{levelSummary}</p>
          {intent.accessNote && (
            <p className="text-xs text-slate-500 mt-2">{intent.accessNote}</p>
          )}
        </div>

        <form onSubmit={handleSendMagicLink} className="space-y-4">
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
              <span>I identify as FLINTA and understand this early access window is for FLINTA riders.</span>
            </label>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting || !email.trim() || !canSubmit}
            className={btnPrimary}
          >
            {isSubmitting ? 'Sending…' : 'Email me a signup link'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-primary-ink">Confirm your spot</h2>
        <p className="text-sm text-slate-600">{levelSummary}</p>
        {intent.accessNote && (
          <p className="text-xs text-slate-500 mt-2">{intent.accessNote}</p>
        )}
      </div>

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
          <span>I identify as FLINTA and understand this early access window is for FLINTA riders.</span>
        </label>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleConfirmSignup}
        disabled={isSubmitting || !canSubmit}
        className={btnPrimary}
      >
        {isSubmitting ? 'Submitting…' : 'Confirm signup'}
      </button>
    </div>
  );
};

export { EVENT_SIGNUP_STORAGE_KEY };