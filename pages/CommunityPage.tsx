
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
import { EventsLayout, EventsLayoutEvent } from '../components/EventsLayout';

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
    subtitle: "Upcoming rides & events",
    title: "Community",
    description: "Join us on rides, events, and initiatives where you feel supported and heard."
  };

  const communityEvents: EventsLayoutEvent[] = [
    {
      id: 'kandiegang-social-ride',
      href: '/kandiegangcyclingclub',
      imageBase: '/images/250701_photosafari-12',
      title: 'Kandie Gang Social Ride',
      tag: 'Social Ride',
      description: 'A relaxed, no-drop evening ride to explore Hamburg together. All levels welcome.',
      startDate: '2026-05-14T18:00:00.000Z',
      endDate: '2026-05-14T20:30:00.000Z',
      year: '2026',
      days: 'May 14',
      month: 'Thursday',
      location: 'Hamburg',
    },
  ];

  return (
    <div className="bg-white selection:bg-[#f9f100] selection:text-black overflow-x-hidden">
      {/* Header: match StoriesPage header styling */}
      <section className="bg-whiteeath pt-32 md:pt-40 pb-16 md:pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <header className="mb-10 md:mb-16 relative">
            <AnimatedHeadline
              text="Community is the heart of Kandie Gang."
              as="h1"
              lineHeight={1.5}
              className="text-4xl md:text-6xl lg:text-[6.5vw] font-heading-light tracking-normal text-secondary-purple-rain mb-2 md:mb-4 text-balance inline-flex flex-wrap items-center justify-center gap-x-[0.15em] mb-8 block"
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

      <section className="bg-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 space-y-8">
          

          <EventsLayout events={communityEvents} />
        </div>
      </section>

      <AdaptationGrid />

    </div>
  );
};

const Stat = ({ value, label }: { value: string, label: string }) => (
  <div>
    <div className="text-4xl font-bold text-white mb-2">{value}</div>
    <div className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</div>
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