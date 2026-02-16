/**
 * CompanySection.tsx
 * Showcases the key team members building Kandie Gang.
 * Features:
 * - A high-fidelity, interactive team list.
 * - TeamLink component: Uses spring-based physics to make profile images follow the user's cursor on hover.
 * - Responsive grid that highlights the international presence of the team.
 * - Guide data fetched from WordPress via GraphQL.
 */

import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useSpring, AnimatePresence } from 'framer-motion';
import { getRideGuides, type RideGuide, transformMediaUrl } from '../../lib/wordpress';

/** Fisher–Yates shuffle; returns a new array so the original order is unchanged. */
function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Guide data structure from WordPress */
interface Guide {
  name: string;
  url?: string;
  image: string;
  slug: string;
}

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
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch guides from WordPress on mount
  useEffect(() => {
    let cancelled = false;

    const fetchGuides = async () => {
      try {
        const wpGuides = await getRideGuides();
        if (cancelled) return;

        // Transform WordPress data to component format
        const transformedGuides: Guide[] = wpGuides.map((guide) => ({
          name: guide.title || 'Guide',
          url: guide.guideDetails?.link || undefined,
          image: guide.featuredImage?.node?.sourceUrl
            ? transformMediaUrl(guide.featuredImage.node.sourceUrl)
            : '/images/guides/placeholder.jpg',
          slug: guide.slug || '',
        }));

        setGuides(transformedGuides);
      } catch (error) {
        console.error('[CompanySection] Failed to fetch guides:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchGuides();

    return () => {
      cancelled = true;
    };
  }, []);

  // Shuffle guides once after loading
  const shuffledGuides = useMemo(() => {
    return loading ? [] : shuffle(guides);
  }, [guides, loading]);

  if (loading) {
    return (
      <section className="py-40 px-6 bg-breath flex flex-col items-center">
        <div className="max-w-4xl w-full text-center">
          <h2 className="text-3xl md:text-7xl font-light tracking-tight text-secondary-current text-balance mb-12 md:mb-16">
            Kandie Gang Guides
          </h2>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-6">
            <p className="text-slate-400">Loading guides...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-40 px-6 bg-breath flex flex-col items-center">
      <div className="max-w-4xl w-full text-center">
        <h2 className="text-3xl md:text-7xl font-light tracking-tight text-secondary-current text-balance mb-12 md:mb-16">
          Kandie Gang Guides
        </h2>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-6">
          {shuffledGuides.map((guide, i) => (
            <TeamLink
              key={guide.slug || guide.name}
              name={guide.name}
              url={guide.url}
              image={guide.image}
              pillClassName={PILL_STYLES[i % PILL_STYLES.length]}
            />
          ))}
        </div>
        <p className="mt-20 text-slate-400 text-md font-light">
          Our weekly Tuesday Social Road Rides are based in Hamburg and led by our Ride Guides.
          Besides the road rides, we often organize gravel rides and activities based around cycling
          culture.
        </p>
      </div>
    </section>
  );
};
