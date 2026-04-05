/**
 * HorizontalRevealSection.tsx
 * A side-scrolling feature showcase that pins to the screen.
 * Features:
 * - Translates vertical scroll progress into horizontal movement across multiple cards.
 * - Persistent side-navigation dots that reflect current progress.
 * - SegmentedNav: A bottom navigation pill that jumps between scroll quarters per card (Safari / reduced-motion: in-flow nav + native horizontal scroll).
 * - Responsive adjustments: Cards occupy more screen space on mobile.
 */

import React, { useRef, useState, useEffect, useCallback, useLayoutEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion';
import { useLightMotionBackdrop } from '../../hooks/useLightMotionBackdrop';
import {
  useLatestStoryFeaturedImage,
  STORIES_PANEL_FALLBACK_IMAGE,
} from '../../hooks/useLatestStoryFeaturedImage';
import { SectionHeader } from './SectionHeader';

/* ─── Card data ─── */
interface CardData {
  title: string;
  desc: string;
  img: string;
  to: string;
}

const CARDS: CardData[] = [
  {
    title: "Let's Ride",
    desc: 'People join us for our community rides, to exchange bicycle knowledge and build friendships\u2014no matter their gender, race or social background.',
    img: 'https://leckerbisschen.s3.eu-central-1.amazonaws.com/wp-content/uploads/2025/09/06220134/250923_kandiegangsocialride-20-scaled.jpg',
    to: '/community',
  },
  {
    title: 'Stories',
    desc: 'We believe actions speak louder than words. Because belonging emerges when people show up, ride, and co-create together.',
    img: STORIES_PANEL_FALLBACK_IMAGE,
    to: '/stories',
  },
  {
    title: 'Membership',
    desc: 'An annual subscription includes early access to weekly local rides, members only access to photos, discounts on products, and much more.',
    img: 'https://leckerbisschen.s3.eu-central-1.amazonaws.com/wp-content/uploads/2025/04/08130454/250401_kandiegang_seasonopener_2025-14-2048x1539.jpg',
    to: '/kandiegangcyclingclub',
  },
  {
    title: 'Shop',
    desc: 'Exclusive Kandie Gang products including limited edition apparel and accessories because we believe in the power of collectivism and standing out from the crowd.',
    img: 'https://leckerbisschen.s3.eu-central-1.amazonaws.com/wp-content/uploads/2025/06/24094519/250621_hamburg-17-768x577.jpg',
    to: '/shop',
  },
];

/** One pill label per card; vertical scroll progress maps to four equal bands. */
const SEGMENT_LABELS = ['Rides', 'Stories', 'Membership', 'Shop'] as const;

const CARD_COUNT = CARDS.length;
const SEGMENT_COUNT = SEGMENT_LABELS.length;

/* ─── Side dot: hook usage is valid (one hook per component instance) ─── */
function SideIndicatorDot({ index, progress }: { index: number; progress: MotionValue<number> }) {
  const start = index / CARD_COUNT;
  const end = (index + 1) / CARD_COUNT;
  const opacity = useTransform(progress, [start, start + 0.1, end - 0.1, end], [0.1, 0.4, 0.4, 0.1]);
  return (
    <motion.div
      style={{ opacity }}
      className="w-[2px] md:w-[3px] h-4 md:h-6 rounded-full bg-[#111827] origin-center"
      aria-hidden
    />
  );
}

function SegmentedNavPill({
  activeIndex,
  onSelect,
}: {
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [highlight, setHighlight] = useState({ left: 0, width: 0 });

  const updateHighlight = useCallback(() => {
    const nav = navRef.current;
    const btn = itemRefs.current[activeIndex];
    if (!nav || !btn) return;
    const nr = nav.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    setHighlight({ left: br.left - nr.left, width: br.width });
  }, [activeIndex]);

  useLayoutEffect(() => {
    updateHighlight();
  }, [updateHighlight]);

  useEffect(() => {
    window.addEventListener('resize', updateHighlight);
    const nav = navRef.current;
    const ro = nav ? new ResizeObserver(() => updateHighlight()) : null;
    if (nav) ro?.observe(nav);
    return () => {
      window.removeEventListener('resize', updateHighlight);
      ro?.disconnect();
    };
  }, [updateHighlight]);

  return (
    <nav
      ref={navRef}
      className="relative mx-auto flex w-fit max-w-[min(100%,calc(100vw-3rem))] flex-nowrap justify-center gap-0.5 md:gap-1 rounded-full bg-[hsla(0,0%,80%,0.25)] p-1.5 backdrop-blur-xl pointer-events-auto"
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-y-1.5 rounded-full bg-primary-ecru"
        initial={false}
        animate={{ left: highlight.left, width: highlight.width }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      />
      {SEGMENT_LABELS.map((segment, i) => (
        <button
          key={segment}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          type="button"
          onClick={() => onSelect(i)}
          className={`relative z-10 inline-flex h-8 shrink-0 flex-nowrap items-center justify-center px-3 py-1.5 text-[12px] font-medium transition-colors duration-300 md:h-9 md:px-4 md:text-sm rounded-full ${
            activeIndex === i ? 'text-secondary-blush' : 'text-secondary-purple-rain'
          }`}
        >
          {segment}
        </button>
      ))}
    </nav>
  );
}

/**
 * Pill sits inside the sticky viewport with `absolute` — not `fixed`, because the homepage
 * content lives under a transformed `motion.div` in App.tsx; fixed would anchor to that
 * ancestor and render far below the visible viewport.
 */
function SegmentedNavInStickyViewport({
  activeIndex,
  onSelect,
}: {
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="pointer-events-none absolute bottom-8 left-0 right-0 z-[100] flex justify-center px-6 md:bottom-10">
      <SegmentedNavPill activeIndex={activeIndex} onSelect={onSelect} />
    </div>
  );
}

const HorizontalCard: React.FC<CardData> = ({ title, desc, img, to }) => (
  <div className="relative flex-none w-[90vw] md:w-[60vw] aspect-[4/5] md:aspect-[16/10] rounded-xl overflow-hidden p-8 md:p-20 flex flex-col justify-end bg-slate-900 text-white group snap-start">
    <div className="relative z-10 max-w-xl">
      <Link
        className="block text-white no-underline hover:text-white focus:text-white focus:outline-none"
        to={to}
      >
        <h3 className="text-3xl md:text-5xl font-light tracking-tight mb-2 md:mb-3 group-hover:scale-105 transition-transform duration-700 origin-left text-balance">
          {title}
        </h3>
        <p className="opacity-60 text-sm md:text-base leading-tight font-light tracking-tight text-balance">{desc}</p>
      </Link>
    </div>
    <div className="absolute inset-0 z-0">
      <img
        width={1200}
        height={800}
        className="w-full h-full object-cover"
        alt={title}
        loading="lazy"
        src={img}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
    </div>
  </div>
);

function sectionScrollProgressToSegment(v: number): number {
  return Math.min(SEGMENT_COUNT - 1, Math.floor(v * SEGMENT_COUNT));
}

export type HorizontalRevealSectionProps = {
  /** Title for the purple band; pins with the card strip. */
  sectionTitle?: string;
  showSectionScrollHint?: boolean;
};

type HorizontalRevealInnerProps = HorizontalRevealSectionProps & {
  cards: CardData[];
};

function cardsWithLatestStoryImage(storiesFeaturedUrl: string): CardData[] {
  return CARDS.map((c) =>
    c.title === 'Stories' ? { ...c, img: storiesFeaturedUrl } : c
  );
}

/** Native horizontal scroll when Safari / reduced-motion avoids vertical scroll-scrub. */
function HorizontalRevealFallback({
  sectionTitle = 'Community is the Catalyst',
  showSectionScrollHint = true,
  cards,
}: HorizontalRevealInnerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeCard, setActiveCard] = useState(0);
  const [activeSegment, setActiveSegment] = useState(0);

  const scrollToCard = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const cards = track.children;
    if (!cards[index]) return;
    (cards[index] as HTMLElement).scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'start',
    });
  }, []);

  const scrollToSegment = useCallback(
    (segmentIndex: number) => {
      scrollToCard(Math.min(segmentIndex, CARD_COUNT - 1));
    },
    [scrollToCard]
  );

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onScroll = () => {
      const children = Array.from(track.children) as HTMLElement[];
      if (!children.length) return;
      const trackRect = track.getBoundingClientRect();
      let closest = 0;
      let best = Infinity;
      children.forEach((child, i) => {
        const d = Math.abs(child.getBoundingClientRect().left - trackRect.left);
        if (d < best) {
          best = d;
          closest = i;
        }
      });
      setActiveCard(closest);
      setActiveSegment(closest);
    };

    track.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => track.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section className="relative bg-[#fdfdfd]">
      <div className="sticky top-0 flex h-screen w-full flex-col overflow-hidden bg-secondary-purple-rain">
        <div className="shrink-0">
          <SectionHeader title={sectionTitle} showScrollHint={showSectionScrollHint} />
        </div>
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="relative min-h-0 w-full flex-1 pb-24">
            <div className="absolute left-4 md:left-12 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-2">
              {cards.map((_c, i) => (
                <button
                  key={cards[i].title}
                  type="button"
                  aria-label={`Go to ${cards[i].title}`}
                  onClick={() => scrollToCard(i)}
                  className={`w-[2px] md:w-[3px] h-4 md:h-6 rounded-full origin-center transition-opacity ${
                    activeCard === i ? 'bg-[#111827] opacity-100' : 'bg-[#111827] opacity-25'
                  }`}
                />
              ))}
            </div>

            <div
              ref={trackRef}
              className="no-scrollbar flex h-full min-h-0 w-full gap-6 md:gap-8 overflow-x-auto px-[5vw] md:px-[15vw] items-center snap-x snap-mandatory scroll-pl-[5vw] md:scroll-pl-[15vw]"
            >
              {cards.map((card) => (
                <HorizontalCard key={card.title} {...card} />
              ))}
            </div>
          </div>
        </div>

        <SegmentedNavInStickyViewport activeIndex={activeSegment} onSelect={scrollToSegment} />
      </div>
    </section>
  );
}

export const HorizontalRevealSection: React.FC<HorizontalRevealSectionProps> = (props) => {
  const lightMotion = useLightMotionBackdrop();
  const storiesFeaturedUrl = useLatestStoryFeaturedImage();
  const cards = useMemo(
    () => cardsWithLatestStoryImage(storiesFeaturedUrl),
    [storiesFeaturedUrl]
  );
  if (lightMotion) {
    return <HorizontalRevealFallback {...props} cards={cards} />;
  }
  return <HorizontalRevealScrub {...props} cards={cards} />;
};

function HorizontalRevealScrub({
  sectionTitle = 'Community is the Catalyst',
  showSectionScrollHint = true,
  cards,
}: HorizontalRevealInnerProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [maxShift, setMaxShift] = useState(0);
  const [activeSegment, setActiveSegment] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  const x = useTransform(scrollYProgress, (p) => -p * maxShift);

  const recomputeMaxShift = useCallback(() => {
    const view = viewportRef.current;
    const track = trackRef.current;
    if (!view || !track) return;
    setMaxShift(Math.max(0, track.scrollWidth - view.clientWidth));
  }, []);

  useLayoutEffect(() => {
    recomputeMaxShift();
    const ro = new ResizeObserver(() => recomputeMaxShift());
    if (viewportRef.current) ro.observe(viewportRef.current);
    if (trackRef.current) ro.observe(trackRef.current);
    window.addEventListener('resize', recomputeMaxShift);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', recomputeMaxShift);
    };
  }, [recomputeMaxShift, cards]);

  useEffect(() => {
    return scrollYProgress.on('change', (v) => {
      setActiveSegment(sectionScrollProgressToSegment(v));
    });
  }, [scrollYProgress]);

  const scrollToSegment = useCallback((index: number) => {
    const el = sectionRef.current;
    if (!el) return;
    const top = window.scrollY + el.getBoundingClientRect().top;
    const h = el.scrollHeight;
    window.scrollTo({ top: top + (h / SEGMENT_COUNT) * index, behavior: 'smooth' });
  }, []);

  return (
    <section ref={sectionRef} className="relative h-[400vh] md:h-[500vh] bg-[#fdfdfd]">
      <div
        ref={viewportRef}
        className="sticky top-0 flex h-screen w-full flex-col overflow-hidden bg-secondary-purple-rain"
      >
        <div className="shrink-0">
          <SectionHeader title={sectionTitle} showScrollHint={showSectionScrollHint} />
        </div>
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="relative min-h-0 w-full flex-1 pb-24">
            <div className="absolute left-4 md:left-12 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-2">
              {cards.map((_c, i) => (
                <SideIndicatorDot key={cards[i].title} index={i} progress={scrollYProgress} />
              ))}
            </div>

            <motion.div
              ref={trackRef}
              style={{ x, willChange: 'transform' }}
              className="relative flex h-full min-h-0 w-max items-center gap-6 md:gap-8 px-[5vw] md:px-[15vw]"
            >
              {cards.map((card) => (
                <HorizontalCard key={card.title} {...card} />
              ))}
            </motion.div>
          </div>
        </div>

        <SegmentedNavInStickyViewport activeIndex={activeSegment} onSelect={scrollToSegment} />
      </div>
    </section>
  );
}
