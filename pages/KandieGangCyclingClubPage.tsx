/**
 * KandieGangCyclingClubPage.tsx
 * "Join the club" page inspired by Sunday.ai beta-program.
 * Hero, benefit pills, what you get, get involved CTAs, FAQ.
 * Newsletter is shown globally before the footer in App.
 */

import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ArrowUpRight } from 'lucide-react';
import { AnimatedHeadline } from '../components/AnimatedHeadline';
/** Hero gallery images (Sunday beta-program style). */
const HERO_IMAGES = [
  '/images/250401_kandiegang_seasonopener_2025-28-scaled.jpg',
  '/images/250701_photosafari-12.jpg',
  '/images/250701_photosafari-40.jpg',
  '/images/250923_kandiegangsocialride-10-2048x1539.jpg',
  '/images/251031_halloween_gravelo_abbett-86.jpg',
];

const BENEFIT_PILLS = [
  { label: 'Members-only access', sub: 'As a member you get full access \nto galleries from the social rides.' },
  { label: 'Up to 20% discount', sub: 'When Kandie Gang merch drops, \nyou get up to a 20% discount.' },
  { label: 'OG water bottle', sub: 'One archive issue, original Kandie Gang \nIt\'s a love story bidet ' },
];

const WHAT_YOU_GET: { title: string; description: string }[] = [
  {
    title: 'Group rides',
    description:
      'Regular Tuesday social rides and weekend outings. Find your pace with our ride levels and connect with other riders in a safe, supportive environment.',
  },
  {
    title: 'Training & events',
    description:
      'Structured training, race support, and special events throughout the season. We help you build fitness and confidence on the bike.',
  },
  {
    title: 'Community',
    description:
      'A space for FLINTA* and BIPOC riders (and everyone else) to belong. Discord, Strava, and in-person meetups keep the crew connected.',
  },
  {
    title: 'Culture & creativity',
    description:
      'Cycling culture shaped by the people who show up. Rides, art, and projects that reflect who we are and what we care about.',
  },
];

const GET_INVOLVED = [
  {
    title: 'Join Discord',
    description: 'Coordinate rides, get updates, and connect with the crew.',
    href: 'https://discord.gg/zddt89Q4hm',
    external: true,
  },
  {
    title: 'Sign the waiver',
    description: 'Required before joining group rides. Quick digital form.',
    href: '/waiver',
    external: false,
  },
  {
    title: 'Newsletter',
    description: 'Get the latest rides and events in your inbox.',
    href: '#newsletter',
    external: false,
  },
];

const CLUB_FAQS: { question: string; answer: React.ReactNode }[] = [
  {
    question: 'Do I need a paid membership to join a ride?',
    answer: (
      <>
        No. You can join rides without a paid membership. That said, memberships help us keep things running and supports the community.
      </>
    ),
  },
  {
    question: 'What are the ride levels?',
    answer: (
      <>
        We have four groups so you can find the right pace. Details and guidelines can be found{' '}
        <a href="/#/ridelevels" className="text-secondary-drift hover:underline">here</a> and in the FAQs on Discord.
      </>
    ),
  },
  {
    question: 'What is the Kandie Code?',
    answer: (
      <>
        The Kandie Code is our shared set of guidelines for how we ride and treat each other. We ask everyone to read and follow it. You can find it {' '}
        <a href="/#/kandiecode" className="text-secondary-drift hover:underline">here</a>.
      </>
    ),
  },
];

function ClubFAQItem({
  question,
  children,
  isOpen,
  onClick,
}: {
  question: string;
  children: React.ReactNode;
  isOpen: boolean;
  onClick: () => void;
  key?: React.Key;
}) {
  return (
    <div className="overflow-hidden border-t border-secondary-purple-rain/50 py-6 md:py-8">
      <button
        onClick={onClick}
        className="flex w-full cursor-pointer items-start justify-between text-left group"
      >
        <span className="max-w-[60ch] flex-1 pr-4">
          <p className="text-lg md:text-xl font-medium tracking-tight text-secondary-purple-rain">{question}</p>
        </span>
        <span
          className={`inline-flex shrink-0 pt-1 transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-180' : ''}`}
        >
          <ChevronDown className="h-5 w-5 opacity-40 text-secondary-purple-rain group-hover:opacity-100 transition-opacity" />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
          >
            <div className="pt-6 pb-2 text-secondary-purple-rain leading-relaxed font-light text-base md:text-lg max-w-[65ch]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const TOOLTIP_OFFSET = 12;

export const KandieGangCyclingClubPage: React.FC = () => {
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [stickyOffset, setStickyOffset] = useState<number | null>(null); // null = fixed, number = absolute top offset
  const [benefitTooltip, setBenefitTooltip] = useState<{ x: number; y: number; sub: string } | null>(null);
  const mobileCarouselRef = useRef<HTMLDivElement>(null);
  const imageScrollRefs = useRef<(HTMLDivElement | null)[]>([]);
  const benefitTooltipRef = useRef<HTMLDivElement>(null);
  const heroThumbnailsRef = useRef<HTMLDivElement>(null);
  const heroRightColRef = useRef<HTMLDivElement>(null);

  // Sync active thumbnail with visible image (desktop only, IntersectionObserver)
  React.useEffect(() => {
    if (window.innerWidth < 1024) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = imageScrollRefs.current.findIndex((ref) => ref === entry.target);
            if (index !== -1) setActiveImageIndex(index);
          }
        });
      },
      { threshold: 0.5, rootMargin: '-20% 0px -20% 0px' }
    );
    imageScrollRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });
    return () => observer.disconnect();
  }, []);

  // Handle sticky/fixed behavior for thumbnails and right column
  // Stop being fixed at scroll position 3567px
  React.useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth < 1024) return;

    const STICKY_END_THRESHOLD = 3567;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY >= STICKY_END_THRESHOLD) {
        setStickyOffset(STICKY_END_THRESHOLD);
      } else {
        setStickyOffset(null); // fixed mode
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToHeroImage = (index: number) => {
    const target = imageScrollRefs.current[index];
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Apply benefit tooltip position (no inline style in JSX)
  React.useEffect(() => {
    const el = benefitTooltipRef.current;
    if (!el) return;
    if (benefitTooltip) {
      el.style.left = `${benefitTooltip.x}px`;
      el.style.top = `${benefitTooltip.y - TOOLTIP_OFFSET}px`;
    }
  }, [benefitTooltip]);

  // Apply hero sticky absolute top (no inline style in JSX)
  React.useEffect(() => {
    const thumb = heroThumbnailsRef.current;
    const right = heroRightColRef.current;
    const top = stickyOffset !== null ? `${stickyOffset}px` : '';
    if (thumb) thumb.style.top = top;
    if (right) right.style.top = top;
  }, [stickyOffset]);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Benefit pill tooltip — above cursor */}
      {benefitTooltip && (
        <div
          ref={benefitTooltipRef}
          role="tooltip"
          className="benefit-tooltip-position pointer-events-none fixed z-[100] whitespace-pre-line rounded-md bg-primary-ink px-3 py-2 text-xs font-medium text-white shadow-lg"
        >
          {benefitTooltip.sub}
        </div>
      )}

      {/* Hero — scroll-driven image gallery with sticky thumbnails & right column */}
      <section className="relative">
        {/* Desktop layout */}
        <div className="hidden lg:flex">
          {/* Left column — scrolling images */}
          <div className="w-1/2 p-3">
            <div className="flex flex-col gap-3">
              {HERO_IMAGES.map((src, i) => (
                <div
                  key={src}
                  ref={(el) => { imageScrollRefs.current[i] = el; }}
                  className="aspect-[3/4] w-full overflow-hidden rounded-lg"
                >
                  <img
                    alt=""
                    draggable="false"
                    loading={i === 0 ? undefined : 'lazy'}
                    width={1920}
                    height={2400}
                    src={src}
                    className="h-full w-full object-cover object-center transition-transform duration-300 hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Right column — placeholder to maintain layout */}
          <div className="w-1/2" />
        </div>

        {/* Fixed/Absolute thumbnails (desktop only) */}
        <div
          ref={heroThumbnailsRef}
          className={`pointer-events-none hidden lg:flex h-screen items-center pl-6 z-20 ${
            stickyOffset === null ? 'fixed top-0 left-0' : 'absolute left-0'
          }`}
        >
          <div className="pointer-events-auto flex flex-col gap-3">
            {HERO_IMAGES.map((src, i) => (
              <button
                key={src}
                type="button"
                aria-label={`Go to image ${i + 1}`}
                aria-current={activeImageIndex === i}
                onClick={() => scrollToHeroImage(i)}
                className={`aspect-[3/4] w-9 cursor-pointer overflow-hidden rounded-md outline-2 outline-offset-3 transition-[outline,ring] ${
                  activeImageIndex === i
                    ? 'outline-secondary-current'
                    : 'ring-1 ring-secondary-current/20 outline-transparent'
                } focus-visible:ring-2 focus-visible:ring-secondary-current/80`}
              >
                <img
                  alt=""
                  draggable="false"
                  loading="lazy"
                  width={1920}
                  height={2400}
                  src={src}
                  className="h-full w-full object-cover object-center transition-transform duration-300 hover:scale-[1.15]"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Fixed/Absolute right column content (desktop only) */}
        <div
          ref={heroRightColRef}
          className={`hidden lg:flex items-center justify-center h-screen w-1/2 z-10 ${
            stickyOffset === null ? 'fixed top-0 right-0' : 'absolute right-0'
          }`}
        >
          <div className="flex w-full flex-col items-center justify-center gap-12 text-center px-6">
            {/* Headlines */}
            <div>
              <AnimatedHeadline
                as="h1"
                text="Join the Kandie Gang Cycling Club"
                className="font-heading text-secondary-purple-rain text-5xl md:text-4xl lg:text-5xl xl:text-6xl font-thin tracking-normal"
                lineHeight={1.25}
              />
              <h2 className="mt-3 inline-block w-fit rounded-full bg-secondary-purple-rain px-3 py-1.5 text-sm font-light text-white font-body tracking-tight">
                Ride with us
              </h2>
            </div>

            {/* Body text */}
            <div className="max-w-[44ch] text-secondary-purple-rain text-base md:text-lg lg:text-xl">
              <p>
                The Kandie Gang Cycling Club is an active community of like-minded cyclists of all ages and abilities. By becoming a member, you not only believe in our mission but actively support it with your contribution.
              </p>
            </div>

            {/* Proof points */}
            <div className="flex flex-col items-center text-secondary-purple-rain justify-center gap-2 lg:flex-row lg:gap-6">
              {BENEFIT_PILLS.map(({ label, sub }) => (
                <span
                  key={label}
                  tabIndex={0}
                  role="button"
                  className="outline-none"
                  onMouseEnter={(e) => setBenefitTooltip({ x: e.clientX, y: e.clientY, sub })}
                  onMouseMove={(e) => setBenefitTooltip((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null))}
                  onMouseLeave={() => setBenefitTooltip(null)}
                >
                  <p className="cursor-pointer text-secondary-current/70 underline decoration-dotted underline-offset-[3.5px] text-sm font-medium tracking-wide">
                    {label}
                  </p>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile layout */}
        <div className="flex flex-col lg:hidden">
          <div className="m-auto flex w-full flex-col items-center justify-center gap-6 pt-[var(--header-height,5rem)] text-center lg:gap-12 lg:pt-0">
            {/* Headlines */}
            <div className="px-4 max-lg:py-12 lg:px-6">
              <AnimatedHeadline
                as="h1"
                text="Join the Kandie Gang Cycling Club"
                className="font-heading text-secondary-purple-rain  text-5xl md:text-4xl lg:text-5xl xl:text-6xl font-normal tracking-tight"
                lineHeight={1.25}
              />
              <h2 className="mt-3 font-gtplanar text-secondary-drift text-base md:text-lg lg:text-xl font-normal tracking-tight">
                Ride with us
              </h2>
            </div>

            {/* Mobile: horizontal image carousel */}
            <div className="w-screen overflow-hidden lg:hidden">
              <div
                ref={mobileCarouselRef}
                className="no-scrollbar flex snap-x snap-mandatory scroll-p-4 flex-row gap-2 overflow-x-auto px-4"
                onScroll={() => {
                  const el = mobileCarouselRef.current;
                  if (!el) return;
                  const slideWidth = el.children[0]?.clientWidth || 0;
                  const gap = 8;
                  const index = Math.round(el.scrollLeft / (slideWidth + gap));
                  setActiveImageIndex(Math.min(Math.max(0, index), HERO_IMAGES.length - 1));
                }}
              >
                {HERO_IMAGES.map((src, i) => (
                  <div
                    key={src}
                    className="aspect-[3/4] flex-none snap-center overflow-hidden rounded-lg max-lg:w-[calc(100vw-(var(--spacing,1rem)*8))]"
                  >
                    <img
                      alt=""
                      draggable="false"
                      loading={i === 0 ? undefined : 'lazy'}
                      width={1920}
                      height={2400}
                      src={src}
                      className="h-full w-full object-cover object-center transition-transform duration-300 hover:scale-105"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile: thumbnail indicators */}
            <div className="w-fit py-4 lg:hidden">
              <div className="flex h-full justify-center gap-3">
                {HERO_IMAGES.map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Go to image ${i + 1}`}
                    aria-current={activeImageIndex === i}
                    onClick={() => {
                      setActiveImageIndex(i);
                      const el = mobileCarouselRef.current;
                      if (el && el.children[i]) {
                        el.children[i].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                      }
                    }}
                    className={`aspect-[3/4] w-7 cursor-pointer overflow-hidden rounded-md outline-2 outline-offset-3 transition-[outline,ring] ${
                      activeImageIndex === i
                        ? 'outline-secondary-current'
                        : 'ring-1 ring-secondary-current/20 outline-transparent'
                    } focus-visible:ring-2 focus-visible:ring-secondary-current/80`}
                  >
                    <img
                      alt=""
                    draggable="false"
                    loading="lazy"
                    width={1920}
                    height={2400}
                    src={src}
                    className="h-full w-full object-cover object-center transition-transform duration-300 hover:scale-105"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Body text */}
            <div className="max-w-[44ch] px-4 text-secondary-current text-base md:text-lg lg:px-8 lg:text-xl">
              <p className="[&+&]:mt-[1em]">
                Be part of an inclusive cycling community. Group rides, training, and a crew that supports every rider—no matter your level or background.
              </p>
            </div>

            {/* Proof points (dotted underline) */}
            <div className="flex flex-col items-center justify-center gap-2 px-4 text-center">
              {BENEFIT_PILLS.map(({ label, sub }) => (
                <span
                  key={label}
                  tabIndex={0}
                  role="button"
                  className="outline-none"
                  onMouseEnter={(e) => setBenefitTooltip({ x: e.clientX, y: e.clientY, sub })}
                  onMouseMove={(e) => setBenefitTooltip((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null))}
                  onMouseLeave={() => setBenefitTooltip(null)}
                >
                  <p className="cursor-pointer text-secondary-current/70 underline decoration-dotted underline-offset-[3.5px] text-sm font-medium tracking-wide">
                    {label}
                  </p>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Get involved — Reserve your spot (commented out)
      <hr className="border-t border-slate-200 mt-6 mb-2 w-full" aria-hidden />
      <section className="section-side-margin py-4 md:py-8">
        <div className="max-w-8xl mx-auto">
          <h2 className="font-heading text-primary-ink text-3xl md:text-4xl lg:text-5xl font-normal tracking-tight mb-4">
            Get involved
          </h2>
          <p className="text-slate-600 text-lg mb-12 md:mb-16 max-w-2xl">
            Join Discord to coordinate rides and stay in the loop. Sign the waiver before your first group ride, and get updates via the newsletter.
          </p>
          <ul className="space-y-6 md:space-y-8">
            {GET_INVOLVED.map(({ title, description, href, external }) => (
              <li key={title} className="flex flex-col sm:flex-row sm:items-start gap-4 border-t border-slate-200 pt-6">
                <div className="sm:w-48 shrink-0">
                  <span className="font-gtplanar text-lg font-medium text-primary-ink">{title}</span>
                </div>
                <div className="flex-1">
                  <p className="text-slate-600 mb-3">{description}</p>
                  {external ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-secondary-purple-rain font-medium hover:underline"
                    >
                      Join Discord
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  ) : href === '#newsletter' ? (
                    <a
                      href="#newsletter"
                      className="inline-flex items-center gap-1.5 text-secondary-purple-rain font-medium hover:underline"
                    >
                      Scroll to newsletter
                    </a>
                  ) : (
                    <Link
                      to={href}
                      className="inline-flex items-center gap-1.5 text-secondary-purple-rain font-medium hover:underline"
                    >
                      Sign the waiver
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
      */}

      {/* FAQ */}

      <hr className="border-t border-slate-200 mt-6 mb-2 w-full" aria-hidden />
      <section id="faqs" className="bg-white section-side-margin pt-4 pb-2 md:pb-1">
        <div className="max-w-8xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl bg-white p-6 md:p-8 lg:p-12">
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-light tracking-tight text-secondary-purple-rain mb-10 md:mb-12">
              Frequently Asked Questions
            </h2>
            <div className="flex flex-col">
              {CLUB_FAQS.map((item, index) => (
                <ClubFAQItem
                  key={item.question}
                  question={item.question}
                  isOpen={faqOpenIndex === index}
                  onClick={() => setFaqOpenIndex(faqOpenIndex === index ? null : index)}
                >
                  {item.answer}
                </ClubFAQItem>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
