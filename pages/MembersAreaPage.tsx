import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getCategoryPosts, transformMediaUrl, type WPPost } from '../lib/wordpress';
import { Loader2 } from 'lucide-react';
import { AnimatedHeadline } from '../components/AnimatedHeadline';

/** WordPress category slug for members-only posts (Photo Gallery). */
const MEMBERS_ONLY_CATEGORY_SLUG = 'photo-gallery';
const MEMBERS_ONLY_POSTS_FIRST = 20;

/** Greetings in obscure languages (all mean "hello"). One is chosen at random per page load. */
const HELLO_GREETINGS = [
  'Shwmae',      // Welsh
  'Kaixo',       // Basque
  'Aluu',        // Greenlandic
  'Yá\'át\'ééh', // Navajo
  'Kia ora',     // Māori
  'Demat',       // Breton
  'Bures',       // Northern Sami
];

function isCyclingMember(plans: string[] | null | undefined): boolean {
  if (!Array.isArray(plans)) return false;
  const lower = plans.map((p) => p.toLowerCase());
  return lower.some(
    (p) =>
      (p.includes('cycling') && (p.includes('member') || p.includes('membership'))) ||
      p === 'kandie gang cycling club membership'
  );
}

function isGuideFromPlans(plans: string[] | null | undefined): boolean {
  if (!Array.isArray(plans)) return false;
  return plans.some((p) => p.toLowerCase().includes('guide'));
}

export const MembersAreaPage: React.FC = () => {
  const { status, user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [initialMembershipCheckDone, setInitialMembershipCheckDone] = useState(false);
  const [membersOnlyPosts, setMembersOnlyPosts] = useState<WPPost[]>([]);
  const [membersOnlyLoading, setMembersOnlyLoading] = useState(false);
  const [membersOnlyError, setMembersOnlyError] = useState<string | null>(null);
  const [greeting] = useState(
    () => HELLO_GREETINGS[Math.floor(Math.random() * HELLO_GREETINGS.length)]
  );

  const guide = Boolean(profile?.is_guide) || isGuideFromPlans(profile?.membership_plans);
  const canSeeMembersOnlyPosts =
    isCyclingMember(profile?.membership_plans) || guide;

  const cyclingMember = isCyclingMember(profile?.membership_plans);
  const memberKindLabel =
    cyclingMember ? 'Kandie Gang Cycling Member'
    : guide ? 'Kandie Gang Guide'
    : 'Member';
  const secondMemberKindLabel = cyclingMember && guide ? 'Kandie Gang Guide' : null;

  useEffect(() => {
    if (status === 'loading') return;
    if (!user && typeof window !== 'undefined' && sessionStorage.getItem('logoutRedirecting') !== '1') {
      navigate('/login/member', { replace: true, state: { from: '/members' } });
    }
  }, [status, user, navigate]);

  // Run membership sync (WordPress bridge) on mount and wait before showing "no membership"
  useEffect(() => {
    if (!user?.id) return;
    setInitialMembershipCheckDone(false);
    let cancelled = false;
    refreshProfile().finally(() => {
      if (!cancelled) setInitialMembershipCheckDone(true);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, refreshProfile]);

  // Fetch members-only posts when user is eligible (cycling member or guide)
  useEffect(() => {
    if (!canSeeMembersOnlyPosts) return;
    let cancelled = false;
    setMembersOnlyLoading(true);
    setMembersOnlyError(null);
    getCategoryPosts(MEMBERS_ONLY_CATEGORY_SLUG, MEMBERS_ONLY_POSTS_FIRST)
      .then((result) => {
        if (cancelled) return;
        if (result) {
          setMembersOnlyPosts(result.nodes);
        } else {
          setMembersOnlyPosts([]);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setMembersOnlyError(err?.message ?? 'Could not load members-only posts.');
          setMembersOnlyPosts([]);
        }
      })
      .finally(() => {
        if (!cancelled) setMembersOnlyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canSeeMembersOnlyPosts]);

  const handleRefreshMembership = async () => {
    setIsRefreshing(true);
    await refreshProfile();
    setIsRefreshing(false);
  };

  if (status === 'loading') {
    return (
      <main className="bg-primary-breath min-h-screen pt-32 md:pt-40 pb-40 selection:bg-[#f9f100] selection:text-black">
        <div className="max-w-7xl mx-auto px-6">
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
    <main className="bg-primary-breath min-h-screen pt-32 md:pt-40 pb-40 selection:bg-[#f9f100] selection:text-black">
      <div className="max-w-7xl mx-auto px-6">
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="inline-block w-fit rounded-full bg-secondary-purple-rain px-2 py-1 text-xs font-light text-white"
        >
          Members
        </motion.span>
        <header className="mb-2 md:mb-6">
          <AnimatedHeadline
            text={`${greeting}, ${profile?.display_name?.trim().split(/\s+/)[0] || 'Friend'}`}
            as="h1"
            className="text-5xl md:text-8xl lg:text-[8.5vw] font-heading-thin tracking-normal leading-[0.85] text-secondary-purple-rain mb-1 md:mb-2 text-balance inline-flex flex-wrap items-center justify-center gap-x-[0.15em] mb-4 block"
          />
        </header>
        <div className="max-w-3xl space-y-6">

        {!initialMembershipCheckDone ? (
          <p className="text-slate-600">Checking your membership…</p>
        ) : isMember ? (
          <section className="space-y-4">
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
                <span className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-900">
                  {memberKindLabel}
                </span>
                {secondMemberKindLabel ? (
                  <span className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-900">
                    {secondMemberKindLabel}
                  </span>
                ) : null}
              </div>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              <p className="font-semibold mb-1">You&apos;re almost there.</p>
              <p className="mb-1">
                We couldn&apos;t find an active membership for this account. We checked
                our current system (and WordPress) for the email you signed in with.
              </p>
              <p>
                If you&apos;re already a Kandie Gang member from our previous setup,
                <Link to="/contact" className="font-semibold underline ml-1">reach out</Link>
                {' '}and we&apos;ll link your account. Otherwise, keep an eye on our channels
                for the next membership window.
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

      {initialMembershipCheckDone && canSeeMembersOnlyPosts && (
        <div className="mx-auto max-w-7xl mt-10 pt-8 border-t border-slate-200">
          <h2 className="text-4xl font-light tracking-normal text-secondary-purple-rain mb-6 md:mb-8">
            Members Photo Gallery
          </h2>
          {membersOnlyLoading ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>Loading…</span>
            </div>
          ) : membersOnlyError ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {membersOnlyError}
            </p>
          ) : membersOnlyPosts.length === 0 ? (
            <p className="text-sm text-slate-500">
              No members-only posts yet. Check back later—we pull from the Photo Gallery category in WordPress.
            </p>
          ) : (
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
              {membersOnlyPosts.map((story, i) => {
                const slug = story.uri?.replace(/^\/+|\/+$/g, '').split('/').pop() ?? '';
                const storyHref = slug ? `/story/${slug}` : '/stories';
                return (
                  <Link key={story.id} to={storyHref} className="block">
                    <motion.article
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.05, 0.3) }}
                      className="group cursor-pointer flex flex-col"
                    >
                      <div className="overflow-hidden rounded-xl aspect-[4/3] bg-slate-100 mb-4">
                        <img
                          src={
                            story.featuredImage?.node?.sourceUrl
                              ? transformMediaUrl(story.featuredImage.node.sourceUrl)
                              : 'https://images.unsplash.com/photo-1546776310-eef45dd6d63c?q=80&w=800'
                          }
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          alt=""
                          loading="lazy"
                        />
                      </div>
                      <h3
                        className="text-xl md:text-2xl font-light tracking-normal text-slate-900 leading-tight mb-2 line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: story.title }}
                      />
                      <div
                        className="text-slate-500 font-light text-sm md:text-base leading-relaxed line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: story.excerpt }}
                      />
                    </motion.article>
                  </Link>
                );
              })}
            </section>
          )}
        </div>
      )}
      </div>
    </main>
  );
};

