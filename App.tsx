
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
import { MemberLoginPage } from './pages/MemberLoginPage';
import { ShopLoginPage } from './pages/ShopLoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { MembersAreaPage } from './pages/MembersAreaPage';

const App: React.FC = () => {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(getStoredUnlock);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const location = useLocation();

  const showGate = !isLoading && !isUnlocked;

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

  // Google Analytics: send page_view on each SPA route change
  useEffect(() => {
    const gtag = (window as unknown as { gtag?: (command: string, ...args: unknown[]) => void }).gtag;
    if (typeof gtag === 'function') {
      gtag('config', 'GT-5TJ2FPQ8', { page_path: location.pathname });
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
          <div className="relative min-h-screen selection:bg-[#f9f100] selection:text-black bg-white">
            <Preloader onComplete={() => setIsLoading(false)} />
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
                  <Route path="/signup" element={<SignUpPage />} />
                  <Route path="/members" element={<MembersAreaPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>

              <NewsletterSection />
              <div className="h-[1rem] md:h-[2rem] bg-white" aria-hidden />
              <Footer />
            </motion.div>

            {/* Scroll sentinel to allow scrolling past the main content to trigger the reveal */}
            <div ref={sentinelRef} className="h-[50vh] md:h-[70vh] w-full pointer-events-none" />
            {['/', '/stories', '/about', '/kandiegangcyclingclub'].includes(location.pathname) && (
              <StickyBottom />
            )}
          </div>
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
