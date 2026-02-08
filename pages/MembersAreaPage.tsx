import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { posthog, FUNNEL_EVENTS } from '../lib/posthog';
import {
  getCategoryPosts,
  wpQuery,
  GET_PRODUCTS_QUERY,
  GetProductsResponse,
  transformMediaUrl,
  normalizeProductFields,
  type WPPost,
  type WPProduct,
} from '../lib/wordpress';
import { canPurchase, type ShopProduct } from '../lib/products';
import { Loader2, ArrowRight, Moon, Sun } from 'lucide-react';
import { AnimatedHeadline } from '../components/AnimatedHeadline';
import { MembersConfetti } from '../components/MembersConfetti';

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

function scrollToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export const MembersAreaPage: React.FC = () => {
  const { status, user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [initialMembershipCheckDone, setInitialMembershipCheckDone] = useState(false);
  const [membersOnlyPosts, setMembersOnlyPosts] = useState<WPPost[]>([]);
  const [membersOnlyLoading, setMembersOnlyLoading] = useState(false);
  const [membersOnlyError, setMembersOnlyError] = useState<string | null>(null);
  const [memberOnlyProducts, setMemberOnlyProducts] = useState<WPProduct[]>([]);
  const [memberOnlyProductsLoading, setMemberOnlyProductsLoading] = useState(false);
  const [memberOnlyProductsError, setMemberOnlyProductsError] = useState<string | null>(null);
  const [greeting] = useState(
    () => HELLO_GREETINGS[Math.floor(Math.random() * HELLO_GREETINGS.length)]
  );
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('membersAreaDarkMode') === '1';
    } catch {
      return false;
    }
  });
  const pillRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('membersAreaDarkMode', darkMode ? '1' : '0');
    } catch {}
  }, [darkMode]);

  useEffect(() => {
    scrollToTop();
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(scrollToTop);
    });
    const t = window.setTimeout(scrollToTop, 120);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, []);

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
      return;
    }
    if (status === 'authenticated' && user) {
      posthog.capture(FUNNEL_EVENTS.MEMBERS_AREA_VIEWED);
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

  // Fetch member-only shop products when user is eligible (cycling member or guide)
  useEffect(() => {
    if (!canSeeMembersOnlyPosts) return;
    let cancelled = false;
    setMemberOnlyProductsLoading(true);
    setMemberOnlyProductsError(null);
    wpQuery<GetProductsResponse>(GET_PRODUCTS_QUERY, {}, { useCache: true })
      .then((data) => {
        if (cancelled) return;
        if (data?.shopProducts?.nodes?.length) {
          const normalized = data.shopProducts.nodes.map((p) => ({
            ...p,
            productFields: normalizeProductFields(p.productFields) ?? p.productFields,
          }));
          setMemberOnlyProducts(
            normalized.filter((p) => p.productFields?.membersOnly === true)
          );
        } else {
          setMemberOnlyProducts([]);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setMemberOnlyProductsError(err?.message ?? 'Could not load member-only products.');
          setMemberOnlyProducts([]);
        }
      })
      .finally(() => {
        if (!cancelled) setMemberOnlyProductsLoading(false);
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
      <main className="bg-white dark:bg-slate-900 min-h-screen pt-32 md:pt-40 pb-40 selection:bg-[#f9f100] selection:text-black">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-slate-600 dark:text-slate-400">Checking your membership…</p>
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
    <main
      className={`min-h-screen pt-32 md:pt-40 pb-40 selection:bg-[#f9f100] selection:text-black ${
        darkMode ? 'dark bg-slate-900' : 'bg-primary-breath'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <header className="mb-2 md:mb-6 text-center relative">
          <button
            type="button"
            onClick={() => setDarkMode((d) => !d)}
            className="absolute right-0 top-0 p-2 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
          {(cyclingMember || guide) && (
            <motion.div
              ref={pillRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-wrap gap-2 mb-2 justify-center"
            >
              {guide && (
                <span className="inline-flex items-center rounded-full bg-secondary-purple-rain/15 dark:bg-secondary-purple-rain/25 px-3 py-1 text-xs font-medium text-secondary-purple-rain border border-secondary-purple-rain/30 dark:border-secondary-purple-rain/50">
                  Kandie Gang Guide
                </span>
              )}
              {cyclingMember && (
                <span className="inline-flex items-center rounded-full bg-secondary-purple-rain/15 dark:bg-secondary-purple-rain/25 px-3 py-1 text-xs font-medium text-secondary-purple-rain border border-secondary-purple-rain/30 dark:border-secondary-purple-rain/50">
                  Kandie Gang Cycling Member
                </span>
              )}
            </motion.div>
          )}
          <AnimatedHeadline
            text={`${greeting}, ${profile?.display_name?.trim().split(/\s+/)[0] || 'Friend'}`}
            as="h1"
            className="text-5xl md:text-8xl lg:text-[8.5vw] font-heading-thin tracking-normal leading-[0.85] text-secondary-purple-rain dark:text-slate-100 mb-1 md:mb-2 text-balance inline-flex flex-wrap items-center justify-center gap-x-[0.15em]"
          />
        </header>

        {(cyclingMember || guide) && (
          <MembersConfetti originRef={pillRef} enabled={initialMembershipCheckDone} />
        )}

      {initialMembershipCheckDone && canSeeMembersOnlyPosts && (
        <>
          {/* Member Only Products — above Photo Gallery */}
          <div className="mx-auto max-w-7xl mt-10 pt-8 border-t border-slate-200 dark:border-slate-700">
            <div className="mb-6 md:mb-8">
              <h2 className="text-4xl font-light font-heading-thin tracking-normal text-secondary-purple-rain dark:text-secondary-purple-rain/90">
                Members Only Products
              </h2>
              <p className="mt-1 text-sm md:text-base font-gtplanar font-normal tracking-normal text-slate-500 dark:text-slate-400">
                from the archive
              </p>
            </div>
            {memberOnlyProductsLoading ? (
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Loading…</span>
              </div>
            ) : memberOnlyProductsError ? (
              <p className="text-sm text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
                {memberOnlyProductsError}
              </p>
            ) : memberOnlyProducts.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No member-only products at the moment. Check back later or visit the main shop.
              </p>
            ) : (
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
                {memberOnlyProducts.map((product, i) => {
                  const displayPrice =
                    product.productFields?.priceMember ?? product.productFields?.pricePublic;
                  const shopProduct: ShopProduct = {
                    id: product.id,
                    title: product.title,
                    content: product.content || '',
                    excerpt: product.excerpt || '',
                    featuredImage: product.featuredImage,
                    productFields: {
                      hasVariants: product.productFields?.hasVariants ?? false,
                      pricePublic: product.productFields?.pricePublic
                        ? parseFloat(String(product.productFields.pricePublic))
                        : undefined,
                      priceMember: product.productFields?.priceMember
                        ? parseFloat(String(product.productFields.priceMember))
                        : undefined,
                      stripePriceIdPublic: product.productFields?.stripePriceIdPublic,
                      stripePriceIdMember: product.productFields?.stripePriceIdMember,
                      inventory: product.productFields?.inventory,
                      sku: product.productFields?.sku,
                      variants: product.productFields?.variants?.map((v) => ({
                        label: v.label,
                        pricePublic: v.pricePublic,
                        priceMember: v.priceMember,
                        stripePriceIdPublic: v.stripePriceIdPublic,
                        stripePriceIdMember: v.stripePriceIdMember,
                        sku: v.sku,
                        inventory: v.inventory,
                      })),
                      membersOnly: true,
                      inStock: product.productFields?.inStock ?? true,
                    },
                  };
                  const isInStock = canPurchase(shopProduct, true);
                  const productSlug = product.slug || '';
                  const productHref = productSlug ? `/shop/${productSlug}` : '#';
                  return (
                    <Link key={product.id} to={productHref} state={{ from: '/members' }} className="block">
                      <motion.article
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.05, 0.3) }}
                        className="group cursor-pointer flex flex-col"
                      >
                        <div className="overflow-hidden rounded-xl aspect-[4/3] bg-slate-100 dark:bg-slate-800 mb-4 relative">
                          <img
                            src={
                              product.featuredImage?.node?.sourceUrl
                                ? transformMediaUrl(product.featuredImage.node.sourceUrl)
                                : '/images/231112_stevenscup_neuduvenstedt-10.jpg?q=80&w=800'
                            }
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            alt={product.featuredImage?.node?.altText || product.title}
                            loading="lazy"
                          />
                          {!isInStock && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="text-white font-bold uppercase tracking-widest text-xs">
                                Out of Stock
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3
                            className="text-lg md:text-xl font-gtplanar font-bold tracking-normal text-secondary-purple-rain dark:text-slate-200 leading-tight line-clamp-2 flex-1"
                            dangerouslySetInnerHTML={{ __html: product.title }}
                          />
                        </div>
                        {displayPrice != null && (
                          <p className="text-secondary-purple-rain dark:text-slate-300 font-gtplanar font-medium text-base md:text-lg mt-4 mb-8">
                            € {displayPrice}
                          </p>
                        )}
                        <div className="flex items-center justify-between w-full py-3 px-4 rounded-lg border-2 border-secondary-purple-rain/60 bg-transparent text-secondary-purple-rain group-hover:bg-secondary-purple-rain group-hover:text-black transition-colors">
                          <span className="font-medium text-sm tracking-normal">Get it</span>
                          <ArrowRight className="w-4 h-4 shrink-0" />
                        </div>
                      </motion.article>
                    </Link>
                  );
                })}
              </section>
            )}
          </div>

          <div className="mx-auto max-w-7xl mt-10 pt-8 border-t border-slate-200 dark:border-slate-700">
            <h2 className="text-4xl font-light font-heading-thin tracking-normal text-secondary-purple-rain dark:text-secondary-purple-rain/90 mb-10">
              Members Only Photo Gallery
            </h2>
          {membersOnlyLoading ? (
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>Loading…</span>
            </div>
          ) : membersOnlyError ? (
            <p className="text-sm text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
              {membersOnlyError}
            </p>
          ) : membersOnlyPosts.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No members-only posts yet. Check back later—we pull from the Photo Gallery category in WordPress.
            </p>
          ) : (
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
              {membersOnlyPosts.map((story, i) => {
                const slug = story.uri?.replace(/^\/+|\/+$/g, '').split('/').pop() ?? '';
                const storyHref = slug ? `/story/${slug}` : '/stories';
                return (
                  <Link key={story.id} to={storyHref} state={{ from: '/members' }} className="block">
                    <motion.article
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.05, 0.3) }}
                      className="group cursor-pointer flex flex-col"
                    >
                      <div className="overflow-hidden rounded-xl aspect-[4/3] bg-slate-100 dark:bg-slate-800 mb-4">
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
                        className="text-xl md:text-2xl font-light tracking-normal text-secondary-purple-rain dark:text-secondary-purple-rain/90 leading-tight mb-2 line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: story.title }}
                      />
                      <div
                        className="text-slate-500 dark:text-slate-400 font-light text-sm md:text-base leading-relaxed line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: story.excerpt }}
                      />
                    </motion.article>
                  </Link>
                );
              })}
            </section>
          )}
          </div>
        </>
      )}
      </div>
    </main>
  );
};

