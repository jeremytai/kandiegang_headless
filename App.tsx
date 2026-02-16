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
import { Preloader } from './components/layout/Preloader';
import { WeatherStatusBackground } from './components/visual/WeatherStatusBackground';
import { ExpandingHero } from './components/visual/ExpandingHero';
import { ScrollingHeadline } from './components/visual/ScrollingHeadline';
import { HorizontalRevealSection } from './components/visual/HorizontalRevealSection';
import { HomepageRotatingHeadline } from './components/visual/HomepageRotatingHeadline';
import { CompanySection } from './components/sections/CompanySection';
import { FAQSection } from './components/sections/FAQSection';
import { StickyTop } from './components/layout/StickyTop';
import { StickyBottom } from './components/layout/StickyBottom';
import { NewsletterSection } from './components/sections/NewsletterSection';
import { Footer } from './components/common/Footer';
import { AnnouncementBar } from './components/common/AnnouncementBar';
import { CookieBanner } from './components/common/CookieBanner';
import { CookiePreferencesModal } from './components/modals/CookiePreferencesModal';
import { PageTransition } from './components/layout/PageTransition';
import { PasswordGate } from './components/common/PasswordGate';
import { ContactModalProvider } from './context/ContactModalContext';
import { CookieConsentProvider, useCookieConsent } from './context/CookieConsentContext';
import { AuthProvider } from './context/AuthContext';
import { MemberLoginOffcanvasProvider } from './context/MemberLoginOffcanvasContext';
import { CartProvider } from './context/CartContext';
import { CartOffcanvas } from './components/shop/CartOffcanvas';
import { HelmetProvider } from 'react-helmet-async';

// Lazy-loaded pages (code-split by route to keep main bundle under 600 kB)
const AboutPage = lazy(() =>
  import('./pages/site/AboutPage').then((m) => ({ default: m.AboutPage }))
);
const CommunityPage = lazy(() =>
  import('./pages/community/CommunityPage').then((m) => ({ default: m.CommunityPage }))
);
const StoriesPage = lazy(() =>
  import('./pages/stories/StoriesPage').then((m) => ({ default: m.StoriesPage }))
);
const StoryPage = lazy(() =>
  import('./pages/stories/StoryPage').then((m) => ({ default: m.StoryPage }))
);
const DesignSystemWIP = lazy(() =>
  import('./pages/site/DesignSystemWIP').then((m) => ({ default: m.DesignSystemWIP }))
);
const ContactPage = lazy(() =>
  import('./pages/site/ContactPage').then((m) => ({ default: m.ContactPage }))
);
const PrivacyPolicyPage = lazy(() =>
  import('./pages/site/PrivacyPolicyPage').then((m) => ({ default: m.PrivacyPolicyPage }))
);
const ImprintPage = lazy(() =>
  import('./pages/site/ImprintPage').then((m) => ({ default: m.ImprintPage }))
);
const WaiverPage = lazy(() =>
  import('./pages/site/WaiverPage').then((m) => ({ default: m.WaiverPage }))
);
const KandieCodePage = lazy(() =>
  import('./pages/site/KandieCodePage').then((m) => ({ default: m.KandieCodePage }))
);
const RideLevelsPage = lazy(() =>
  import('./pages/site/RideLevelsPage').then((m) => ({ default: m.RideLevelsPage }))
);
const KandieGangCyclingClubPage = lazy(() =>
  import('./pages/site/KandieGangCyclingClubPage').then((m) => ({
    default: m.KandieGangCyclingClubPage,
  }))
);
const KandieEventPage = lazy(() =>
  import('./pages/community/KandieEventPage').then((m) => ({ default: m.KandieEventPage }))
);
const MemberLoginPage = lazy(() =>
  import('./pages/members/MemberLoginPage').then((m) => ({ default: m.MemberLoginPage }))
);
const ShopLoginPage = lazy(() =>
  import('./pages/shop/ShopLoginPage').then((m) => ({ default: m.ShopLoginPage }))
);
const ShopPage = lazy(() => import('./pages/shop/ShopPage').then((m) => ({ default: m.ShopPage })));
const ProductPage = lazy(() =>
  import('./pages/shop/ProductPage').then((m) => ({ default: m.ProductPage }))
);
const CheckoutSuccessPage = lazy(() =>
  import('./pages/shop/CheckoutSuccessPage').then((m) => ({ default: m.CheckoutSuccessPage }))
);
const CheckoutCancelPage = lazy(() =>
  import('./pages/shop/CheckoutCancelPage').then((m) => ({ default: m.CheckoutCancelPage }))
);
const EventCancelPage = lazy(() =>
  import('./pages/community/EventCancelPage').then((m) => ({ default: m.EventCancelPage }))
);
const WaitlistAdminPage = lazy(() =>
  import('./pages/members/WaitlistAdminPage').then((m) => ({ default: m.WaitlistAdminPage }))
);
const SignUpPage = lazy(() =>
  import('./pages/members/SignUpPage').then((m) => ({ default: m.SignUpPage }))
);
const MembersAreaPage = lazy(() =>
  import('./pages/members/MembersAreaPage').then((m) => ({ default: m.MembersAreaPage }))
);
const GuideAccessCheckPage = lazy(() =>
  import('./pages/members/GuideAccessCheckPage').then((m) => ({ default: m.default }))
);
const MembersSettingsPage = lazy(() =>
  import('./pages/members/MembersSettingsPage').then((m) => ({ default: m.MembersSettingsPage }))
);
const NotFoundPage = lazy(() =>
  import('./pages/site/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);
const TermsOfUsePage = lazy(() =>
  import('./pages/site/TermsOfUse.tsx').then((m) => ({ default: m.TermsOfUsePage }))
);

const PageLoader = () => (
  <div className="min-h-[40vh] flex items-center justify-center" aria-hidden />
);

const App: React.FC = () => {
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Skip preloader in dev so the site is visible immediately (set VITE_SKIP_PRELOADER=1)
  const [isLoading, setIsLoading] = useState(
    () => !(import.meta.env.DEV && import.meta.env.VITE_SKIP_PRELOADER === '1')
  );
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
    offset: ['start end', 'end end'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // Frame: keep rounded corners visible from the start.
  // Keep spacing aligned with commit 37f4691 by NOT adding extra frame padding.
  // Transforms temporarily disabled to debug right-edge vignette
  // const scale = useTransform(smoothProgress, [0, 0.8], [1, 0.92]);
  // const y = useTransform(smoothProgress, [0, 1], [0, -20]);

  return (
    <HelmetProvider>
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
                    className={[
                      'relative z-10 w-full bg-white overflow-hidden min-h-screen',
                      // Rounded corners temporarily removed to debug vignette
                      // 'rounded-b-[24px] rounded-t-none',
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
                          <Route path="/terms-of-use" element={<TermsOfUsePage />} />
                          {/* Removed TailwindElementsPage route for rollback */}
                          <Route path="/kandiecode" element={<KandieCodePage />} />
                          <Route path="/ridelevels" element={<RideLevelsPage />} />
                          <Route
                            path="/kandiegangcyclingclub"
                            element={<KandieGangCyclingClubPage />}
                          />
                          <Route path="/event/:slug" element={<KandieEventPage />} />
                          <Route path="/design-system" element={<DesignSystemWIP />} />
                          <Route path="/login/member" element={<MemberLoginPage />} />
                          <Route path="/login/shop" element={<ShopLoginPage />} />
                          <Route path="/shop" element={<ShopPage />} />
                          <Route path="/shop/:slug" element={<ProductPage />} />
                          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
                          <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
                          <Route path="/event/cancel" element={<EventCancelPage />} />
                          <Route path="/admin/waitlist" element={<WaitlistAdminPage />} />
                          <Route path="/signup" element={<SignUpPage />} />
                          <Route path="/members" element={<MembersAreaPage />} />
                          <Route path="/members/settings" element={<MembersSettingsPage />} />
                          <Route
                            path="/members/guide-access-check"
                            element={<GuideAccessCheckPage />}
                          />
                          <Route path="*" element={<NotFoundPage />} />
                        </Route>
                      </Routes>
                    </Suspense>

                    <NewsletterSection />
                    <div className="h-[1rem] md:h-[2rem] bg-white" aria-hidden />
                    <Footer />
                  </motion.div>

                  {/* Scroll sentinel to allow scrolling past the main content to trigger the reveal */}
                  <div
                    ref={sentinelRef}
                    className="relative h-[50vh] md:h-[70vh] w-full pointer-events-none"
                  />
                  {['/', '/stories', '/about', '/kandiegangcyclingclub'].includes(
                    location.pathname
                  ) && <StickyBottom />}
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
    </HelmetProvider>
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
