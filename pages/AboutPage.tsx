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
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Shield, Zap, Heart, Cpu, Loader2, AlertCircle } from 'lucide-react';
import { CompanySection } from '../components/CompanySection';
import { AboutHero } from '../components/AboutHero';
import { ImageMarquee } from '../components/ImageMarquee';
import { getPageBySlug, WPPage } from '../lib/wordpress';

export const AboutPage: React.FC = () => {
  const [page, setPage] = useState<WPPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true);
      setError(null);
      try {
        const pageData = await getPageBySlug('about');
        if (pageData) {
          setPage(pageData);
        } else {
          setError('Page not found in WordPress');
        }
      } catch (err) {
        console.error('Failed to fetch About page:', err);
        setError('Failed to load content from WordPress');
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, []);

  // Default content to display if WordPress content is not available
  const defaultContent = {
    intro: "We believe that robots belong in our homes. Not just to perform tasks, but to unlock human potential by removing the burden of repetitive chores.",
    visionTitle: "Building a future where your home works for you.",
    visionText: [
      "The home is our most private, sacred space. Bringing a robot into that space requires a radical commitment to safety, privacy, and aesthetic harmony.",
      "At Kandie Gang, we're not just building hardware; we're building a new kind of relationship between humans and machines. One built on trust, utility, and elegance."
    ]
  };

  // Extract content from WordPress HTML or use defaults
  const introText = page?.content 
    ? extractTextFromHTML(page.content, 0, 200) || defaultContent.intro
    : defaultContent.intro;

  return (
    <div className="bg-white overflow-x-hidden">
      <AboutHero />

      <div className="max-w-7xl mx-auto px-6">
        <AnimatePresence mode="wait">
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
              {/* Skeleton loader */}
              <div className="mt-8 space-y-4">
                <div className="h-8 bg-slate-100 rounded w-3/4 animate-pulse" />
                <div className="h-8 bg-slate-100 rounded w-full animate-pulse" />
                <div className="h-8 bg-slate-100 rounded w-5/6 animate-pulse" />
              </div>
            </motion.div>
          ) : error ? (
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
              className="my-40 max-w-3xl"
            >
              {page?.content ? (
                <div 
                  className="text-3xl md:text-4xl font-light text-slate-500 leading-tight tracking-tight prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: page.content }}
                />
              ) : (
                <p className="text-3xl md:text-4xl font-light text-slate-500 leading-tight tracking-tight">
                  {introText}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-20 mb-40">
          <div className="space-y-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Our Vision</h2>
            <h3 className="text-4xl md:text-5xl font-bold tracking-tighter text-slate-900 leading-none">
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

      <div className="max-w-7xl mx-auto px-6">
        <section className="my-60">
          <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400 mb-20 text-center">Our Principles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            <PrincipleCard 
              icon={<Shield className="w-6 h-6" />}
              title="Safety first"
              desc="Compliant control and soft-body mechanics ensure Kandie Gang is always safe around pets, children, and fragile objects."
            />
            <PrincipleCard 
              icon={<Zap className="w-6 h-6" />}
              title="Real utility"
              desc="We focus on the tasks people actually dislike—the mundane repetitive chores that eat up your evening."
            />
            <PrincipleCard 
              icon={<Heart className="w-6 h-6" />}
              title="Privacy by design"
              desc="All vision processing happens locally. Your home data never leaves your front door."
            />
            <PrincipleCard 
              icon={<Cpu className="w-6 h-6" />}
              title="Continuous Learning"
              desc="The Skill Library allows Kandie Gang to get smarter every day, learning from a collective intelligence network."
            />
          </div>
        </section>

        <CompanySection />

        <section className="py-40 border-t border-slate-100 mb-20">
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
        </section>

        <section className="bg-slate-50 rounded-[48px] p-12 md:p-24 flex flex-col items-center text-center mb-40">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-slate-900 mb-8">Want to build with us?</h2>
          <p className="text-xl text-slate-500 mb-12 max-w-xl font-light">
            We're a team of engineers, designers, and dreamers based in Hamburg and SF.
          </p>
          <button className="bg-black text-white px-10 py-5 rounded-full font-bold flex items-center gap-3 hover:bg-slate-800 transition-all active:scale-95">
            View open roles <ArrowUpRight className="w-5 h-5" />
          </button>
        </section>
      </div>
    </div>
  );
};

const PrincipleCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="space-y-6 group">
    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-900 group-hover:bg-[#f9f100] transition-colors duration-500">
      {icon}
    </div>
    <h3 className="text-xl font-bold tracking-tight text-slate-900">{title}</h3>
    <p className="text-slate-500 leading-relaxed font-light">{desc}</p>
  </div>
);

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