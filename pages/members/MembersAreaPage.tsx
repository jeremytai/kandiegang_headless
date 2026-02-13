import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { posthog, FUNNEL_EVENTS } from '../../lib/posthog';
import {
  getCategoryPosts,
  wpQuery,
  GET_PRODUCTS_QUERY,
  GetProductsResponse,
  transformMediaUrl,
  normalizeProductFields,
  type WPPost,
  type WPProduct,
} from '../../lib/wordpress';
import { canPurchase, type ShopProduct } from '../../lib/products';
import { Loader2, ArrowRight, Moon, Sun, ChevronDown } from 'lucide-react';
import { AnimatedHeadline } from '../../components/visual/AnimatedHeadline';
import { MembersConfetti } from '../../components/common/MembersConfetti';
import { MemberMetaCard } from '../../components/member/MemberMetaCard';

const MEMBERS_ONLY_CATEGORY_SLUG = 'photo-gallery';
const MEMBERS_ONLY_POSTS_FIRST = 20;

/** Account status accordion for non-members. */
function AccountStatusAccordion() {
  const [isOpen, setIsOpen] = useState(true);
  const buttonId = 'account-status-accordion-button';
  const panelId = 'account-status-accordion-panel';
  const { profile } = useAuth();

  return (
    <div className="overflow-hidden border border-secondary-purple-rain/30 rounded-xl bg-white/80 dark:bg-slate-900/80 mb-6">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-4 text-left group focus:outline-none"
        aria-expanded={isOpen}
        aria-controls={panelId}
        id={buttonId}
      >
        <span
          className={`inline-flex shrink-0 transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-180' : ''}`}
        >
          <ChevronDown className="h-5 w-5 opacity-60 text-secondary-purple-rain group-hover:opacity-100 transition-opacity" />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
          >
            <div className="px-6 pb-6">
              <MemberMetaCard profile={profile} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const HELLO_GREETINGS = ['Shwmae', 'Kaixo', 'Aluu', "Yá'át'ééh", 'Kia ora', 'Demat', 'Bures'];

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

function scrollToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export const MembersAreaPage: React.FC = () => {
  const { status, user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

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
      // Ignore storage errors (private mode, blocked storage, etc.).
      return false;
    }
  });

  const pillRef = React.useRef<HTMLDivElement>(null);

  // FLAG TO HIDE ACCOUNT & DARK MODE (set to true to hide)
  const hideAccountAndDarkMode = true;

  useEffect(() => {
    try {
      localStorage.setItem('membersAreaDarkMode', darkMode ? '1' : '0');
    } catch {
      // Ignore storage errors (private mode, blocked storage, etc.).
    }
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
  const canSeeMembersOnlyPosts = isCyclingMember(profile?.membership_plans) || guide;
  const cyclingMember = isCyclingMember(profile?.membership_plans);

  useEffect(() => {
    if (status === 'loading') return;
    if (
      !user &&
      typeof window !== 'undefined' &&
      sessionStorage.getItem('logoutRedirecting') !== '1'
    ) {
      navigate('/login/member', { replace: true, state: { from: '/members' } });
      return;
    }
    if (status === 'authenticated' && user) {
      posthog.capture(FUNNEL_EVENTS.MEMBERS_AREA_VIEWED);
    }
  }, [status, user, navigate]);

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

  useEffect(() => {
    if (!canSeeMembersOnlyPosts) return;
    let cancelled = false;
    setMembersOnlyLoading(true);
    setMembersOnlyError(null);
    getCategoryPosts(MEMBERS_ONLY_CATEGORY_SLUG, MEMBERS_ONLY_POSTS_FIRST)
      .then((result) => {
        if (cancelled) return;
        setMembersOnlyPosts(result?.nodes ?? []);
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

  useEffect(() => {
    if (!canSeeMembersOnlyPosts) return;
    let cancelled = false;
    setMemberOnlyProductsLoading(true);
    setMemberOnlyProductsError(null);
    wpQuery<GetProductsResponse>(GET_PRODUCTS_QUERY, {}, { useCache: true })
      .then((data) => {
        if (cancelled) return;
        const normalized =
          data?.shopProducts?.nodes?.map((p) => ({
            ...p,
            productFields: normalizeProductFields(p.productFields) ?? p.productFields,
          })) ?? [];
        setMemberOnlyProducts(normalized.filter((p) => p.productFields?.membersOnly));
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

  if (status === 'loading') {
    return (
      <main className="bg-white dark:bg-slate-900 min-h-screen pt-32 md:pt-40 pb-40 selection:bg-[#f9f100] selection:text-black">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-slate-600 dark:text-slate-400">Checking your membership…</p>
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main
      className={`min-h-screen pt-32 md:pt-40 pb-40 selection:bg-[#f9f100] selection:text-black ${
        darkMode ? 'dark bg-slate-900' : 'bg-primary-breath'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        {/* Membership status accordion for users without active membership */}
        {initialMembershipCheckDone && !cyclingMember && !guide && <AccountStatusAccordion />}
        <header className="mb-2 md:mb-6 text-center relative">
          {/* Account/membership info moved to MemberSidebar component. Insert <MemberSidebar /> in your sidebar layout. */}

          <div className="absolute right-0 top-0 flex items-center gap-1">
            {!hideAccountAndDarkMode && (
              <>
                <Link
                  to="/members/settings"
                  className="p-2 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
                >
                  Account & security
                </Link>
                <button
                  type="button"
                  onClick={() => setDarkMode((d) => !d)}
                  className="p-2 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                  aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              </>
            )}
          </div>

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

        {/* Begin members-only products */}
        {initialMembershipCheckDone && canSeeMembersOnlyPosts && (
          <>
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
                      <Link
                        key={product.id}
                        to={productHref}
                        state={{ from: '/members' }}
                        className="block"
                      >
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

            {/* Members-only stories */}
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
                  No members-only posts yet. Check back later—we pull from the Photo Gallery
                  category in WordPress.
                </p>
              ) : (
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
                  {membersOnlyPosts.map((story, i) => {
                    const slug =
                      story.uri
                        ?.replace(/^\/+|\/+$/g, '')
                        .split('/')
                        .pop() ?? '';
                    const storyHref = slug ? `/story/${slug}` : '/stories';
                    return (
                      <Link
                        key={story.id}
                        to={storyHref}
                        state={{ from: '/members' }}
                        className="block"
                      >
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
