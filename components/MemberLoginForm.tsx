/**
 * MemberLoginForm.tsx
 * Reusable members login: password or magic link.
 * Used on the full MemberLoginPage and inside OffCanvas on the event page.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export interface MemberLoginFormProps {
  /** Called after successful password login (e.g. close sidebar and navigate). */
  onSuccess?: () => void;
  /** Tighter layout for sidebar/embed use. */
  compact?: boolean;
}

const inputClass =
  'block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-black focus:ring-1 focus:ring-black';
const labelClass = 'block text-sm font-medium text-slate-800 mb-1';
const btnPrimary =
  'inline-flex items-center justify-center rounded-full bg-black px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-400';
const btnSecondary =
  'inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-900 disabled:cursor-not-allowed disabled:opacity-50';

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export const MemberLoginForm: React.FC<MemberLoginFormProps> = ({
  onSuccess,
  compact = false,
}) => {
  const { login, signInWithMagicLink, signInWithDiscord, status } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMagicLinkSent(false);
    setIsSubmitting(true);
    const { error: loginError } = await login(email, password);
    setIsSubmitting(false);
    if (loginError) {
      setError(loginError);
      return;
    }
    onSuccess?.();
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
        <h2 className={compact ? 'text-xl font-bold text-primary-ink' : 'text-2xl font-bold text-primary-ink'}>
          Check your email
        </h2>
        <p className="text-slate-600 text-sm">
          We sent a login link to <strong>{email}</strong>. Click the link to sign in; you&apos;ll be taken straight to the members area. The link expires in about an hour.
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
          Welcome back to Kandie Gang. Log in with your password or get a passwordless link by email.
        </p>
      )}

      <div className="flex flex-col gap-3">
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
        <p className="text-center text-sm text-slate-500">or</p>
      </div>

      <form onSubmit={handlePasswordSubmit} className="space-y-4">
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

        <div>
          <label htmlFor="member-login-password" className={labelClass}>
            Password
          </label>
          <input
            id="member-login-password"
            type="password"
            autoComplete="current-password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">Leave blank to use the email link instead.</p>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="submit"
            disabled={isSubmitting || status === 'loading'}
            className={btnPrimary}
          >
            {isSubmitting || status === 'loading' ? 'Logging in…' : 'Log in with password'}
          </button>
          <p className="text-center text-sm text-slate-500">or</p>
          <button
            type="button"
            onClick={handleMagicLink}
            disabled={isSubmitting || status === 'loading' || !email.trim()}
            className={btnSecondary}
          >
            Email me a login link
          </button>
        </div>
      </form>

      <p className="text-sm text-slate-600">
        Don&apos;t have an account?{' '}
        <Link to="/signup" className="font-medium text-black underline hover:no-underline">
          Create one
        </Link>
      </p>
      {!compact && (
        <p className="text-xs text-slate-500">
          Forgot your password? Use &quot;Email me a login link&quot; above or the reset link from our emails.
        </p>
      )}
    </div>
  );
};
