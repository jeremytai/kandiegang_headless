/**
 * HorizontalRevealSection.tsx
 * A horizontal card carousel with native scroll + pagination dots.
 * Cards link to internal pages and use real Kandie Gang photography.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

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
    img: 'https://leckerbisschen.s3.eu-central-1.amazonaws.com/wp-content/uploads/2026/02/05074948/prettigoodride-scaled.jpg',
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

/* ─── HorizontalCard ─── */
const HorizontalCard: React.FC<CardData> = ({ title, desc, img, to }) => (
  <div className="relative flex-none w-[90vw] md:w-[60vw] aspect-[4/5] md:aspect-[16/10] rounded-xl overflow-hidden p-8 md:p-20 flex flex-col justify-end bg-slate-900 text-white shadow-2xl group snap-start">
    <div className="relative z-10 max-w-xl">
      <Link
        className="block text-white no-underline hover:text-white focus:text-white focus:outline-none"
        to={to}
      >
        <h3 className="text-3xl md:text-5xl font-light tracking-tight mb-2 md:mb-3 group-hover:scale-105 transition-transform duration-700 origin-left text-balance">
          {title}
        </h3>
        <p className="opacity-60 text-sm md:text-base leading-tight font-light tracking-tight text-balance">
          {desc}
        </p>
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

/* ─── Main section ─── */
export const HorizontalRevealSection: React.FC = () => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

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

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const handleScroll = () => {
      const children = Array.from(track.children) as HTMLElement[];
      if (!children.length) return;

      const trackRect = track.getBoundingClientRect();
      let closestIndex = 0;
      let closestDist = Infinity;

      children.forEach((child, i) => {
        const childRect = child.getBoundingClientRect();
        const dist = Math.abs(childRect.left - trackRect.left);
        if (dist < closestDist) {
          closestDist = dist;
          closestIndex = i;
        }
      });

      setActiveIndex(closestIndex);
    };

    track.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // set initial state
    return () => track.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="relative">
      {/* Card strip */}
      <div
        ref={trackRef}
        className="no-scrollbar bg-secondary-purple-rain flex gap-6 md:gap-8 overflow-x-auto snap-x snap-mandatory pl-[2vw] md:pl-[4vw] pr-[2vw] md:pr-[4vw] items-center scroll-pl-[2vw] md:scroll-pl-[4vw]"
      >
        {CARDS.map((card) => (
          <HorizontalCard key={card.title} {...card} />
        ))}
      </div>

      {/* Pagination dots */}
      <div className="flex justify-center bg-secondary-purple-rain gap-1 pt-6 pb-12">
        {CARDS.map((card, i) => (
          <button
            key={card.title}
            type="button"
            aria-label={`Go to ${card.title}`}
            onClick={() => scrollToCard(i)}
            className={`transition-all duration-300 ${
              activeIndex === i
                ? 'w-6 h-2 rounded-full bg-white'
                : 'w-6 h-2 rounded-full bg-secondary-current hover:bg-blush'
            }`}
          />
        ))}
      </div>
    </section>
  );
};
