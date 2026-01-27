
/**
 * App.tsx
 * The main application entry point. This component handles:
 * - Application routing using React Router.
 * - Real-time weather grounding for Hamburg via Google Gemini API.
 * - Global scroll-driven background animations (the shrinking canvas effect).
 * - Layout wrapper for all pages and persistent navigation elements.
 */

import React, { useRef, useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from "@google/genai";
import { Sun, Cloud, CloudRain, CloudLightning, Moon } from 'lucide-react';

// Reusable Components
import { Preloader } from './components/Preloader';
import { HeadlineSection } from './components/HeadlineSection';
import { ExpandingHero } from './components/ExpandingHero';
import { CompanySection } from './components/CompanySection';
import { ScrollingHeadline } from './components/ScrollingHeadline';
import { HorizontalRevealSection } from './components/HorizontalRevealSection';
import { StickyTop } from './components/StickyTop';
import { StickyBottom } from './components/StickyBottom';
import { FAQSection } from './components/FAQSection';
import { AboutPage } from './pages/AboutPage';
import { CommunityPage } from './pages/CommunityPage';
import { StoriesPage } from './pages/StoriesPage';
import { FontsPage } from './pages/FontsPage';
import { Footer } from './components/Footer';

const App: React.FC = () => {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [hamburgDate, setHamburgDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [weather, setWeather] = useState<{ temp: number; condition: string }>({ temp: 8, condition: 'Loading...' });

  useEffect(() => {
    // Scroll lock while loading
    if (isLoading) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        timeZone: 'Europe/Berlin'
      };
      setHamburgDate(now.toLocaleDateString('en-US', options));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);

    const fetchWeather = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: 'Current weather in Hamburg, Germany in Celsius. Return ONLY a valid JSON object: { "temp": number, "condition": string }',
          config: { tools: [{ googleSearch: {} }] }
        });
        
        const text = response.text || '';
        const jsonMatch = text.match(/\{.*\}/s);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          setWeather({ temp: Math.round(data.temp), condition: data.condition });
        }
      } catch (error) {
        console.error("Failed to fetch weather:", error);
        setWeather({ temp: 9, condition: 'Partly Cloudy' });
      }
    };

    fetchWeather();
    return () => {
      clearInterval(interval);
      document.body.style.overflow = 'unset';
    };
  }, [isLoading]);
  
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

  const WeatherIcon = () => {
    const cond = weather.condition.toLowerCase();
    if (cond.includes('sun') || cond.includes('clear')) return <Sun className="w-4 h-4" />;
    if (cond.includes('cloud')) return <Cloud className="w-4 h-4" />;
    if (cond.includes('rain')) return <CloudRain className="w-4 h-4" />;
    if (cond.includes('storm')) return <CloudLightning className="w-4 h-4" />;
    if (cond.includes('night')) return <Moon className="w-4 h-4" />;
    return <Sun className="w-4 h-4" />;
  };

  return (
    <div className="relative min-h-screen selection:bg-[#f9f100] selection:text-black bg-white">
      <Preloader onComplete={() => setIsLoading(false)} />

      {/* Background Yellow Layer - Refactored for better visibility and layout based on user feedback */}
      <div className="fixed inset-0 z-0 bg-[#f9f100] flex flex-col items-center justify-center p-6 md:p-12 overflow-hidden">
         <div className="text-center w-full max-w-4xl flex flex-col items-center justify-center space-y-10 md:space-y-16">
            <p className="text-sm md:text-base font-semibold text-slate-900 tracking-tight max-w-[280px] md:max-w-none text-balance">
              Time to power down and rest, Kandie Gang’s still on duty.
            </p>
            
            <div className="flex flex-wrap justify-center gap-2 md:gap-4">
               <div className="px-5 md:px-7 py-3 md:py-4 rounded-full border border-black/10 text-[12px] md:text-[14px] font-bold text-slate-900 bg-white/10 backdrop-blur-sm shadow-sm transition-all hover:bg-white/20">
                  {hamburgDate || 'Tuesday, Jan 27'}
               </div>
               <div className="px-5 md:px-7 py-3 md:py-4 rounded-full border border-black/10 text-[12px] md:text-[14px] font-bold text-slate-900 bg-white/10 backdrop-blur-sm shadow-sm transition-all hover:bg-white/20">
                  Hamburg, Germany
               </div>
               <div className="px-5 md:px-7 py-3 md:py-4 rounded-full border border-black/10 text-[12px] md:text-[14px] font-bold text-slate-900 bg-white/10 backdrop-blur-sm shadow-sm flex items-center gap-2.5 transition-all hover:bg-white/20">
                  <WeatherIcon />
                  {weather.temp}°C
               </div>
            </div>

            <div className="flex justify-center pt-8 md:pt-12">
               <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-100 scale-100 md:scale-125 transition-transform">
                  <path d="M24 0C28.4183 0 32 3.58172 32 8C32 12.4183 28.4183 16 24 16C19.5817 16 16 12.4183 16 8C16 3.58172 19.5817 0 24 0Z" fill="black"/>
                  <path d="M24 32C28.4183 32 32 35.5817 32 40C32 44.4183 28.4183 48 24 48C19.5817 48 16 44.4183 16 40C16 35.5817 19.5817 32 24 32Z" fill="black"/>
                  <path d="M48 24C48 28.4183 44.4183 32 40 32C35.5817 32 32 28.4183 32 24C32 19.5817 35.5817 16 40 16C44.4183 16 48 19.5817 48 24Z" fill="black"/>
                  <path d="M16 24C16 28.4183 12.4183 32 8 32C3.58172 32 0 28.4183 0 24C0 19.5817 3.58172 16 8 16C12.4183 16 16 19.5817 16 24Z" fill="black"/>
               </svg>
            </div>
         </div>
      </div>

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

              {/* Final scroll section designed to trigger the background reveal */}
              <div className="h-[80vh] md:h-screen flex items-center justify-center px-8 bg-white">
                  <div className="text-center space-y-6">
                       <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-slate-900 text-balance leading-none">Hand over the to-do list.</h2>
                       <p className="text-slate-400 text-base md:text-lg max-w-md mx-auto text-balance font-light">The white canvas will shrink to reveal the Kandie Gang dashboard underneath.</p>
                  </div>
              </div>
            </>
          } />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/stories" element={<StoriesPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/fonts" element={<FontsPage />} />
        </Routes>
        
        <Footer />
      </motion.div>

      {/* Scroll sentinel to allow scrolling past the main content to trigger the reveal */}
      <div ref={sentinelRef} className="h-[50vh] md:h-[70vh] w-full pointer-events-none" />
      <StickyBottom />
    </div>
  );
};

const ContactPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-white px-6 pt-32 pb-20">
    <div className="max-w-md w-full text-center">
      <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight text-slate-900">Contact</h1>
      <p className="text-slate-500 mb-10 leading-relaxed text-base md:text-lg font-light">Reach out to the Kandie Gang team. We’re building the future of home robotics.</p>
      <div className="space-y-4 text-left">
        <input className="w-full p-5 md:p-6 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-slate-200 transition-all font-medium text-slate-900 text-sm md:text-base" placeholder="Full Name" />
        <input className="w-full p-5 md:p-6 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-slate-200 transition-all font-medium text-slate-900 text-sm md:text-base" placeholder="Email address" />
        <textarea className="w-full p-5 md:p-6 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-slate-200 transition-all font-medium h-40 md:h-48 resize-none text-slate-900 text-sm md:text-base" placeholder="Message" />
        <button className="w-full bg-black text-white p-5 md:p-6 rounded-2xl font-bold hover:bg-slate-800 transition-all text-base md:text-lg shadow-xl shadow-black/10">Send Inquiry</button>
      </div>
    </div>
  </div>
);

const LandingPage = () => (
  <>
    <HeadlineSection />
    <ExpandingHero />
    <ScrollingHeadline />
  </>
);

export default App;
