/**
 * HomepageRotatingHeadline.tsx
 * The primary introduction block for the landing page.
 * Features:
 * - High-impact, geometric typography that defines the brand's aesthetic.
 * - Responsive: Adjusted font sizing and text balancing for all screen widths.
 */

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { AnimatedHeadline } from './AnimatedHeadline';
import { getRideGuides, transformMediaUrl } from '../../lib/wordpress';

const PLACEHOLDER_IMAGE = '/images/guides/placeholder.jpg';

function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const ROTATE_INTERVAL_MS = 3000;

export interface HomepageRotatingHeadlineProps {
  /** When true (minimal landing): show logo in section, compact padding. When false (full site): no logo here (nav has it), padding for StickyTop. */
  minimal?: boolean;
}

export const HomepageRotatingHeadline: React.FC<HomepageRotatingHeadlineProps> = ({
  minimal = false,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [guideImages, setGuideImages] = useState<string[]>([]);
  const shuffledImages = useMemo(
    () => (guideImages.length ? shuffle(guideImages) : []),
    [guideImages]
  );

  useEffect(() => {
    let cancelled = false;
    const fetchGuides = async () => {
      try {
        const wpGuides = await getRideGuides();
        if (cancelled) return;
        const images = wpGuides
          .map((g) =>
            g.featuredImage?.node?.sourceUrl
              ? transformMediaUrl(g.featuredImage.node.sourceUrl)
              : null
          )
          .filter((url): url is string => url !== null);
        setGuideImages(images.length ? images : [PLACEHOLDER_IMAGE]);
      } catch {
        setGuideImages([PLACEHOLDER_IMAGE]);
      }
    };
    fetchGuides();
    return () => {
      cancelled = true;
    };
  }, []);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  useEffect(() => {
    if (shuffledImages.length <= 1) return;
    const id = setInterval(() => {
      setImageIndex((i) => (i + 1) % shuffledImages.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [shuffledImages.length]);

  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.8], [1, 0.95]);

  const currentImage =
    shuffledImages.length > 0
      ? shuffledImages[imageIndex % shuffledImages.length]
      : PLACEHOLDER_IMAGE;

  return (
    <section
      ref={ref}
      className={`relative bg-primary-breath ${minimal ? 'pt-12 pb-[2em] md:pt-20 md:pb-20' : 'pt-[calc(4.5rem+2em)] pb-[2em] md:pt-40 md:pb-20'}`}
    >
      <motion.div
        style={{ opacity, scale }}
        className="w-full flex flex-col items-center justify-center text-center z-10 px-6"
      >
        {minimal && (
          <img
            src="/logos/kandiegang_logo.svg"
            alt="Kandie Gang"
            className="h-10 md:h-12 w-auto mb-8 md:mb-10"
          />
        )}
        <h1 className="text-5xl md:text-8xl lg:text-[8.5vw] font-heading-thin tracking-normal leading-[0.85] text-secondary-purple-rain mb-2 md:mb-4 text-balance inline-flex flex-wrap items-center justify-center gap-x-[0.15em]">
          <AnimatedHeadline text="You found us " as="span" />
          <img
            key={imageIndex}
            src={currentImage}
            alt=""
            width={400}
            height={400}
            className="inline-block w-[0.85em] h-[0.85em] min-w-[2.5rem] min-h-[2.5rem] md:min-w-[3.5rem] md:min-h-[3.5rem] rounded-full object-cover align-middle mx-0.5"
            aria-hidden
          />
          <AnimatedHeadline text="!" as="span" />
        </h1>
      </motion.div>
    </section>
  );
};
