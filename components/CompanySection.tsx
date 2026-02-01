/**
 * CompanySection.tsx
 * Showcases the key team members building Kandie Gang.
 * Features:
 * - A high-fidelity, interactive team list.
 * - TeamLink component: Uses spring-based physics to make profile images follow the user's cursor on hover.
 * - Responsive grid that highlights the international presence of the team.
 * - Guide names and images are derived from public/images/guides (first name = part before underscore).
 */

import React, { useRef, useState, useMemo } from 'react';
import { motion, useSpring, AnimatePresence } from 'framer-motion';
import { imageSrc } from '../lib/images';

/** Fisher–Yates shuffle; returns a new array so the original order is unchanged. */
function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Derive display name from filename: part before first underscore, capitalized. No underscore = whole name. */
function firstNameFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '');
  const first = base.includes('_') ? base.split('_')[0] : base;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

/** Guide image base paths (no extension) under public/images/guides. Names are derived from filename. */
const GUIDE_IMAGES = [
  'björn_h',
  'christian_m',
  'emma_b',
  'jeremy',
  'katrin_h',
  'michael_m',
  'rilana_s',
  'ruth_p',
  'saskia_s',
  'silvia_b_',
  'tanja_d',
] as const;

/** Secondary pill styles: background + text. White text on dark/secondary; Signal (yellow) uses current or purple-rain text. */
const PILL_STYLES = [
  'bg-secondary-purple-rain text-white',
  'bg-secondary-current text-white',
  'bg-secondary-drift text-white',
  'bg-secondary-blush text-white',
  'bg-secondary-signal text-secondary-current',
  'bg-secondary-purple-rain text-white',
  'bg-secondary-current text-white',
  'bg-secondary-drift text-white',
  'bg-secondary-blush text-white',
  'bg-secondary-signal text-secondary-purple-rain',
  'bg-secondary-current text-white',
] as const;

const TeamLink: React.FC<{
  name: string;
  url: string;
  image: string;
  pillClassName: string;
}> = ({ name, url, image, pillClassName }) => {
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLAnchorElement>(null);

  const springConfig = { damping: 25, stiffness: 200 };
  const mouseX = useSpring(0, springConfig);
  const mouseY = useSpring(0, springConfig);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  return (
    <a
      ref={containerRef}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`relative inline-flex cursor-pointer items-center justify-center gap-1 rounded-full border-0 px-4 py-2 text-[13px] font-semibold transition-colors hover:opacity-90 group ${pillClassName}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
    >
      {name}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              position: 'absolute',
              left: mouseX,
              top: mouseY,
              pointerEvents: 'none',
              zIndex: 50,
              x: '-25%',
              y: '-110%',
            }}
            className="hidden lg:block"
          >
            <div className="h-[140px] w-[140px] overflow-hidden rounded-full shadow-2xl border-4 border-white bg-white">
              <img
                alt={name}
                loading="lazy"
                width="140"
                height="140"
                className="h-full w-full object-cover"
                src={image}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </a>
  );
};

export const CompanySection: React.FC = () => {
  const shuffledGuides = useMemo(() => shuffle(GUIDE_IMAGES), []);
  return (
    <section className="py-40 px-6 bg-breath flex flex-col items-center">
      <div className="max-w-4xl w-full text-center">
        <h3 className="text-[10px] font-bold text-purple-rain-400 uppercase tracking-[0.3em] mb-12">
          Your Guides
        </h3>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-6">
          {shuffledGuides.map((basePath, i) => (
            <TeamLink
              key={basePath}
              name={firstNameFromFilename(basePath)}
              url="#"
              image={imageSrc(`/images/guides/${basePath}`, 400)}
              pillClassName={PILL_STYLES[i % PILL_STYLES.length]}
            />
          ))}
        </div>
        <p className="mt-20 text-slate-400 text-sm font-light">
          And 20+ more pioneers in Hamburg and San Francisco.
        </p>
      </div>
    </section>
  );
};