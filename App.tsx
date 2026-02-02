
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
import { HeadlineSection } from './components/HeadlineSection';
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
import { FontsPage } from './pages/FontsPage';
import { ContactPage } from './pages/ContactPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { ImprintPage } from './pages/ImprintPage';
import { WaiverPage } from './pages/WaiverPage';
import { Footer } from './components/Footer';

const App: React.FC = () => {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const visitedPathsRef = useRef<Set<string>>(new Set());

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

  // Scroll to top on internal navigation only when visiting a route for the first time this session
  useEffect(() => {
    const pathname = location.pathname;
    if (!visitedPathsRef.current.has(pathname)) {
      window.scrollTo(0, 0);
      visitedPathsRef.current.add(pathname);
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
  const borderRadius = useTransform(smoothProgress, [0, 0.6], [0, 48]);
  const opacity = useTransform(smoothProgress, [0, 0.9], [1, 0.95]);
  const y = useTransform(smoothProgress, [0, 1], [0, -20]);

  return (
    <div className="relative min-h-screen selection:bg-[#f9f100] selection:text-black bg-white">
      <Preloader onComplete={() => setIsLoading(false)} />

      <WeatherStatusBackground />
      <StickyTop />

      {/* Main Content */}
      <motion.div 
        style={{ scale, borderRadius, opacity, y, transformOrigin: 'bottom center' }}
        className="relative z-10 bg-white overflow-clip min-h-screen shadow-[0_64px_256px_rgba(0,0,0,0.1)]"
      >
        <Routes>
          <Route path="/" element={
            <>
              <LandingPage />
              <HorizontalRevealSection />
              <CompanySection />
              <FAQSection />

              {/* Newsletter signup (Sunday.ai style) — small spacer before footer for scroll reveal */}
              <NewsletterSection />
              <div className="h-[1rem] md:h-[2rem] bg-white" aria-hidden />
            </>
          } />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/stories" element={<StoriesPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/imprint" element={<ImprintPage />} />
          <Route path="/waiver" element={<WaiverPage />} />
          <Route path="/fonts" element={<FontsPage />} />
        </Routes>
        
        <Footer />
      </motion.div>

      {/* Scroll sentinel to allow scrolling past the main content to trigger the reveal */}
      <div ref={sentinelRef} className="h-[50vh] md:h-[70vh] w-full pointer-events-none" />
      {['/', '/stories', '/about'].includes(location.pathname) && <StickyBottom />}
    </div>
  );
};

const LandingPage = () => (
  <>
    <HeadlineSection />
    <ExpandingHero />
    <ScrollingHeadline />
  </>
);

export default App;
