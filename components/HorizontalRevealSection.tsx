
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
import { motion, useScroll, useTransform, useSpring, MotionValue } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

const SegmentedNav: React.FC<{
  activeIndex: number;
  onSelect: (index: number) => void;
  progress: MotionValue<number>;
  sectionInView: MotionValue<number>;
}> = ({ activeIndex, onSelect, progress, sectionInView }) => {
  const segments = ["Let's Ride", "Stories", "Membership", "Shop"];
  
  // Visible only when section is in viewport; within section, hide when leaving
  const opacityInSection = useTransform(progress, [0, 0, 0.9, 1], [1, 1, 1, 0]);
  const opacity = useTransform([opacityInSection, sectionInView], ([o, v]) => (o as number) * (v as number));
  // Animate up from bottom when section enters view, down only when leaving section (not when at Shop)
  const y = useTransform(
    [sectionInView, progress],
    ([v, p]: (number | string)[]) => {
      const vn = v as number;
      const pn = p as number;
      if (pn > 0.92) return 40 * (pn - 0.92) / 0.08; // slide down only when really leaving section
      if (vn < 0.1) return 40; // below when section not in view
      if (vn < 0.2) return 40 - 40 * (vn - 0.1) / 0.1; // slide up as section enters
      return 0;
    }
  );

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
  <div className="relative flex-none w-[90vw] md:w-[60vw] aspect-[4/5] md:aspect-[16/10] rounded-xl overflow-hidden p-8 md:p-20 flex flex-col justify-end bg-slate-900 text-white shadow-2xl group">
    <div className="relative z-10 max-w-xl">
      <h3 className="text-3xl md:text-5xl font-light tracking-tight mb-2 md:mb-3 group-hover:scale-105 transition-transform duration-700 origin-left text-balance">{title}</h3>
      <p className="opacity-60 text-sm md:text-base leading-relaxed font-light tracking-tight text-balance">{desc}</p>
    </div>
    <div className="absolute inset-0 z-0">
      <img 
        src={img} 
        className="w-full h-full object-cover" 
        alt={title} 
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
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

  // Section in viewport: nav visible whenever section overlaps viewport (including at top when "Let's Ride" is selected)
  const { scrollYProgress: sectionInViewProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });
  // Nav appears only after section is well in view (not as soon as it overlaps viewport)
  const sectionInView = useTransform(sectionInViewProgress, [0, 0.75, 0.98, 1], [0, 1, 1, 0]);

  const cardCount = 4;
  // Each card (1–4) lines up to the same left edge as the 1st card; last card less translation so it's not too far left.
  const xTarget = useTransform(
    scrollYProgress,
    [0, 0.25, 0.5, 0.75, 0.85, 1],
    ["0%", "-20%", "-37%", "-58%", "-58%", "-58%"]
  );
  // Spring with a little bounce when Shop (4th card) reaches its end point
  const x = useSpring(xTarget, { stiffness: 320, damping: 24 });
  
  useEffect(() => {
    return scrollYProgress.on("change", (v) => {
      const segment = Math.min(Math.floor(v * cardCount), cardCount - 1);
      setActiveIndex(segment);
    });
  }, [scrollYProgress]);

  const scrollToSegment = (index: number) => {
    if (!sectionRef.current) return;
    const scrollHeight = sectionRef.current.scrollHeight;
    // Each pill scrolls so its card is in the same x position as the 1st card at start (same left margin).
    // Last (4th) card: same left margin as 1st card.
    const progressPerSegment = [0, 0.25, 0.5, 0.75];
    const progress = progressPerSegment[Math.min(index, cardCount - 1)] ?? 0;
    const targetY = sectionRef.current.offsetTop + scrollHeight * progress;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  };

  const indicators = [0, 1, 2, 3];
  
  return (
    <section ref={sectionRef} className="relative h-[400vh] md:h-[500vh] bg-secondary-purple-rain">
      <div className="sticky top-0 h-screen w-full flex flex-col justify-center overflow-hidden">
        <div className="absolute top-12 md:top-20 left-0 w-full px-8 md:px-16 pb-12 md:pb-16 flex justify-between items-start z-20">
          <h2 className="text-3xl md:text-7xl font-light tracking-tight text-secondary-current text-balance">Community is Our Catalyst</h2>
          <div className="hidden md:flex items-center gap-2 text-slate-400 font-medium text-xs md:text-sm pt-4">
            <span className="tracking-tight uppercase tracking-widest text-secondary-current text-[10px]">Scroll down to explore</span>
            <ChevronRight className="w-4 h-4 text-secondary-current" />
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

        <motion.div
          style={{ x }}
          className="flex gap-6 md:gap-8 pl-[2vw] md:pl-[4vw] pr-[5vw] md:pr-[15vw] items-center min-w-max mt-16 md:mt-24"
        >
          <HorizontalCard 
            title="Let's Ride"
            desc="People join us for our community rides, to exchange bicycle knowledge and build friendships—no matter their gender, race or social background."
            img="https://leckerbisschen.s3.eu-central-1.amazonaws.com/wp-content/uploads/2025/09/06220134/250923_kandiegangsocialride-20-scaled.jpg"
          />
          <HorizontalCard 
            title="Stories"
            desc="We believe actions speak louder than words. Because belonging emerges when people show up, ride, and co-create together."
            img="https://leckerbisschen.s3.eu-central-1.amazonaws.com/wp-content/uploads/2025/11/10165246/251031_halloween_gravelo_abbett-89.jpg"
          />
          <HorizontalCard 
            title="Membership"
            desc="An annual subscription includes early access to weekly local rides, members only access to photos, discounts on products, and much more."
            img="https://leckerbisschen.s3.eu-central-1.amazonaws.com/wp-content/uploads/2025/04/08130454/250401_kandiegang_seasonopener_2025-14-2048x1539.jpg"
          />
          <HorizontalCard 
            title="Shop"
            desc="Excluive Kandie Gang products including limited edition apparel and accessories because we believe in the power of collectivism and standing out from the crowd."
            img="https://leckerbisschen.s3.eu-central-1.amazonaws.com/wp-content/uploads/2025/06/24094519/250621_hamburg-17-768x577.jpg"
          />
        </motion.div>

        <SegmentedNav activeIndex={activeIndex} onSelect={scrollToSegment} progress={scrollYProgress} sectionInView={sectionInView} />
      </div>
    </section>
  );
};