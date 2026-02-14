/**
 * MembersSettingsPage.tsx
 * Route: /members/settings
 * Connected accounts: link/unlink Email and Discord for the current user.
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Mail, Unlink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAuthProviders } from '../../hooks/useAuthProviders';

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
    </svg>
  );
}

function providerLabel(identity: {
  provider: string;
  identity_data?: Record<string, unknown>;
}): string {
  if (identity.provider === 'discord') {
    const name =
      (identity.identity_data?.full_name as string) ??
      (identity.identity_data?.username as string) ??
      (identity.identity_data?.name as string);
    return name ? `Discord (${name})` : 'Discord';
  }
  if (identity.provider === 'email') {
    const email = identity.identity_data?.email as string;
    return email ? `Email (${email})` : 'Email';
  }
  return identity.provider;
}

export const MembersSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { status, user, refreshProfile } = useAuth();
  const { loading, error, linkDiscord, unlinkProvider, canUnlink, identities } = useAuthProviders();

  const [unlinkConfirm, setUnlinkConfirm] = useState<{ id: string; provider: string } | null>(null);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [discordLoading, setDiscordLoading] = useState(false);
  const [discordSuccess, setDiscordSuccess] = useState<string | null>(null);
  const [discordError, setDiscordError] = useState<string | null>(null);

  const hasDiscord = identities.some((i) => i.provider === 'discord');
  const hasEmail = identities.some((i) => i.provider === 'email');

  React.useEffect(() => {
    if (status === 'loading') return;
    if (!user && typeof window !== 'undefined') {
      navigate('/login/member', { replace: true, state: { from: '/members/settings' } });
    }
  }, [status, user, navigate]);

  // After returning from Discord OAuth (or any link), refresh session and sync auth_providers
  React.useEffect(() => {
    if (user) refreshProfile();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- only on mount / user id change

  const handleLinkDiscord = async () => {
    setDiscordLoading(true);
    setDiscordSuccess(null);
    setDiscordError(null);
    const result = await linkDiscord();
    setDiscordLoading(false);
    if (result.error) {
      setDiscordError(result.error);
    } else {
      setDiscordSuccess('Discord account linked successfully!');
    }
  };

  const handleUnlink = async () => {
    if (!unlinkConfirm) return;
    setUnlinkLoading(true);
    const result = await unlinkProvider(unlinkConfirm);
    setUnlinkLoading(false);
    if (!result.error) setUnlinkConfirm(null);
  };

  if (status === 'loading') {
    return (
      <main className="bg-white dark:bg-slate-900 min-h-screen pt-32 md:pt-40 pb-40">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-slate-600 dark:text-slate-400">Loading…</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen pt-32 md:pt-40 pb-40 selection:bg-[#f9f100] selection:text-black bg-primary-breath dark:bg-slate-900">
      <div className="max-w-2xl mx-auto px-6">
        <Link
          to="/members"
          className="inline-flex items-center gap-2 text-sm font-medium text-secondary-purple-rain dark:text-slate-300 hover:underline mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Members area
        </Link>

        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-4xl font-light font-heading-thin tracking-normal text-secondary-purple-rain dark:text-slate-100">
            Account & security
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm md:text-base">
            Manage how you sign in. You can connect both email and Discord to the same account.
          </p>
        </motion.header>

        <section className="space-y-6">
          <h2 className="text-xl font-medium text-primary-ink dark:text-slate-200">
            Connected accounts
          </h2>

          {error && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>Loading…</span>
            </div>
          ) : (
            <ul className="space-y-3">
              {identities.map((identity) => (
                <li
                  key={identity.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    {identity.provider === 'discord' ? (
                      <DiscordIcon className="w-5 h-5 text-[#5865F2]" />
                    ) : (
                      <Mail className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    )}
                    <span className="text-primary-ink dark:text-slate-200 font-medium">
                      {providerLabel(identity)}
                    </span>
                  </div>
                  {unlinkConfirm?.id === identity.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Unlink?</span>
                      <button
                        type="button"
                        onClick={handleUnlink}
                        disabled={unlinkLoading || !canUnlink}
                        className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {unlinkLoading ? '…' : 'Yes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setUnlinkConfirm(null)}
                        className="rounded-full border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setUnlinkConfirm({ id: identity.id, provider: identity.provider })
                      }
                      disabled={!canUnlink}
                      title={!canUnlink ? 'Keep at least one login method' : 'Unlink this account'}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      Unlink
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Add another way to sign in to this account:
            </p>
            {!hasDiscord && (
              <>
                <button
                  type="button"
                  onClick={handleLinkDiscord}
                  disabled={discordLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#5865F2] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4752C4] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {discordLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting…
                    </>
                  ) : (
                    <>
                      <DiscordIcon className="w-5 h-5" />
                      Connect Discord
                    </>
                  )}
                </button>
                {/* Explanation under the button */}
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  Link your Discord account to unlock member-only Discord features, even if your emails differ. This lets you access exclusive channels and sync your membership status with Discord.
                </p>
                {discordError && (
                  <div className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {discordError}
                  </div>
                )}
                {discordSuccess && (
                  <div className="mt-2 rounded border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
                    {discordSuccess}
                  </div>
                )}
              </>
            )}
            {hasDiscord && (
              <div className="flex items-center gap-3 mt-2">
                {/* Show Discord username and avatar if available */}
                {(() => {
                  const discordIdentity = identities.find((i) => i.provider === 'discord');
                  const avatar = discordIdentity?.identity_data?.avatar_url || discordIdentity?.identity_data?.picture;
                  const name = discordIdentity?.identity_data?.full_name || discordIdentity?.identity_data?.username || discordIdentity?.identity_data?.name;
                  return (
                    <>
                      {avatar && (
                        <img src={avatar as string} alt="Discord avatar" className="w-7 h-7 rounded-full border border-slate-300 dark:border-slate-600" />
                      )}
                      <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">
                        {name ? `Connected as ${name}` : 'Discord connected'}
                      </span>
                    </>
                  );
                })()}
              </div>
            )}
            {hasDiscord && hasEmail && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Email and Discord are both connected. You can unlink one above if needed.
              </p>
            )}
          </div>
        </section>

        <p className="mt-10 text-xs text-slate-500 dark:text-slate-400">
          If you link a provider that is already used by another account, you’ll see an error. Each
          Discord or email can only be linked to one account.
        </p>
      </div>
    </main>
  );
};
