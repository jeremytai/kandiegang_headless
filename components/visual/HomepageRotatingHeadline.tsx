/**
 * HomepageRotatingHeadline.tsx
 * The primary introduction block for the landing page.
 * Features:
 * - High-impact, geometric typography that defines the brand's aesthetic.
 * - Responsive: Adjusted font sizing and text balancing for all screen widths.
 * - Scroll-driven fade on full path; static block on Safari / reduced-motion.
 * - Heart brand mark (kg_heart.svg) shows first; guide photos appear clipped to the heart once loaded.
 */

import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { AnimatedHeadline } from './AnimatedHeadline';
import { useHomepageGuideImageRotation } from '../../hooks/useHomepageGuideImageRotation';
import { useLightMotionBackdrop } from '../../hooks/useLightMotionBackdrop';

export interface HomepageRotatingHeadlineProps {
  /** When true (minimal landing): show logo in section, compact padding. When false (full site): no logo here (nav has it), padding for StickyTop. */
  minimal?: boolean;
}

const HEART_SVG = '/logos/kg_heart.svg';

/** Mask + size so photos read inside the heart; matches public/logos/kg_heart.svg */
const heartPhotoMaskClass =
  "[mask-image:url('/logos/kg_heart.svg')] [-webkit-mask-image:url('/logos/kg_heart.svg')] [mask-size:contain] [-webkit-mask-size:contain] [mask-repeat:no-repeat] [-webkit-mask-repeat:no-repeat] [mask-position:center] [-webkit-mask-position:center]";

const heartSlotClassName =
  'relative inline-block align-middle mx-0.5 w-[0.85em] h-[0.85em] min-w-[2.5rem] min-h-[2.5rem] md:min-w-[3.5rem] md:min-h-[3.5rem] shrink-0';

function HeadlineHeartSlot({
  currentImage,
  guidesReady,
}: {
  currentImage: string;
  guidesReady: boolean;
}) {
  /** Shown inside the mask; heart shows until the first photo is ready, then we preload before swapping on rotation. */
  const [displayedPhotoSrc, setDisplayedPhotoSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!guidesReady || !currentImage) {
      setDisplayedPhotoSrc(null);
      return;
    }
    if (currentImage === displayedPhotoSrc) return;

    let cancelled = false;
    const target = currentImage;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setDisplayedPhotoSrc(target);
    };
    img.onerror = () => {
      if (!cancelled) setDisplayedPhotoSrc(target);
    };
    img.src = target;
    return () => {
      cancelled = true;
    };
  }, [guidesReady, currentImage, displayedPhotoSrc]);

  const showHeart = !guidesReady || !displayedPhotoSrc;

  return (
    <span className={heartSlotClassName}>
      {showHeart && (
        <img
          src={HEART_SVG}
          alt=""
          width={52}
          height={50}
          className="absolute inset-0 z-10 m-auto max-h-full max-w-full object-contain object-center pointer-events-none"
          aria-hidden
        />
      )}
      {guidesReady && displayedPhotoSrc && (
        <img
          key={displayedPhotoSrc}
          src={displayedPhotoSrc}
          alt=""
          width={400}
          height={400}
          className={`absolute inset-0 z-20 h-full w-full object-cover transition-opacity duration-300 opacity-100 ${heartPhotoMaskClass}`}
          aria-hidden
        />
      )}
    </span>
  );
}

function HeadlineContent({
  minimal,
  currentImage,
  guidesReady,
}: {
  minimal: boolean;
  currentImage: string;
  guidesReady: boolean;
}) {
  return (
    <>
      {minimal && (
        <img
          src="/logos/kandiegang_logo.svg"
          alt="Kandie Gang"
          className="h-10 md:h-12 w-auto mb-8 md:mb-10"
        />
      )}
      <h1 className="text-5xl md:text-8xl lg:text-[8.5vw] font-heading-thin tracking-normal leading-[0.85] text-secondary-purple-rain mb-2 md:mb-4 text-balance inline-flex flex-wrap items-center justify-center gap-x-[0.15em]">
        <AnimatedHeadline text="You found us " as="span" />
        <HeadlineHeartSlot currentImage={currentImage} guidesReady={guidesReady} />
        <AnimatedHeadline text="!" as="span" />
      </h1>
    </>
  );
}

function HomepageRotatingHeadlineMotion({ minimal = false }: HomepageRotatingHeadlineProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { currentImage, guidesReady } = useHomepageGuideImageRotation();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.8], [1, 0.95]);

  return (
    <section
      ref={ref}
      className={`relative bg-primary-breath ${minimal ? 'pt-12 pb-[2em] md:pt-20 md:pb-20' : 'pt-[calc(4.5rem+2em)] pb-[2em] md:pt-40 md:pb-20'}`}
    >
      <motion.div
        style={{ opacity, scale }}
        className="w-full flex flex-col items-center justify-center text-center z-10 px-6"
      >
        <HeadlineContent
          minimal={minimal}
          currentImage={currentImage}
          guidesReady={guidesReady}
        />
      </motion.div>
    </section>
  );
}

function HomepageRotatingHeadlineStatic({ minimal = false }: HomepageRotatingHeadlineProps) {
  const { currentImage, guidesReady } = useHomepageGuideImageRotation();

  return (
    <section
      className={`relative bg-primary-breath ${minimal ? 'pt-12 pb-[2em] md:pt-20 md:pb-20' : 'pt-[calc(4.5rem+2em)] pb-[2em] md:pt-40 md:pb-20'}`}
    >
      <div className="w-full flex flex-col items-center justify-center text-center z-10 px-6">
        <HeadlineContent
          minimal={minimal}
          currentImage={currentImage}
          guidesReady={guidesReady}
        />
      </div>
    </section>
  );
}

export const HomepageRotatingHeadline: React.FC<HomepageRotatingHeadlineProps> = (props) => {
  const lightMotion = useLightMotionBackdrop();
  if (lightMotion) {
    return <HomepageRotatingHeadlineStatic {...props} />;
  }
  return <HomepageRotatingHeadlineMotion {...props} />;
};
