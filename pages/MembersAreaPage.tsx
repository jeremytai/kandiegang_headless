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
  const daysLeft = getDaysLeft(profile?.membership_expiration ?? null);

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
      <main className="bg-white min-h-screen pt-32 md:pt-40 pb-40 selection:bg-[#f9f100] selection:text-black">
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
        <header className="mb-2 md:mb-6 text-center">
          {(cyclingMember || guide) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-wrap gap-2 mb-2 justify-center"
            >
              {guide && (
                <span className="inline-flex items-center rounded-full bg-secondary-purple-rain/15 px-3 py-1 text-xs font-medium text-secondary-purple-rain border border-secondary-purple-rain/30">
                  Kandie Gang Guide
                </span>
              )}
              {cyclingMember && (
                <span className="inline-flex items-center rounded-full bg-secondary-purple-rain/15 px-3 py-1 text-xs font-medium text-secondary-purple-rain border border-secondary-purple-rain/30">
                  Kandie Gang Cycling Member
                </span>
              )}
            </motion.div>
          )}
          <AnimatedHeadline
            text={`${greeting}, ${profile?.display_name?.trim().split(/\s+/)[0] || 'Friend'}`}
            as="h1"
            className="text-5xl md:text-8xl lg:text-[8.5vw] font-heading-thin tracking-normal leading-[0.85] text-secondary-purple-rain mb-1 md:mb-2 text-balance inline-flex flex-wrap items-center justify-center gap-x-[0.15em] mb-4 block"
          />
        </header>

      {initialMembershipCheckDone && canSeeMembersOnlyPosts && (
        <div className="mx-auto max-w-7xl mt-10 pt-8 border-t border-slate-200">
          <h2 className="text-4xl font-light tracking-normal text-secondary-purple-rain mb-6 md:mb-8">
            Members Only Photo Gallery
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
                              : '/images/231112_stevenscup_neuduvenstedt-10.jpg?q=80&w=800'
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

