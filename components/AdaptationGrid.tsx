
/**
 * AdaptationGrid.tsx
 * Showcases Kandie Gang performing various autonomous tasks in real home environments.
 * Features:
 * - A grid of video cards on desktop that transforms into a side-scrolling snap gallery on mobile.
 * - Integration of the 'no-scrollbar' utility for clean aesthetics.
 * - Video autoplay and hover interactions to reveal task-specific meta-data (labels, tags).
 * - Custom pagination dots specifically for the mobile scrolling view.
 */

import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { Maximize2, Play } from 'lucide-react';

interface AdaptationCardProps {
  videoSrc: string;
  poster: string;
  label: string;
  tags: string[];
}

const AdaptationMediaCard: React.FC<AdaptationCardProps> = ({ videoSrc, poster, label, tags }) => {
  return (
    <div className="relative w-[82vw] md:w-full shrink-0 snap-start">
      <div className="group relative aspect-video overflow-hidden rounded-xl bg-black border border-slate-100 shadow-xl">
        <video 
          autoPlay 
          muted 
          loop 
          playsInline
          poster={poster}
          className="absolute inset-0 h-full w-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-1000"
        >
          <source src={videoSrc} type="application/x-mpegURL" />
          <source src={videoSrc.replace('.m3u8', '.mp4')} type="video/mp4" />
          <img 
            src={poster} 
            alt={label} 
            className="absolute inset-0 h-full w-full object-cover" 
            loading="lazy" 
          />
        </video>

        <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 md:p-6 pointer-events-none">
          <div className="flex items-start justify-between">
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag} className="inline-block px-2.5 py-1 rounded-md bg-black/40 backdrop-blur-md border border-white/20 text-[10px] font-bold text-white uppercase tracking-wider">
                  {tag}
                </span>
              ))}
            </div>
            <button 
              className="pointer-events-auto p-2 rounded-full bg-white/10 backdrop-blur-lg border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-all duration-300"
              aria-label="Expand video to fullscreen"
              title="Expand video to fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 text-white shadow-lg">
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            </div>
            <p className="text-sm md:text-base font-bold text-white tracking-tight drop-shadow-lg">
              {label}
            </p>
          </div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 pointer-events-none" />
      </div>
    </div>
  );
};

export const AdaptationGrid: React.FC = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const scrollPosition = el.scrollLeft;
      const cardWidth = el.querySelector('div')?.offsetWidth || 0;
      const gap = 16;
      const index = Math.round(scrollPosition / (cardWidth + gap));
      setActiveSlide(index);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="py-24 w-full bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
          <div className="col-span-1 lg:col-span-2 flex flex-col justify-between rounded-[32px] border border-slate-100 p-8 md:p-10 bg-white shadow-[0_4px_24px_-12px_rgba(0,0,0,0.05)] min-h-[300px] lg:min-h-full">
            <h3 className="text-2xl md:text-4xl font-bold tracking-tight text-slate-900 leading-[1.15] mb-8">
              Every home is different. <br className="hidden lg:block" />Kandie Gang works in yours.
            </h3>
            <p className="text-slate-500 font-light leading-relaxed text-sm md:text-base">
              We believe Kandie Gang should be easy to use in the real-world, working autonomously out-of-the-box. Hundreds of people in unique homes show Kandie Gang how chores are done each day, so Kandie Gang can robustly handle the chaos of real life.
            </p>
          </div>

          <div className="col-span-1 lg:col-span-4 overflow-hidden -mx-6 px-6 md:mx-0 md:px-0">
            <div 
              ref={scrollContainerRef}
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar md:grid md:grid-cols-2 md:overflow-visible pb-6 md:pb-0 scroll-smooth scroll-padding-x-6"
            >
              <AdaptationMediaCard 
                videoSrc="https://stream.mux.com/d8gKqaem3hi01tFEkbkGl00SFt01bnBlIcQzEuEPFnU9mQ.m3u8"
                poster="https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop"
                label="Picking up utensils"
                tags={["Autonomous", "4×"]}
              />
              <AdaptationMediaCard 
                videoSrc="https://stream.mux.com/np00yxVOCqSKb00LMiTYRTv9KeVwcoGYFetwPm4BzR02Nk.m3u8"
                poster="https://images.unsplash.com/photo-1581622558663-b2e33377dfb2?q=80&w=800&auto=format&fit=crop"
                label="Loading the dishwasher"
                tags={["Autonomous", "4×"]}
              />
            </div>

            <div className="flex justify-center gap-2.5 mt-4 md:hidden">
              {[0, 1].map((i) => (
                <div 
                  key={i} 
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                    activeSlide === i ? 'bg-black w-4' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};