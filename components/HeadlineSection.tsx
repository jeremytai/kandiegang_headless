
/**
 * HeadlineSection.tsx
 * The primary introduction block for the landing page.
 * Features:
 * - High-impact, geometric typography that defines the brand's aesthetic.
 * - Responsive: Adjusted font sizing and text balancing for all screen widths.
 */

import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Star, ArrowRight } from 'lucide-react';

export const HeadlineSection: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.8], [1, 0.95]);

  return (
    <section ref={ref} className="relative bg-primary-breath pt-20 md:pt-40 pb-16 md:pb-20">
      <motion.div 
        style={{ opacity, scale }}
        className="w-full flex flex-col items-center text-center z-10 px-6"
      >
        
        <h1 className="text-5xl md:text-8xl lg:text-[8.5vw] font-bold tracking-tighter leading-[0.85] text-slate-900 mb-2 md:mb-4 text-balance">
          You've found us!
        </h1>

        {/* <button className="bg-black text-white px-6 md:px-8 py-3.5 md:py-4 rounded-full font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-black/10 active:scale-95 text-sm md:text-base group">
          Reserve Kandie Gang <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button> */}
      </motion.div>
    </section>
  );
};
