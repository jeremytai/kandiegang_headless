import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const SignUpPage: React.FC = () => {
  const { signUp, status } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNeedsEmailConfirmation(false);
    setIsSubmitting(true);
    const result = await signUp(email, password, {
      displayName: displayName.trim() || undefined,
    });
    setIsSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.needsEmailConfirmation) {
      setNeedsEmailConfirmation(true);
      return;
    }
    navigate('/members', { replace: true });
  };

  if (needsEmailConfirmation) {
    return (
      <main className="px-4 pb-16 pt-32 md:px-8 md:pb-24 md:pt-40">
        <div className="mx-auto max-w-xl">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Check your email
          </h1>
          <p className="text-slate-600 mb-6 max-w-prose">
            We sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account, then log in below.
          </p>
          <Link
            to="/login/member"
            className="inline-flex items-center justify-center rounded-full bg-black px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900"
          >
            Log in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 pb-16 pt-32 md:px-8 md:pb-24 md:pt-40">
      <div className="mx-auto max-w-xl">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
          Create account
        </h1>
        <p className="text-slate-600 mb-8 max-w-prose">
          Sign up to get a Kandie Gang account. After logging in, we can link your membership if you&apos;re already a member.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
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
            <label htmlFor="displayName" className="block text-sm font-medium text-slate-800 mb-1">
              Display name <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="displayName"
              type="text"
              autoComplete="name"
              className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How we should call you"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-800 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">At least 6 characters.</p>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || status === 'loading'}
            className="inline-flex items-center justify-center rounded-full bg-black px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting || status === 'loading' ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login/member" className="font-medium text-black underline hover:no-underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
};
