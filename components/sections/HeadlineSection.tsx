/**
 * HeadlineSection.tsx
 * The primary introduction block for the landing page.
 * Features:
 * - High-impact, geometric typography that defines the brand's aesthetic.
 * - Responsive: Adjusted font sizing and text balancing for all screen widths.
 * - Guide photos fetched from WordPress via GraphQL.
 */

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { AnimatedHeadline } from '../visual/AnimatedHeadline';
import { getRideGuides, transformMediaUrl } from '../../lib/wordpress';

function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const ROTATE_INTERVAL_MS = 3000;

export const HeadlineSection: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [guideImages, setGuideImages] = useState<string[]>([]);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  // Fetch guide images from WordPress on mount
  useEffect(() => {
    let cancelled = false;

    const fetchGuideImages = async () => {
      try {
        const guides = await getRideGuides();
        if (cancelled) return;

        // Extract image URLs and filter out any without images
        const imageUrls = guides
          .filter((guide) => guide.featuredImage?.node?.sourceUrl)
          .map((guide) => transformMediaUrl(guide.featuredImage!.node.sourceUrl));

        setGuideImages(imageUrls);
      } catch (error) {
        console.error('[HeadlineSection] Failed to fetch guide images:', error);
      }
    };

    fetchGuideImages();

    return () => {
      cancelled = true;
    };
  }, []);

  // Shuffle images once after loading
  const shuffledImages = useMemo(() => {
    return guideImages.length > 0 ? shuffle(guideImages) : [];
  }, [guideImages]);

  // Rotate through images
  useEffect(() => {
    if (shuffledImages.length === 0) return;

    const id = setInterval(() => {
      setImageIndex((i) => (i + 1) % shuffledImages.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [shuffledImages.length]);

  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.8], [1, 0.95]);

  return (
    <section ref={ref} className="relative bg-primary-breath pt-20 md:pt-40 pb-16 md:pb-20">
      <motion.div
        style={{ opacity, scale }}
        className="w-full flex flex-col items-center text-center z-10 px-6"
      >
        <h1 className="text-5xl md:text-8xl lg:text-[8.5vw] font-heading-thin tracking-normal leading-[0.85] text-secondary-purple-rain mb-2 md:mb-4 text-balance inline-flex flex-wrap items-center justify-center gap-x-[0.15em]">
          <AnimatedHeadline text="You found us " as="span" />
          {shuffledImages.length > 0 && (
            <img
              key={imageIndex}
              src={shuffledImages[imageIndex]}
              alt=""
              className="inline-block w-[0.85em] h-[0.85em] min-w-[2.5rem] min-h-[2.5rem] md:min-w-[3.5rem] md:min-h-[3.5rem] rounded-full object-cover align-middle mx-0.5"
              aria-hidden
            />
          )}
          <AnimatedHeadline text="!" as="span" />
        </h1>

        {/* <button className="bg-black text-white px-6 md:px-8 py-3.5 md:py-4 rounded-full font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-black/10 active:scale-95 text-sm md:text-base group">
          Reserve Kandie Gang <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button> */}
      </motion.div>
    </section>
  );
};
