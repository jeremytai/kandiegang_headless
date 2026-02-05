import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const MemberLoginPage: React.FC = () => {
  const { login, signInWithMagicLink, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const from = (location.state as { from?: string } | null)?.from || '/members';

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
    navigate(from, { replace: true });
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
      <main className="px-4 pb-16 pt-32 md:px-8 md:pb-24 md:pt-40">
        <div className="mx-auto max-w-xl">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Check your email
          </h1>
          <p className="text-slate-600 mb-6 max-w-prose">
            We sent a login link to <strong>{email}</strong>. Click the link to sign in; you&apos;ll be taken straight to the members area. The link expires in about an hour.
          </p>
          <p className="text-sm text-slate-500">
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
      </main>
    );
  }

  return (
    <main className="px-4 pb-16 pt-32 md:px-8 md:pb-24 md:pt-40">
      <div className="mx-auto max-w-xl">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
          Members login
        </h1>
        <p className="text-slate-600 mb-8 max-w-prose">
          Welcome back to Kandie Gang. Log in with your password or get a passwordless link by email.
        </p>

        <form onSubmit={handlePasswordSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-800 mb-1">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-800 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
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
              className="inline-flex items-center justify-center rounded-full bg-black px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting || status === 'loading' ? 'Logging in…' : 'Log in with password'}
            </button>
            <p className="text-center text-sm text-slate-500">or</p>
            <button
              type="button"
              onClick={handleMagicLink}
              disabled={isSubmitting || status === 'loading' || !email.trim()}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Email me a login link
            </button>
          </div>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-medium text-black underline hover:no-underline">
            Create one
          </Link>
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Forgot your password? Use &quot;Email me a login link&quot; above or the reset link from our emails.
        </p>
      </div>
    </main>
  );
};

