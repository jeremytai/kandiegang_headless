
/**
 * CommunityPage.tsx
 * A technical deep-dive into the AI and hardware technology behind Kandie Gang.
 * Features:
 * - High-fidelity "Community Technology" hero with bold branding.
 * - Sections focusing on Perception (vision models), Intelligence (behavior models), and Hardware (compliant mechanics).
 * - Animated stats and feature lists.
 * - Integration of the AdaptationGrid showing real-world autonomous tasks.
 * - Call-to-action for the Shared Skill Library community feature.
 * - Fetches content from WordPress headless CMS.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Shield, Eye, Database, Share2, Zap, Loader2, AlertCircle } from 'lucide-react';
import { AdaptationGrid } from '../components/AdaptationGrid';
import { getPageBySlug, WPPage } from '../lib/wordpress';
import { AnimatedHeadline } from '../components/AnimatedHeadline';

export const CommunityPage: React.FC = () => {
  const [page, setPage] = useState<WPPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true);
      setError(null);
      try {
        const pageData = await getPageBySlug('community');
        if (pageData) {
          setPage(pageData);
        } else {
          setError('Page not found in WordPress');
        }
      } catch (err) {
        console.error('Failed to fetch Community page:', err);
        setError('Failed to load content from WordPress');
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, []);

  // Default content
  const defaultHero = {
    subtitle: "Community Technology",
    title: "The future of embodied AI.",
    description: "Kandie Gang is powered by a proprietary stack of world-class perception, reasoning, and hardware safety."
  };

  return (
    <div className="bg-white selection:bg-[#f9f100] selection:text-black overflow-x-hidden">
      {/* Header: match StoriesPage header styling */}
      <section className="bg-primary-breath pt-32 md:pt-40 pb-16 md:pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <header className="mb-10 md:mb-16 relative">
            <AnimatedHeadline
              text="Community"
              as="h1"
              className="text-5xl md:text-8xl lg:text-[8.5vw] font-heading-thin tracking-normal leading-[0.85] text-secondary-purple-rain mb-2 md:mb-4 text-balance inline-flex flex-wrap items-center justify-center gap-x-[0.15em] mb-8 block"
            />

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-lg md:text-2xl text-primary-ink max-w-2xl font-light tracking-tight text-balance"
              >
                {defaultHero.description}
              </motion.p>

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-xs font-bold text-amber-600 bg-amber-50 px-5 py-2.5 rounded-full border border-amber-100 flex items-center gap-2 shadow-sm w-fit"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{error}</span>
                </motion.div>
              )}
            </div>
          </header>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-10 md:py-14 flex flex-col items-center justify-center space-y-4"
              >
                <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading</span>
              </motion.div>
            ) : page?.content ? (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="prose prose-lg md:prose-xl max-w-none text-primary-ink"
                dangerouslySetInnerHTML={{ __html: page.content }}
              />
            ) : null}
          </AnimatePresence>
        </div>
      </section>

      <section className="py-40 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
        <div className="space-y-8">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900">
            <Eye className="w-8 h-8" />
          </div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-slate-900">The world's best perception.</h2>
          <p className="text-xl text-slate-500 font-light leading-relaxed">
            Kandie Gang uses a multimodal transformer-based vision system that understands context, depth, and semantics in real-time. It doesn't just see objects; it understands their utility and state.
          </p>
          <ul className="space-y-4">
            <TechFeature label="Real-time Semantic Segmentation" />
            <TechFeature label="Low-latency Lidar SLAM" />
            <TechFeature label="Proprioceptive Feedback Loops" />
          </ul>
        </div>
        <div className="relative aspect-square bg-slate-100 rounded-xl overflow-hidden group shadow-2xl">
          <img 
            src="https://images.unsplash.com/photo-1555255707-c07966088b7b?q=80&w=1000&auto=format&fit=crop" 
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
            alt="Perception" 
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      </section>

      <AdaptationGrid />

      <section className="py-40 bg-slate-900 text-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center mb-32">
            <div className="relative aspect-[4/3] bg-white/5 rounded-xl overflow-hidden order-2 lg:order-1 border border-white/10">
               <video 
                 autoPlay 
                 muted 
                 loop 
                 playsInline
                 className="w-full h-full object-cover opacity-80"
               >
                 <source src="https://stream.mux.com/nO7qOC7BAVniKPLrWS2vr5HeKWj801jW00JhjJilIX8lQ.m3u8" type="application/x-mpegURL" />
                 <img src="https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000&auto=format&fit=crop" alt="Intelligence" />
               </video>
            </div>
            <div className="space-y-8 order-1 lg:order-2">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-[#f9f100]">
                <Cpu className="w-8 h-8" />
              </div>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tighter">Embodied Intelligence.</h2>
              <p className="text-xl text-slate-400 font-light leading-relaxed">
                We've moved beyond narrow AI. Kandie Gang features a Large Behavior Model (LBM) that learns by observation and imitation. It translates natural language instructions into precise physical actions.
              </p>
              <div className="pt-8 grid grid-cols-2 gap-8">
                 <Stat value="10^12" label="Parameters" />
                 <Stat value="24/7" label="Active Learning" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-60 px-6 bg-[#f9f100] flex flex-col items-center text-center">
         <Share2 className="w-16 h-16 text-black mb-12" />
         <h2 className="text-5xl md:text-8xl font-bold tracking-tighter text-black mb-8">The Shared Skill Library.</h2>
         <p className="text-2xl text-black/70 max-w-3xl font-light leading-tight tracking-tight mb-16">
           When one Kandie Gang learns how to fold a new type of laundry or clean a specific brand of espresso machine, the entire community benefits. 
           Collective intelligence at the scale of every home.
         </p>
         <button className="bg-black text-white px-12 py-5 rounded-full font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-2xl">
           Explore Skills
         </button>
      </section>

      <section className="py-40 px-6 max-w-3xl mx-auto text-center">
        <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400 mb-12">Performance Specs</h3>
        <div className="space-y-12">
           <Spec label="Payload" value="5kg per arm" />
           <Spec label="Reach" value="850mm" />
           <Spec label="Degrees of Freedom" value="28 Total" />
           <Spec label="Battery Life" value="12-14 Hours" />
        </div>
      </section>
    </div>
  );
};

const TechFeature = ({ label }: { label: string }) => (
  <li className="flex items-center gap-3 text-slate-900 font-medium">
    <div className="w-1.5 h-1.5 rounded-full bg-[#f9f100]" />
    {label}
  </li>
);

const Stat = ({ value, label }: { value: string, label: string }) => (
  <div>
    <div className="text-4xl font-bold text-white mb-2">{value}</div>
    <div className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</div>
  </div>
);

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="bg-slate-50 p-12 rounded-[40px] space-y-6 hover:bg-slate-100 transition-colors duration-500">
    <div className="text-slate-900 mb-8">{icon}</div>
    <h3 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h3>
    <p className="text-slate-500 leading-relaxed font-light">{desc}</p>
  </div>
);

const Spec = ({ label, value }: { label: string, value: string }) => (
  <div className="flex justify-between items-end border-b border-slate-100 pb-4">
    <span className="text-slate-400 font-light">{label}</span>
    <span className="text-2xl font-bold text-slate-900 tracking-tight">{value}</span>
  </div>
);

// Helper function to extract text from HTML (client-side safe)
function extractTextFromHTML(html: string): string {
  if (typeof document === 'undefined') return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').trim();
}