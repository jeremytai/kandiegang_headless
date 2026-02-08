
/**
 * App.tsx
 * The main application entry point. This component handles:
 * - Application routing using React Router.
 * - Global scroll-driven background animations (the shrinking canvas effect).
 * - Layout wrapper for all pages and persistent navigation elements.
 */

import React, { useRef, useState, useEffect } from 'react';
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
import { AboutPage } from './pages/AboutPage';
import { CommunityPage } from './pages/CommunityPage';
import { StoriesPage } from './pages/StoriesPage';
import { StoryPage } from './pages/StoryPage';
import { FontsPage } from './pages/FontsPage';
import { ContactPage } from './pages/ContactPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { ImprintPage } from './pages/ImprintPage';
import { WaiverPage } from './pages/WaiverPage';
import { KandieCodePage } from './pages/KandieCodePage';
import { RideLevelsPage } from './pages/RideLevelsPage';
import { KandieGangCyclingClubPage } from './pages/KandieGangCyclingClubPage';
import { EventPage } from './pages/EventPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { Footer } from './components/Footer';
import { AnnouncementBar } from './components/AnnouncementBar';
import { CookieBanner } from './components/CookieBanner';
import { CookiePreferencesModal } from './components/CookiePreferencesModal';
import { PageTransition } from './components/PageTransition';
import { PasswordGate, getStoredUnlock } from './components/PasswordGate';
import { ContactModalProvider } from './context/ContactModalContext';
import { CookieConsentProvider, useCookieConsent } from './context/CookieConsentContext';
import { AuthProvider } from './context/AuthContext';
import { MemberLoginOffcanvasProvider } from './context/MemberLoginOffcanvasContext';
import { CartProvider } from './context/CartContext';
import { CartOffcanvas } from './components/CartOffcanvas';
import { MemberLoginPage } from './pages/MemberLoginPage.tsx';
import { ShopLoginPage } from './pages/ShopLoginPage.tsx';
import { ShopPage } from './pages/ShopPage';
import { ProductPage } from './pages/ProductPage';
import { SignUpPage } from './pages/SignUpPage';
import { MembersAreaPage } from './pages/MembersAreaPage.tsx';
import { MembersSettingsPage } from './pages/MembersSettingsPage';
import { CheckoutSuccessPage } from './pages/CheckoutSuccessPage';
import { CheckoutCancelPage } from './pages/CheckoutCancelPage';

const App: React.FC = () => {
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Skip preloader in dev so the site is visible immediately (set VITE_SKIP_PRELOADER=1)
  const [isLoading, setIsLoading] = useState(() => !(import.meta.env.DEV && import.meta.env.VITE_SKIP_PRELOADER === '1'));
  // Password gate disabled - site is now publicly accessible
  const [isUnlocked] = useState(true);
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
                  <Route path="/event/:slug" element={<EventPage />} />
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
