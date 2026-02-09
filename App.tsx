
/**
 * App.tsx
 * The main application entry point. This component handles:
 * - Application routing using React Router.
 * - Global scroll-driven background animations (the shrinking canvas effect).
 * - Layout wrapper for all pages and persistent navigation elements.
 */

import React, { useRef, useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

// Reusable Components
import { Preloader } from './components/Preloader';
import { WeatherStatusBackground } from './components/WeatherStatusBackground';
import { HomepageRotatingHeadline } from './components/HomepageRotatingHeadline';
import { ExpandingHero } from './components/ExpandingHero';
import { ScrollingHeadline } from './components/ScrollingHeadline';
import { HorizontalRevealSection } from './components/HorizontalRevealSection';
import { CompanySection } from './components/CompanySection';
import { FAQSection } from './components/FAQSection';
import { StickyTop } from './components/StickyTop';
import { StickyBottom } from './components/StickyBottom';
import { NewsletterSection } from './components/NewsletterSection';
import { Footer } from './components/Footer';
import { AnnouncementBar } from './components/AnnouncementBar';
import { CookieBanner } from './components/CookieBanner';
import { CookiePreferencesModal } from './components/CookiePreferencesModal';
import { PageTransition } from './components/PageTransition';
import { PasswordGate } from './components/PasswordGate';
import { ContactModalProvider } from './context/ContactModalContext';
import { CookieConsentProvider, useCookieConsent } from './context/CookieConsentContext';
import { AuthProvider } from './context/AuthContext';
import { MemberLoginOffcanvasProvider } from './context/MemberLoginOffcanvasContext';
import { CartProvider } from './context/CartContext';
import { CartOffcanvas } from './components/CartOffcanvas';

// Lazy-loaded pages (code-split by route to keep main bundle under 600 kB)
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const CommunityPage = lazy(() => import('./pages/CommunityPage').then((m) => ({ default: m.CommunityPage })));
const StoriesPage = lazy(() => import('./pages/StoriesPage').then((m) => ({ default: m.StoriesPage })));
const StoryPage = lazy(() => import('./pages/StoryPage').then((m) => ({ default: m.StoryPage })));
const FontsPage = lazy(() => import('./pages/FontsPage').then((m) => ({ default: m.FontsPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then((m) => ({ default: m.ContactPage })));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage').then((m) => ({ default: m.PrivacyPolicyPage })));
const ImprintPage = lazy(() => import('./pages/ImprintPage').then((m) => ({ default: m.ImprintPage })));
const WaiverPage = lazy(() => import('./pages/WaiverPage').then((m) => ({ default: m.WaiverPage })));
const KandieCodePage = lazy(() => import('./pages/KandieCodePage').then((m) => ({ default: m.KandieCodePage })));
const RideLevelsPage = lazy(() => import('./pages/RideLevelsPage').then((m) => ({ default: m.RideLevelsPage })));
const KandieGangCyclingClubPage = lazy(() => import('./pages/KandieGangCyclingClubPage').then((m) => ({ default: m.KandieGangCyclingClubPage })));
const EventPage = lazy(() => import('./pages/EventPage').then((m) => ({ default: m.EventPage })));
const KandieEventPage = lazy(() => import('./pages/KandieEventPage').then((m) => ({ default: m.KandieEventPage })));
const MemberLoginPage = lazy(() => import('./pages/MemberLoginPage').then((m) => ({ default: m.MemberLoginPage })));
const ShopLoginPage = lazy(() => import('./pages/ShopLoginPage').then((m) => ({ default: m.ShopLoginPage })));
const ShopPage = lazy(() => import('./pages/ShopPage').then((m) => ({ default: m.ShopPage })));
const ProductPage = lazy(() => import('./pages/ProductPage').then((m) => ({ default: m.ProductPage })));
const CheckoutSuccessPage = lazy(() => import('./pages/CheckoutSuccessPage').then((m) => ({ default: m.CheckoutSuccessPage })));
const CheckoutCancelPage = lazy(() => import('./pages/CheckoutCancelPage').then((m) => ({ default: m.CheckoutCancelPage })));
const SignUpPage = lazy(() => import('./pages/SignUpPage').then((m) => ({ default: m.SignUpPage })));
const MembersAreaPage = lazy(() => import('./pages/MembersAreaPage').then((m) => ({ default: m.MembersAreaPage })));
const MembersSettingsPage = lazy(() => import('./pages/MembersSettingsPage').then((m) => ({ default: m.MembersSettingsPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

const PageLoader = () => <div className="min-h-[40vh] flex items-center justify-center" aria-hidden />;

const App: React.FC = () => {
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Skip preloader in dev so the site is visible immediately (set VITE_SKIP_PRELOADER=1)
  const [isLoading, setIsLoading] = useState(() => !(import.meta.env.DEV && import.meta.env.VITE_SKIP_PRELOADER === '1'));
  // Password gate disabled - site is now publicly accessible
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const location = useLocation();

  const showGate = false; // Password gate disabled

  useEffect(() => {
    if (isLoading || showGate) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isLoading, showGate]);

  // Prevent browser from restoring scroll so our scroll-to-top always wins
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  // Scroll to top on every route change (Athletics-style: new page loads from top)
  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    scrollToTop();
    // Run again after paint so we win over layout/transition; avoids scroll sticking mid-page
    const raf = requestAnimationFrame(() => {
      scrollToTop();
      requestAnimationFrame(scrollToTop);
    });
    return () => cancelAnimationFrame(raf);
  }, [location.pathname]);

  // Clear logout redirect flag when landing on home (so /members doesn't redirect to login next time)
  useEffect(() => {
    if (location.pathname === '/') {
      sessionStorage.removeItem('logoutRedirecting');
    }
  }, [location.pathname]);

  const { scrollYProgress } = useScroll({
    target: sentinelRef,
    offset: ["start end", "end end"]
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Frame: keep rounded corners visible from the start.
  // Keep spacing aligned with commit 37f4691 by NOT adding extra frame padding.
  const scale = useTransform(smoothProgress, [0, 0.8], [1, 0.92]);
  const opacity = useTransform(smoothProgress, [0, 0.9], [1, 0.95]);
  const y = useTransform(smoothProgress, [0, 1], [0, -20]);

  return (
    <CookieConsentProvider>
      <AuthProvider>
        <ContactModalProvider>
        <MemberLoginOffcanvasProvider>
          <CartProvider>
          <div className="relative min-h-screen selection:bg-[#f9f100] selection:text-black bg-white">
            {isLoading && <Preloader onComplete={() => setIsLoading(false)} />}
            {showGate && <PasswordGate onUnlock={() => setIsUnlocked(true)} />}

            <WeatherStatusBackground />
            <StickyTop offsetVariant={announcementDismissed ? 'tight' : 'withBar'} />

            {/* Main Content */}
            <motion.div
              style={{ scale, opacity, y, transformOrigin: 'bottom center' }}
              className={[
                "relative z-10 bg-white overflow-clip min-h-screen shadow-[0_64px_256px_rgba(0,0,0,0.1)]",
                // Keep a flat edge at the top on all pages, while keeping the bottom corners rounded.
                'rounded-b-[24px] rounded-t-none',
              ].join(' ')}
            >
              <AnnouncementBar
                message="Please be patient as we go through some changes."
                onDismiss={() => setAnnouncementDismissed(true)}
              />
              <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route element={<PageTransition />}>
                  <Route
                    path="/"
                    element={
                      <>
                        <LandingPage />
                        <HorizontalRevealSection />
                        <CompanySection />
                        <FAQSection />
                      </>
                    }
                  />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/community" element={<CommunityPage />} />
                  <Route path="/stories" element={<StoriesPage />} />
                  <Route path="/story/:slug" element={<StoryPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                  <Route path="/imprint" element={<ImprintPage />} />
                  <Route path="/waiver" element={<WaiverPage />} />
                  <Route path="/kandiecode" element={<KandieCodePage />} />
                  <Route path="/ridelevels" element={<RideLevelsPage />} />
                  <Route path="/kandiegangcyclingclub" element={<KandieGangCyclingClubPage />} />
                  <Route path="/event/:slug" element={<KandieEventPage />} />
                  <Route path="/fonts" element={<FontsPage />} />
                  <Route path="/login/member" element={<MemberLoginPage />} />
                  <Route path="/login/shop" element={<ShopLoginPage />} />
                  <Route path="/shop" element={<ShopPage />} />
                  <Route path="/shop/:slug" element={<ProductPage />} />
                  <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
                  <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
                  <Route path="/signup" element={<SignUpPage />} />
                  <Route path="/members" element={<MembersAreaPage />} />
                  <Route path="/members/settings" element={<MembersSettingsPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
              </Suspense>

              <NewsletterSection />
              <div className="h-[1rem] md:h-[2rem] bg-white" aria-hidden />
              <Footer />
            </motion.div>

            {/* Scroll sentinel to allow scrolling past the main content to trigger the reveal */}
            <div ref={sentinelRef} className="relative h-[50vh] md:h-[70vh] w-full pointer-events-none" />
            {['/', '/stories', '/about', '/kandiegangcyclingclub'].includes(location.pathname) && (
              <StickyBottom />
            )}
          </div>
          <CartOffcanvas />
          </CartProvider>
        </MemberLoginOffcanvasProvider>
        </ContactModalProvider>
        {isUnlocked && (
          <>
            <CookieBanner />
            <CookiePreferencesModalWrapper />
          </>
        )}
      </AuthProvider>
    </CookieConsentProvider>
  );
};

const CookiePreferencesModalWrapper: React.FC = () => {
  const { isPreferencesOpen, closeCookiePreferences } = useCookieConsent();
  return <CookiePreferencesModal isOpen={isPreferencesOpen} onClose={closeCookiePreferences} />;
};

/** Landing: minimal = logo + headline + hero only (prod). Full = + ScrollingHeadline + sections (dev). */
const LandingPage = ({ minimal = false }: { minimal?: boolean }) => (
  <>
    <HomepageRotatingHeadline minimal={minimal} />
    <ExpandingHero />
    {!minimal && <ScrollingHeadline />}
  </>
);

export default App;
