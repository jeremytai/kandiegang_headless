import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const MembersAreaPage: React.FC = () => {
  const { status, user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!user) {
      navigate('/login/member', { replace: true, state: { from: '/members' } });
    }
  }, [status, user, navigate]);

  // Refetch profile when landing on /members so manual DB updates (e.g. is_member) are reflected
  useEffect(() => {
    if (user) refreshProfile();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- only refetch when user identity changes; refreshProfile is stable

  const handleRefreshMembership = async () => {
    setIsRefreshing(true);
    await refreshProfile();
    setIsRefreshing(false);
  };

  if (status === 'loading') {
    return (
      <main className="px-4 pb-16 pt-32 md:px-8 md:pb-24 md:pt-40">
        <div className="mx-auto max-w-xl">
          <p className="text-slate-600">Checking your membership…</p>
        </div>
      </main>
    );
  }

  if (!user) {
    // Redirect effect above will handle navigation; render minimal fallback.
    return null;
  }

  const isMember = Boolean(profile?.is_member);

  return (
    <main className="px-4 pb-16 pt-32 md:px-8 md:pb-24 md:pt-40">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">
            Members
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Welcome back, {profile?.display_name || user.email || 'Kandie rider'}.
          </h1>
        </header>

        {isMember ? (
          <section className="space-y-4">
            <p className="text-slate-700 max-w-prose">
              This is your home base for member-only rides, notes and future perks.
              We&apos;re still moving things over from our old system, so expect this space
              to grow over the next weeks.
            </p>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-700 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold">Membership status</p>
                <p>
                  Active ·{' '}
                  <span className="text-slate-500">
                    synced from {profile?.membership_source || 'WordPress'}.
                  </span>
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  to="/community"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-900 hover:border-slate-900"
                >
                  Community
                </Link>
                <Link
                  to="/stories"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-900 hover:border-slate-900"
                >
                  Ride reports
                </Link>
              </div>
            </div>

            <section className="mt-6 space-y-3">
              <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                What&apos;s coming here soon
              </h2>
              <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                <li>Private ride notes and member-only route drops.</li>
                <li>Season planning, waitlist priorities and recap material.</li>
                <li>Deeper integration with the shop and your orders.</li>
              </ul>
            </section>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              <p className="font-semibold mb-1">You&apos;re almost there.</p>
              <p className="mb-1">
                You&apos;re logged in, but we couldn&apos;t find an active membership connected
                to this email yet.
              </p>
              <p>
                If you&apos;re already a Kandie Gang member via our old system, reach out
                so we can link your account. Otherwise, keep an eye on our channels for
                the next membership window.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleRefreshMembership}
                disabled={isRefreshing}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-900 disabled:opacity-50"
              >
                {isRefreshing ? 'Refreshing…' : 'Refresh membership status'}
              </button>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-full bg-black px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900"
              >
                Contact us about membership
              </Link>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              If you just set yourself as a member in Supabase, click Refresh to load the latest status.
            </p>
          </section>
        )}
      </div>
    </main>
  );
};

