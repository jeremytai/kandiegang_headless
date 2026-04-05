/**
 * ExpandingHero.tsx
 * An immersive, scroll-driven hero component.
 * Features:
 * - Uses Framer Motion to animate a dynamic `clip-path` inset.
 * - As the user scrolls, a rounded image card expands to fill the entire viewport.
 * - Optional imageUrl/imageAlt for story pages; otherwise uses default asset.
 * - On Safari / reduced-motion: full-bleed static hero (no clip-path animation, cheaper).
 */

import React, { useRef, useState, useSyncExternalStore } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { imageSrc, imageSrcSet } from '../../lib/images';
import { useLightMotionBackdrop } from '../../hooks/useLightMotionBackdrop';

function subscribeMobile(cb: () => void) {
  const mq = window.matchMedia('(max-width: 767px)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

function isMobileViewport(): boolean {
  return window.matchMedia('(max-width: 767px)').matches;
}

const DEFAULT_ALT =
  'We provide a safe space that brings FLINTA* and BIPOC closer to cycling culture (without excluding men).';

const HERO_IMAGES = [
  '/images/250701_photosafari-12',
  '/images/240707_humanrides-75',
  '/images/231112_stevenscup_neuduvenstedt-10',
] as const;

export interface ExpandingHeroProps {
  /** When set (e.g. story featured image), this URL is used instead of the default asset. */
  imageUrl?: string;
  imageAlt?: string;
}

function HeroImage({
  src,
  srcSet,
  imageAlt,
  imageUrl,
}: {
  src: string;
  srcSet: string | undefined;
  imageAlt: string;
  imageUrl?: string;
}) {
  return (
    <div className="relative flex-1 w-full h-full overflow-hidden">
      <img
        src={src}
        srcSet={srcSet}
        sizes="100vw"
        width={1920}
        height={1080}
        className="w-full h-full object-cover"
        alt={imageAlt}
        loading={imageUrl ? 'eager' : 'lazy'}
        fetchPriority={imageUrl ? undefined : 'high'}
      />
      <div className="absolute inset-0 bg-black/5" />
    </div>
  );
}

function ExpandingHeroMotion({ imageUrl, imageAlt }: ExpandingHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [defaultPath] = useState(() => HERO_IMAGES[Math.floor(Math.random() * HERO_IMAGES.length)]);
  const isMobile = useSyncExternalStore(subscribeMobile, isMobileViewport, () => false);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const entryProgress = useTransform(scrollYProgress, [0, 1], [0, 1]);

  const clipPath = useTransform(entryProgress, (v) => {
    const padding = isMobile ? '4vw' : '2vw';
    const radius = '12px';
    return `inset(0px calc(${padding} * (1 - ${v})) round calc(${radius} * (1 - ${v})))`;
  });

  const src = imageUrl ?? imageSrc(defaultPath);
  const srcSet = imageUrl ? undefined : imageSrcSet(defaultPath);

  return (
    <section ref={containerRef} className="relative h-[100vh] md:h-[100vh] bg-primary-breath">
      <div className="h-screen w-full flex flex-col items-center overflow-hidden">
        <motion.div
          style={{
            clipPath,
            width: '100%',
            height: '100vh',
          }}
          className="relative bg-secondary-purple-rain overflow-hidden flex flex-col"
        >
          <HeroImage src={src} srcSet={srcSet} imageAlt={imageAlt} imageUrl={imageUrl} />
        </motion.div>
      </div>
    </section>
  );
}

function ExpandingHeroStatic({ imageUrl, imageAlt }: ExpandingHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [defaultPath] = useState(() => HERO_IMAGES[Math.floor(Math.random() * HERO_IMAGES.length)]);

  const src = imageUrl ?? imageSrc(defaultPath);
  const srcSet = imageUrl ? undefined : imageSrcSet(defaultPath);

  return (
    <section ref={containerRef} className="relative h-[100vh] md:h-[100vh] bg-primary-breath">
      <div className="h-screen w-full flex flex-col items-center overflow-hidden">
        <div className="relative w-full h-[100vh] bg-secondary-purple-rain overflow-hidden flex flex-col">
          <HeroImage src={src} srcSet={srcSet} imageAlt={imageAlt} imageUrl={imageUrl} />
        </div>
      </div>
    </section>
  );
}

export const ExpandingHero: React.FC<ExpandingHeroProps> = (props) => {
  const lightMotion = useLightMotionBackdrop();
  if (lightMotion) {
    return <ExpandingHeroStatic {...props} />;
  }
  return <ExpandingHeroMotion {...props} />;
};
