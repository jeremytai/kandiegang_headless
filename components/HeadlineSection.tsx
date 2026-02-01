
/**
 * HeadlineSection.tsx
 * The primary introduction block for the landing page.
 * Features:
 * - High-impact, geometric typography that defines the brand's aesthetic.
 * - Responsive: Adjusted font sizing and text balancing for all screen widths.
 */

import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { AnimatedHeadline } from './AnimatedHeadline';
import { imageSrc } from '../lib/images';

/** Guide photos from public/images/guides (base path without extension). */
const HEADLINE_IMAGE_BASES = [
  '/images/guides/björn_h',
  '/images/guides/christian_m',
  '/images/guides/emma_b',
  '/images/guides/jeremy',
  '/images/guides/katrin_h',
  '/images/guides/michael_m',
  '/images/guides/rilana_s',
  '/images/guides/ruth_p',
  '/images/guides/saskia_s',
  '/images/guides/silvia_b_',
  '/images/guides/tanja_d',
];

const ROTATE_INTERVAL_MS = 3000;

export const HeadlineSection: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"]
  });

  useEffect(() => {
    const id = setInterval(() => {
      setImageIndex((i) => (i + 1) % HEADLINE_IMAGE_BASES.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.8], [1, 0.95]);

  return (
    <section ref={ref} className="relative bg-primary-breath pt-20 md:pt-40 pb-16 md:pb-20">
      <motion.div 
        style={{ opacity, scale }}
        className="w-full flex flex-col items-center text-center z-10 px-6"
      >
        
        <h1 className="text-5xl md:text-8xl lg:text-[8.5vw] font-heading-thin font-normal tracking-normal leading-[0.85] text-secondary-purple-rain mb-2 md:mb-4 text-balance inline-flex flex-wrap items-center justify-center gap-x-[0.15em]">
          <AnimatedHeadline text="You found us " as="span" />
          <img
            key={imageIndex}
            src={imageSrc(HEADLINE_IMAGE_BASES[imageIndex], 400)}
            alt=""
            className="inline-block w-[0.85em] h-[0.85em] min-w-[2.5rem] min-h-[2.5rem] md:min-w-[3.5rem] md:min-h-[3.5rem] rounded-full object-cover align-middle mx-0.5"
            aria-hidden
          />
          <AnimatedHeadline text="!" as="span" />
        </h1>

        {/* <button className="bg-black text-white px-6 md:px-8 py-3.5 md:py-4 rounded-full font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-black/10 active:scale-95 text-sm md:text-base group">
          Reserve Kandie Gang <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button> */}
      </motion.div>
    </section>
  );
};
