
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
import { CompanySection } from './components/CompanySection';
import { ScrollingHeadline } from './components/ScrollingHeadline';
import { HorizontalRevealSection } from './components/HorizontalRevealSection';
import { StickyTop } from './components/StickyTop';
import { StickyBottom } from './components/StickyBottom';
import { FAQSection } from './components/FAQSection';
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
import { NotFoundPage } from './pages/NotFoundPage';
import { Footer } from './components/Footer';
import { CookieBanner } from './components/CookieBanner';
import { CookiePreferencesModal } from './components/CookiePreferencesModal';
import { PageTransition } from './components/PageTransition';
import { ContactModalProvider } from './context/ContactModalContext';
import { CookieConsentProvider, useCookieConsent } from './context/CookieConsentContext';

const PRELOADER_SEEN_KEY = 'kandiegang_preloader_seen';

function getInitialLoading(): boolean {
  try {
    if (typeof window !== 'undefined' && sessionStorage.getItem(PRELOADER_SEEN_KEY) === '1') {
      return false;
    }
  } catch {
    /* ignore */
  }
  return true;
}

const App: React.FC = () => {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(getInitialLoading);
  const location = useLocation();

  const handlePreloaderComplete = () => {
    try {
      sessionStorage.setItem(PRELOADER_SEEN_KEY, '1');
    } catch {
      /* ignore */
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isLoading) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isLoading]);

  // Scroll to top on every route change (Athletics-style: new page loads from top)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Google Analytics: send page_view on each SPA route change
  useEffect(() => {
    if (typeof window.gtag === 'function') {
      window.gtag('config', 'GT-5TJ2FPQ8', { page_path: location.pathname });
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

  // Refined transforms to create a more balanced "frame" effect that matches the provided screenshot
  const scale = useTransform(smoothProgress, [0, 0.8], [1, 0.92]);
  const borderRadius = useTransform(smoothProgress, [0, 0.6], [0, 24]);
  const opacity = useTransform(smoothProgress, [0, 0.9], [1, 0.95]);
  const y = useTransform(smoothProgress, [0, 1], [0, -20]);

  return (
    <CookieConsentProvider>
      <ContactModalProvider>
        <div className="relative min-h-screen selection:bg-[#f9f100] selection:text-black bg-white">
          {isLoading && <Preloader onComplete={handlePreloaderComplete} />}

          <WeatherStatusBackground />
          <StickyTop />

          {/* Main Content */}
          <motion.div
            style={{ scale, borderRadius, opacity, y, transformOrigin: 'bottom center' }}
            className="relative z-10 bg-white overflow-clip min-h-screen shadow-[0_64px_256px_rgba(0,0,0,0.1)]"
          >
            <Routes>
              <Route element={<PageTransition />}>
                <Route path="/" element={
                  <>
                    <LandingPage />
                    <HorizontalRevealSection />
                    <CompanySection />
                    <FAQSection />
                  </>
                } />
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
                <Route path="/fonts" element={<FontsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>

            {/* Newsletter signup before footer on all pages */}
            <NewsletterSection />
            <div className="h-[1rem] md:h-[2rem] bg-white" aria-hidden />
            <Footer />
          </motion.div>

          {/* Scroll sentinel to allow scrolling past the main content to trigger the reveal */}
          <div ref={sentinelRef} className="h-[50vh] md:h-[70vh] w-full pointer-events-none" />
          {['/', '/stories', '/about', '/kandiegangcyclingclub'].includes(location.pathname) && <StickyBottom />}
        </div>
      </ContactModalProvider>
      <CookieBanner />
      <CookiePreferencesModalWrapper />
    </CookieConsentProvider>
  );
};

const CookiePreferencesModalWrapper: React.FC = () => {
  const { isPreferencesOpen, closeCookiePreferences } = useCookieConsent();
  return <CookiePreferencesModal isOpen={isPreferencesOpen} onClose={closeCookiePreferences} />;
};

const LandingPage = () => (
  <>
    <HomepageRotatingHeadline />
    <ExpandingHero />
    <ScrollingHeadline />
  </>
);

export default App;
