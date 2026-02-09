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

const MEMBERS_ONLY_CATEGORY_SLUG = 'photo-gallery';
const MEMBERS_ONLY_POSTS_FIRST = 20;

const HELLO_GREETINGS = [
  'Shwmae',
  'Kaixo',
  'Aluu',
  'Yá\'át\'ééh',
  'Kia ora',
  'Demat',
  'Bures',
];

/*
  Feature flag for header controls.

  Controls are currently hidden intentionally.
  To restore the "Account & security" link and dark mode toggle,
  change this value to:

      const SHOW_MEMBER_HEADER_CONTROLS = true;
*/
const SHOW_MEMBER_HEADER_CONTROLS = false;

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
  const cyclingMember = isCyclingMember(profile?.membership_plans);

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

  if (status === 'loading') {
    return (
      <main className="bg-white dark:bg-slate-900 min-h-screen pt-32 md:pt-40 pb-40">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-slate-600 dark:text-slate-400">Checking your membership…</p>
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main
      className={`min-h-screen pt-32 md:pt-40 pb-40 ${
        darkMode ? 'dark bg-slate-900' : 'bg-primary-breath'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <header className="mb-2 md:mb-6 text-center relative">

          {SHOW_MEMBER_HEADER_CONTROLS && (
            <div className="absolute right-0 top-0 flex items-center gap-1">
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
                {darkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
            </div>
          )}

          {(cyclingMember || guide) && (
            <motion.div
              ref={pillRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-wrap gap-2 mb-2 justify-center"
            >
              {guide && (
                <span className="inline-flex items-center rounded-full bg-secondary-purple-rain/15 px-3 py-1 text-xs font-medium text-secondary-purple-rain">
                  Kandie Gang Guide
                </span>
              )}
              {cyclingMember && (
                <span className="inline-flex items-center rounded-full bg-secondary-purple-rain/15 px-3 py-1 text-xs font-medium text-secondary-purple-rain">
                  Kandie Gang Cycling Member
                </span>
              )}
            </motion.div>
          )}

          <AnimatedHeadline
            text={`${greeting}, ${profile?.display_name?.trim().split(/\s+/)[0] || 'Friend'}`}
            as="h1"
            className="text-5xl md:text-8xl lg:text-[8.5vw] font-heading-thin tracking-normal leading-[0.85] text-secondary-purple-rain dark:text-slate-100"
          />
        </header>

        {(cyclingMember || guide) && (
          <MembersConfetti originRef={pillRef} enabled={initialMembershipCheckDone} />
        )}

      </div>
    </main>
  );
};
