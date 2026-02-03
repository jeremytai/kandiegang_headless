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
import { Link } from 'react-router-dom';
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
  'bjoern_h',
  'christian_m',
  'emma_b',
  'jeremy',
  'kathi_s',
  'katrin_h',
  'michael_m',
  'rilana_s',
  'ruth_p',
  'saskia_s',
  'silvia_b_',
  'tanja_d',
  'wiepke_h',
] as const;

/**
 * Optional URL for each guide (key = base path from GUIDE_IMAGES).
 * Add Strava, Instagram, personal site, or internal path (e.g. /guides/jeremy).
 * Omit or leave empty to show the pill without a link.
 */
const GUIDE_LINKS: Partial<Record<(typeof GUIDE_IMAGES)[number], string>> = {
  jeremy: 'https://www.strava.com/athletes/4653468',
  emma_b: 'https://www.instagram.com/kandie_gang/',
  rilana_s: 'https://www.strava.com/athletes/50138380',
  silvia_b_: 'https://www.instagram.com/kandie_gang/',
  tanja_d: 'https://www.strava.com/athletes/103874645',
  wiepke_h: 'https://www.strava.com/athletes/93143903',
  bjoern_h: 'https://www.instagram.com/kandie_gang/',
  christian_m: 'https://www.strava.com/athletes/25770175',
  katrin_h: 'https://www.strava.com/athletes/41164599',
  michael_m: 'https://www.strava.com/athletes/41164599',
  ruth_p: 'https://www.instagram.com/kandie_gang/',
  saskia_s: 'https://www.instagram.com/kandie_gang/',
  kathi_s: 'https://www.strava.com/athletes/5526439',
};

/** Secondary pill styles: background + text. White text on dark/secondary; Signal (yellow) uses current or purple-rain text. */
const PILL_STYLES = [
  'bg-secondary-purple-rain text-white',
  'bg-secondary-drift text-white',
  'bg-secondary-blush text-white',
  'bg-secondary-signal text-secondary-current',
  'bg-secondary-purple-rain text-white',
  'bg-secondary-drift text-white',
  'bg-secondary-blush text-white',
  'bg-secondary-signal text-secondary-purple-rain',
] as const;

const pillClass = (className: string) =>
  `relative inline-flex items-center justify-center gap-1 rounded-full border-0 px-6 py-3 text-[15px] md:text-base font-semibold transition-colors hover:opacity-90 group ${className}`;

const TeamLink: React.FC<{
  name: string;
  url: string | undefined;
  image: string;
  pillClassName: string;
}> = ({ name, url, image, pillClassName }) => {
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLElement | null>(null);
  const hasLink = url && url !== '#';
  const isInternal = hasLink && url.startsWith('/');

  const springConfig = { damping: 25, stiffness: 200 };
  const mouseX = useSpring(0, springConfig);
  const mouseY = useSpring(0, springConfig);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const content = (
    <>
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
            <div className="h-[140px] w-[140px] overflow-hidden rounded-full shadow-2xl border-2 border-white bg-white">
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
    </>
  );

  if (hasLink && isInternal) {
    return (
      <Link
        to={url}
        ref={containerRef as React.RefObject<HTMLAnchorElement | null>}
        className={pillClass(`${pillClassName} cursor-pointer`)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseMove={handleMouseMove}
      >
        {content}
      </Link>
    );
  }
  if (hasLink) {
    return (
      <a
        ref={containerRef as React.RefObject<HTMLAnchorElement | null>}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={pillClass(`${pillClassName} cursor-pointer`)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseMove={handleMouseMove}
      >
        {content}
      </a>
    );
  }
  return (
    <span
      ref={containerRef}
      className={pillClass(pillClassName)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
    >
      {content}
    </span>
  );
};

export const CompanySection: React.FC = () => {
  const shuffledGuides = useMemo(() => shuffle(GUIDE_IMAGES), []);
  return (
    <section className="py-40 px-6 bg-breath flex flex-col items-center">
      <div className="max-w-4xl w-full text-center">
      <h2 className="text-3xl md:text-7xl font-light tracking-tight text-secondary-current text-balance mb-12 md:mb-16">Kandie Gang Guides</h2>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-6">
          {shuffledGuides.map((basePath, i) => (
            <TeamLink
              key={basePath}
              name={firstNameFromFilename(basePath)}
              url={GUIDE_LINKS[basePath]}
              image={imageSrc(`/images/guides/${basePath}`, 400)}
              pillClassName={PILL_STYLES[i % PILL_STYLES.length]}
            />
          ))}
        </div>
        <p className="mt-20 text-slate-400 text-md font-light">
        Our weekly Tuesday Social Road Rides are based in Hamburg and led by our Ride Guides. Besides the road rides, we often organize gravel rides and activities based around cycling culture.
        </p>
      </div>
    </section>
  );
};