
/**
 * HorizontalRevealSection.tsx
 * A side-scrolling feature showcase that pins to the screen.
 * Features:
 * - Translates vertical scroll progress into horizontal movement across multiple cards.
 * - Persistent side-navigation dots that reflect current progress.
 * - SegmentedNav: A bottom navigation pill that allows jumping between different technical aspects (Features, 360°, Anatomy).
 * - Responsive adjustments: Cards occupy more screen space on mobile.
 */

import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

const SegmentedNav: React.FC<{ activeIndex: number, onSelect: (index: number) => void, progress: MotionValue<number> }> = ({ activeIndex, onSelect, progress }) => {
  const segments = ["Features", "360°", "Anatomy"];
  
  const opacity = useTransform(progress, [0, 0.1, 0.9, 1], [0, 1, 1, 0]);
  const y = useTransform(progress, [0, 0.1, 0.9, 1], [40, 0, 0, 40]);

  return (
    <motion.div 
      style={{ opacity, y }}
      className="fixed bottom-10 left-0 w-full z-[100] pointer-events-none flex justify-center px-6"
    >
      <nav className="pointer-events-auto relative mx-auto flex w-fit justify-center gap-0.5 md:gap-1 rounded-full bg-[hsla(0,0%,80%,0.2)] p-1.5 backdrop-blur-xl border border-white/10 shadow-lg">
        {segments.map((segment, i) => (
          <div key={segment} className="relative my-auto cursor-pointer text-center select-none">
            <button
              onClick={() => onSelect(i)}
              className={`z-10 inline-flex h-8 md:h-9 cursor-pointer flex-nowrap items-center justify-center px-3 md:px-4 py-1.5 text-[12px] md:text-sm font-medium transition-colors duration-300 rounded-full ${
                activeIndex === i ? 'text-black' : 'text-slate-600'
              }`}
            >
              {activeIndex === i && (
                <motion.div
                  layoutId="active-nav-pill"
                  className="absolute inset-0 bg-white rounded-full -z-10 shadow-sm"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              {segment}
            </button>
          </div>
        ))}
      </nav>
    </motion.div>
  );
};

const HorizontalCard: React.FC<{ title: string, desc: string, img: string }> = ({ title, desc, img }) => (
  <div className="relative flex-none w-[90vw] md:w-[60vw] aspect-[4/5] md:aspect-[16/10] rounded-[32px] md:rounded-[48px] overflow-hidden p-8 md:p-20 flex flex-col justify-center bg-slate-900 text-white shadow-2xl group">
    <div className="relative z-10 max-w-xl">
      <h3 className="text-4xl md:text-8xl font-bold tracking-tighter mb-4 md:mb-8 group-hover:scale-105 transition-transform duration-700 origin-left text-balance">{title}</h3>
      <p className="opacity-60 text-base md:text-2xl leading-relaxed font-light tracking-tight text-balance">{desc}</p>
    </div>
    <div className="absolute inset-0 z-0">
      <img 
        src={img} 
        className="w-full h-full object-cover opacity-50 grayscale transition-all duration-1000 group-hover:grayscale-0 group-hover:opacity-60" 
        alt={title} 
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
    </div>
  </div>
);

export const HorizontalRevealSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"]
  });

  // Calculate transform based on card width + gap
  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-75%"]);
  
  useEffect(() => {
    return scrollYProgress.on("change", (v) => {
      if (v < 0.35) setActiveIndex(0);
      else if (v < 0.70) setActiveIndex(1);
      else setActiveIndex(2);
    });
  }, [scrollYProgress]);

  const scrollToSegment = (index: number) => {
    if (!sectionRef.current) return;
    const scrollHeight = sectionRef.current.scrollHeight;
    const targetY = sectionRef.current.offsetTop + (scrollHeight / 3) * index;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  };

  const indicators = [0, 1, 2, 3];
  
  return (
    <section ref={sectionRef} className="relative h-[400vh] md:h-[500vh] bg-[#fdfdfd]">
      <div className="sticky top-0 h-screen w-full flex flex-col justify-center overflow-hidden">
        <div className="absolute top-12 md:top-20 left-0 w-full px-8 md:px-16 flex justify-between items-start z-20">
          <h2 className="text-3xl md:text-7xl font-bold tracking-tighter text-[#111827] text-balance">Designed for real use</h2>
          <div className="hidden md:flex items-center gap-2 text-slate-400 font-medium text-xs md:text-sm pt-4">
            <span className="tracking-tight uppercase tracking-widest text-[10px]">Scroll to explore</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        <div className="absolute left-4 md:left-12 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2">
          {indicators.map((i) => {
            const start = i * 0.25;
            const end = (i + 1) * 0.25;
            const dotOpacity = useTransform(scrollYProgress, [start, start + 0.1, end - 0.1, end], [0.1, 0.4, 0.4, 0.1]);
            return (
              <motion.div 
                key={i}
                style={{ opacity: dotOpacity }}
                className="w-[2px] md:w-[3px] h-4 md:h-6 rounded-full bg-black origin-center"
              />
            );
          })}
        </div>

        <motion.div style={{ x }} className="flex gap-6 md:gap-8 px-[5vw] md:px-[15vw] items-center">
          <HorizontalCard 
            title="Features"
            desc="Every aspect of Kandie Gang is designed to blend into your living space while providing maximum utility."
            img="https://picsum.photos/seed/feature-memo/1200/800"
          />
          <HorizontalCard 
            title="360° Visibility"
            desc="Lidar and high-res vision sensors give Kandie Gang a perfect understanding of its surroundings in all directions."
            img="https://picsum.photos/seed/vision-memo/1200/800"
          />
          <HorizontalCard 
            title="Anatomy"
            desc="Compliant control actuators and passive stability make Kandie Gang the safest household robot ever built."
            img="https://picsum.photos/seed/anatomy-memo/1200/800"
          />
          <HorizontalCard 
            title="Soft Mechanics"
            desc="Soft-to-the-touch shell, with no sharp corners and can be wiped down with any household cleaning product."
            img="https://picsum.photos/seed/clean-memo/1200/800"
          />
        </motion.div>

        <SegmentedNav activeIndex={activeIndex} onSelect={scrollToSegment} progress={scrollYProgress} />
      </div>
    </section>
  );
};