/**
 * ImageMarquee.tsx
 * An infinite, horizontal-scrolling image gallery.
 * Features:
 * - Uses Framer Motion's `animate` with a linear ease to create a seamless loop.
 * - Varies aspect ratios between cards (portrait vs. landscape) for a dynamic visual rhythm.
 * - Hover effects on individual images to add micro-interactions.
 * - Clones images to ensure the marquee never shows a gap during loop.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { imageSrc } from '../lib/images';

/** Base paths for marquee images. Use 1200w in prod for good quality at reasonable size. */
const MARQUEE_IMAGE_BASES = [
  '/images/231112_stevenscup_neuduvenstedt-10',
  '/images/240707_humanrides-75',
  '/images/230422_kandiegang_radbahn-50',
  '/images/250401_hamburg-37',
  '/images/230422_kandiegang_radbahn-50',
  '/images/251031_halloween_gravelo_abbett-86',
];

export const ImageMarquee: React.FC = () => {
  const images = MARQUEE_IMAGE_BASES.map((base) => imageSrc(base, 1200));
  const marqueeImages = [...images, ...images];

  return (
    <section className="w-full overflow-hidden py-12 lg:py-16 bg-white">
      <motion.div
        className="flex gap-[12vw] pl-[6vw]"
        animate={{ x: ['0%', '-50%'] }}
        transition={{
          duration: 50,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        {marqueeImages.map((src, idx) => (
          <div
            key={idx}
            className={`relative flex-none overflow-hidden rounded-xl bg-slate-100 shadow-sm
              ${idx % 2 === 0 ? 'w-[75vw] md:w-[28vw] aspect-[3/4]' : 'w-[85vw] md:w-[38vw] aspect-[16/10]'}
            `}
          >
            <img
              src={src}
              alt={`Gallery item ${idx}`}
              className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
              loading="lazy"
            />
          </div>
        ))}
      </motion.div>
    </section>
  );
};
