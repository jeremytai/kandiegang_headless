/**
 * HorizontalRevealSection.tsx
 * A side-scrolling feature showcase that pins to the screen.
 * Features:
 * - Translates vertical scroll progress into horizontal movement across multiple cards.
 * - Persistent side-navigation dots that reflect current progress.
 * - SegmentedNav: A bottom navigation pill that allows jumping between different technical aspects (Features, 360°, Anatomy).
 * - Responsive adjustments: Cards occupy more screen space on mobile.
 */

import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { getCategoryPosts, transformMediaUrl } from '../../lib/wordpress';

const SegmentedNav: React.FC<{
  activeIndex: number;
  onSelect: (index: number) => void;
  progress: MotionValue<number>;
  sectionInView: MotionValue<number>;
}> = ({ activeIndex, onSelect, progress, sectionInView }) => {
  const segments = ["Let's Ride", 'Stories', 'Membership', 'Shop'];

  // Visible only when section is in viewport; within section, hide when leaving
  const opacityInSection = useTransform(progress, [0, 0, 0.9, 1], [1, 1, 1, 0]);
  const opacity = useTransform(
    [opacityInSection, sectionInView],
    ([o, v]) => (o as number) * (v as number)
  );
  // Animate up from bottom when section enters view, down only when leaving section (not when at Shop)
  const y = useTransform([sectionInView, progress], ([v, p]: (number | string)[]) => {
    const vn = v as number;
    const pn = p as number;
    if (pn > 0.92) return (40 * (pn - 0.92)) / 0.08; // slide down only when really leaving section
    if (vn < 0.1) return 40; // below when section not in view
    if (vn < 0.2) return 40 - (40 * (vn - 0.1)) / 0.1; // slide up as section enters
    return 0;
  });

  return (
    <motion.div
      style={{ opacity, y }}
      className="fixed bottom-10 left-0 w-full z-[100] pointer-events-none flex justify-center px-6"
    >
      <nav className="pointer-events-auto relative mx-auto flex w-fit justify-center gap-0.5 md:gap-1 rounded-full bg-[hsla(0,0%,80%,0.2)] p-1.5 backdrop-blur-xl border border-white/10 shadow-lg">
        {segments.map((segment, i) => (
          <div key={segment} className="relative my-auto cursor-pointer text-center select-none">
            <button
              onClick={() => onSelect(i)}
              className={`z-10 inline-flex h-8 md:h-9 cursor-pointer flex-nowrap items-center justify-center px-3 md:px-4 py-1.5 text-[12px] md:text-sm font-medium transition-colors duration-300 rounded-full ${
                activeIndex === i ? 'text-black' : 'text-slate-600'
              }`}
            >
              {activeIndex === i && (
                <motion.div
                  layoutId="active-nav-pill"
                  className="absolute inset-0 bg-white rounded-full -z-10 shadow-sm"
                  transition={{ type: 'tween', duration: 0.25 }}
                />
              )}
              {segment}
            </button>
          </div>
        ))}
      </nav>
    </motion.div>
  );
};

const STORIES_IMAGE_FALLBACK =
  'https://leckerbisschen.s3.eu-central-1.amazonaws.com/wp-content/uploads/2025/11/10165246/251031_halloween_gravelo_abbett-89.jpg';

const HorizontalCard: React.FC<{
  title: string;
  desc: string;
  img: string;
  imgFallback?: string;
  to?: string;
}> = ({ title, desc, img, imgFallback, to }) => {
  const content = (
    <>
      <h3 className="text-3xl md:text-5xl font-light tracking-tight mb-2 md:mb-3 group-hover:scale-105 transition-transform duration-700 origin-left text-balance">
        {title}
      </h3>
      <p className="opacity-60 text-sm md:text-base leading-tight font-light tracking-tight text-balance">
        {desc}
      </p>
    </>
  );
  return (
    <div className="relative flex-none w-[90vw] md:w-[60vw] aspect-[4/5] md:aspect-[16/10] rounded-xl overflow-hidden p-8 md:p-20 flex flex-col justify-end bg-slate-900 text-white shadow-2xl group">
      <div className="relative z-10 max-w-xl">
        {to ? (
          <Link
            to={to}
            className="block text-white no-underline hover:text-white focus:text-white focus:outline-none"
          >
            {content}
          </Link>
        ) : (
          content
        )}
      </div>
      <div className="absolute inset-0 z-0">
        <img
          src={img}
          width={1200}
          height={800}
          className="w-full h-full object-cover"
          alt={title}
          loading="lazy"
          onError={
            imgFallback
              ? (e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = imgFallback;
                }
              : undefined
          }
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      </div>
    </div>
  );
};

const MOBILE_BREAKPOINT = 768;

const STORIES_CATEGORY_SLUG = 'social-rides';

export const HorizontalRevealSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardsRowRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  const [gapPx, setGapPx] = useState(24);
  const [newestStoryImage, setNewestStoryImage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCategoryPosts(STORIES_CATEGORY_SLUG, 1)
      .then((result) => {
        if (cancelled || !result?.nodes?.length) return;
        const url = result.nodes[0]?.featuredImage?.node?.sourceUrl;
        if (url) setNewestStoryImage(transformMediaUrl(url));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const updateMeasurements = () => {
      setViewportWidth(window.innerWidth);
      const row = cardsRowRef.current;
      if (row) {
        const gap = getComputedStyle(row).gap;
        const gapNum = parseFloat(gap) || 24;
        setGapPx(gapNum);
      }
    };

    updateMeasurements();
    window.addEventListener('resize', updateMeasurements);
    return () => window.removeEventListener('resize', updateMeasurements);
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  // Section in viewport: nav visible whenever section overlaps viewport (including at top when "Let's Ride" is selected)
  const { scrollYProgress: sectionInViewProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  // Nav appears only after section is well in view (not as soon as it overlaps viewport)
  const sectionInView = useTransform(sectionInViewProgress, [0, 0.75, 0.98, 1], [0, 1, 1, 0]);

  const cardCount = 4;
  const isMobile = viewportWidth < MOBILE_BREAKPOINT;

  // Mobile: x in pixels so the active card is centered (use viewport width for centering)
  const cardWidthPx = (90 / 100) * viewportWidth;
  const plPx = (2 / 100) * viewportWidth;
  const cardCenter0Px = plPx + cardWidthPx / 2;
  const viewportCenterPx = viewportWidth / 2;
  const mobileXValues = [0, 1, 2, 3].map(
    (i) => viewportCenterPx - (cardCenter0Px + i * (cardWidthPx + gapPx))
  );

  const xTargetDesktop = useTransform(
    scrollYProgress,
    [0, 0.25, 0.5, 0.75, 0.85, 1],
    ['0%', '-20%', '-37%', '-58%', '-58%', '-58%']
  );
  // Mobile: center each card at its scroll target (0, 0.25, 0.5, 0.75) with smooth transitions
  const xTargetMobile = useTransform(
    scrollYProgress,
    [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1],
    [
      mobileXValues[0],
      (mobileXValues[0] + mobileXValues[1]) / 2,
      mobileXValues[1],
      (mobileXValues[1] + mobileXValues[2]) / 2,
      mobileXValues[2],
      (mobileXValues[2] + mobileXValues[3]) / 2,
      mobileXValues[3],
      mobileXValues[3],
      mobileXValues[3],
    ]
  );
  const x = isMobile ? xTargetMobile : xTargetDesktop;

  useEffect(() => {
    return scrollYProgress.on('change', (v) => {
      const segment = Math.min(Math.floor(v * cardCount), cardCount - 1);
      setActiveIndex(segment);
    });
  }, [scrollYProgress]);

  const scrollToSegment = (index: number) => {
    if (!sectionRef.current) return;
    const sectionHeight = sectionRef.current.scrollHeight;
    const sectionTop = sectionRef.current.offsetTop;
    // useScroll with ["start start", "end end"] means:
    // progress 0 = section top at viewport top
    // progress 1 = section bottom at viewport bottom
    // So scroll range is (sectionHeight - viewportHeight)
    const scrollRange = sectionHeight - window.innerHeight;
    const progressPerSegment = [0, 0.25, 0.5, 0.75];
    const progress = progressPerSegment[Math.min(index, cardCount - 1)] ?? 0;
    const targetY = sectionTop + scrollRange * progress;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  };

  const indicators = [0, 1, 2, 3];

  return (
    <section ref={sectionRef} className="relative h-[400vh] md:h-[500vh] bg-secondary-purple-rain">
      <div className="sticky top-0 h-screen w-full flex flex-col justify-center overflow-hidden">
        <div className="absolute top-12 md:top-20 left-0 w-full px-8 md:px-16 pb-12 md:pb-16 flex justify-between items-start z-20">
          <h2 className="text-5xl md:text-7xl font-light tracking-tight text-secondary-current text-balance">
            Community is Our Catalyst
          </h2>
          <div className="hidden md:flex items-center gap-2 text-slate-400 font-medium text-xs md:text-sm pt-4">
            <span className="uppercase tracking-widest text-secondary-current text-[10px]">
              Scroll down to explore
            </span>
            <ChevronRight className="w-4 h-4 text-secondary-current" />
          </div>
        </div>

        <div className="absolute left-4 md:left-12 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2">
          {}
          {indicators.map((i) => {
            const start = i * 0.25;
            const end = (i + 1) * 0.25;
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const dotOpacity = useTransform(
              scrollYProgress,
              [start, start + 0.1, end - 0.1, end],
              [0.1, 0.4, 0.4, 0.1]
            );
            return (
              <motion.div
                key={i}
                style={{ opacity: dotOpacity }}
                className="w-[2px] md:w-[3px] h-4 md:h-6 rounded-full bg-black origin-center"
              />
            );
          })}
        </div>

        <motion.div
          ref={cardsRowRef}
          style={{ x }}
          className="flex gap-6 md:gap-8 pl-[2vw] md:pl-[4vw] pr-[5vw] md:pr-[15vw] items-center min-w-max mt-16 md:mt-24"
        >
          <HorizontalCard
            title="Let's Ride"
            desc="People join us for our community rides, to exchange bicycle knowledge and build friendships—no matter their gender, race or social background."
            img="https://leckerbisschen.s3.eu-central-1.amazonaws.com/wp-content/uploads/2025/09/06220134/250923_kandiegangsocialride-20-scaled.jpg"
            to="/community"
          />
          <HorizontalCard
            title="Stories"
            desc="We believe actions speak louder than words. Because belonging emerges when people show up, ride, and co-create together."
            img={newestStoryImage ?? STORIES_IMAGE_FALLBACK}
            imgFallback={STORIES_IMAGE_FALLBACK}
            to="/stories"
          />
          <HorizontalCard
            title="Membership"
            desc="An annual subscription includes early access to weekly local rides, members only access to photos, discounts on products, and much more."
            img="https://leckerbisschen.s3.eu-central-1.amazonaws.com/wp-content/uploads/2025/04/08130454/250401_kandiegang_seasonopener_2025-14-2048x1539.jpg"
            to="/kandiegangcyclingclub"
          />
          <HorizontalCard
            title="Shop"
            desc="Excluive Kandie Gang products including limited edition apparel and accessories because we believe in the power of collectivism and standing out from the crowd."
            img="https://leckerbisschen.s3.eu-central-1.amazonaws.com/wp-content/uploads/2025/06/24094519/250621_hamburg-17-768x577.jpg"
            to="/shop"
          />
        </motion.div>

        <SegmentedNav
          activeIndex={activeIndex}
          onSelect={scrollToSegment}
          progress={scrollYProgress}
          sectionInView={sectionInView}
        />
      </div>
    </section>
  );
};