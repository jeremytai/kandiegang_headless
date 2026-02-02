/**
 * AboutPage.tsx
 * An immersive editorial-style page detailing the company's vision and philosophy.
 * Features:
 * - Integrated AboutHero with high-impact video background.
 * - Elegant typography-driven sections explaining core product principles.
 * - Infinite ImageMarquee gallery showcasing the design and tech behind the brand.
 * - Investor showcase with grayscale logos.
 * - Careers call-to-action for recruiting.
 * - Fetches content from WordPress headless CMS.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Loader2, AlertCircle } from 'lucide-react';
import { CompanySection } from '../components/CompanySection';
import { CompanyValuesSection } from '../components/CompanyValuesSection.tsx';
import { AboutHero } from '../components/AboutHero';
import { ImageMarquee } from '../components/ImageMarquee';
import { NewsletterSection } from '../components/NewsletterSection';
// WordPress fetch – re-enable when ready (getPageBySlug)
import { WPPage } from '../lib/wordpress';

export const AboutPage: React.FC = () => {
  // const [page, setPage] = useState<WPPage | null>(null);
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null);
  // useEffect(() => {
  //   const fetchPage = async () => {
  //     setLoading(true);
  //     setError(null);
  //     try {
  //       const pageData = await getPageBySlug('about');
  //       if (pageData) {
  //         setPage(pageData);
  //       } else {
  //         setError('Page not found in WordPress');
  //       }
  //     } catch (err) {
  //       console.error('Failed to fetch About page:', err);
  //       setError('Failed to load content from WordPress');
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchPage();
  // }, []);

  const [page, setPage] = useState<WPPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default content to display if WordPress content is not available
  const defaultContent = {
    intro: "We're on a mission to provide a safe space that brings FLINTA* and BIPOC closer to cycling culture (without excluding men).",
    visionTitle: "A cycling culture in which every rider and path belong.",
    visionText: [
      "By breaking old norms and centering diversity, creativity, and empathy, every ride, path, and connection becomes a space shaped by those who show up and participate.",
      "Through group rides, community meetups, and shared creative projects, we actively welcome people of all identities and backgrounds, encouraging participation over perfection."
    ]
  };

  return (
    <div className="bg-white overflow-x-hidden">
      <AboutHero />

      <div className="max-w-7xl mx-auto px-3">
        <AnimatePresence mode="wait">
          {/* WordPress loader – re-enable when ready
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="my-40 max-w-3xl"
            >
              <div className="flex items-center gap-4 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-medium">Loading content from WordPress...</span>
              </div>
              <div className="mt-8 space-y-4">
                <div className="h-8 bg-slate-100 rounded w-3/4 animate-pulse" />
                <div className="h-8 bg-slate-100 rounded w-full animate-pulse" />
                <div className="h-8 bg-slate-100 rounded w-5/6 animate-pulse" />
              </div>
            </motion.div>
          ) : */
          error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="my-40 max-w-3xl"
            >
              <div className="flex items-center gap-3 text-amber-600 bg-amber-50 px-5 py-3 rounded-full border border-amber-100 w-fit mb-6">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{error}</span>
              </div>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="my-40 max-w-3xl"
              >
                <p className="text-3xl md:text-4xl font-light text-slate-500 leading-tight tracking-tight">
                  {defaultContent.intro}
                </p>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="my-12"
            >
              {/* Intro moved into section below to span all columns */}
            </motion.div>
          )}
        </AnimatePresence>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-20 mb-40 mt-0">
          <div className="space-y-8">
            <h2 className="text-xs font-normal font-gtplanar uppercase tracking-[0.3em] text-secondary-purple-rain">Our Vision</h2>
            <h3 className="text-4xl md:text-5xl font-light tracking-normal text-secondary-purple-rain">
              {page?.title ? extractTextFromHTML(page.title) || defaultContent.visionTitle : defaultContent.visionTitle}
            </h3>
          </div>
          <div className="space-y-6 text-lg md:text-xl text-slate-500 font-light leading-relaxed">
            {page?.content ? (
              <div 
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: extractContentSection(page.content, 1) }}
              />
            ) : (
              <>
                <p>{defaultContent.visionText[0]}</p>
                <p>{defaultContent.visionText[1]}</p>
              </>
            )}
          </div>
        </section>
      </div>

      <ImageMarquee />

      <div className="max-w-7xl mx-auto px-3">
        <CompanyValuesSection />

        <CompanySection />

        {/* <section className="py-40 border-t border-slate-100 mb-20">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400 mb-20">Backed by the best</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-20 gap-y-12 items-center opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
               <InvestorLogo name="Founders Fund" />
               <InvestorLogo name="Sequoia" />
               <InvestorLogo name="Index Ventures" />
               <InvestorLogo name="General Catalyst" />
               <InvestorLogo name="Y Combinator" />
               <InvestorLogo name="First Round" />
               <InvestorLogo name="Lux Capital" />
               <InvestorLogo name="Khosla Ventures" />
            </div>
          </div>
        </section> */}

        <section className="relative rounded-[16px] p-12 md:p-24 flex flex-col items-center text-center mb-1 overflow-hidden">
          <img
            src="/images/230902_7mesh-47.JPG"
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            aria-hidden
          />
          <div className="absolute inset-0 bg-slate-900/50" aria-hidden />
          <div className="relative z-10 flex flex-col items-center">
            <h2 className="text-4xl md:text-6xl font-light tracking-normal text-white mb-8">Want to  partner with us?</h2>
            <p className="text-xl text-white/90 mb-12 max-w-xl font-light">
              We're a collective of cyclists, creatives, and dreamers based in Hamburg, Germany.
            </p>
            <Link
              to="/contact"
              className="bg-white text-black px-10 py-5 rounded-full font-bold flex items-center gap-3 hover:bg-slate-100 transition-all active:scale-95 inline-flex"
            >
              Contact us <ArrowUpRight className="w-5 h-5" />
            </Link>
          </div>
        </section>

        <NewsletterSection />
      </div>
    </div>
  );
};

const InvestorLogo = ({ name }: { name: string }) => (
  <span className="text-lg md:text-2xl font-bold tracking-tighter text-slate-900 whitespace-nowrap cursor-default hover:text-black transition-colors">
    {name}
  </span>
);

// Helper function to extract text from HTML (client-side safe)
function extractTextFromHTML(html: string, start: number = 0, length?: number): string {
  if (typeof document === 'undefined') return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  let text = div.textContent || div.innerText || '';
  if (length) {
    text = text.substring(start, start + length);
  }
  return text.trim();
}

// Helper function to extract a specific section from HTML content
function extractContentSection(html: string, sectionIndex: number): string {
  if (typeof document === 'undefined') return html;
  const div = document.createElement('div');
  div.innerHTML = html;
  const paragraphs = div.querySelectorAll('p');
  if (paragraphs.length > sectionIndex) {
    return paragraphs[sectionIndex].outerHTML;
  }
  // Fallback: return all paragraphs after the first
  return Array.from(paragraphs).slice(1).map(p => p.outerHTML).join('');
}