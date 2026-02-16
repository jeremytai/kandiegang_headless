/**
 * EventPage.tsx
 * Standalone event page (e.g. UX Connect 26). Renders title, description,
 * date/location, speakers, and partners from event data.
 * Route: /event/:slug (e.g. /event/ux-connect-26)
 * CTA: logged-in users go to /members; others open a login sidebar.
 */

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Calendar, ArrowRight } from 'lucide-react';
import { getKandieEventBySlug } from '../../lib/wordpress';
import { imageSrc } from '../../lib/images';
import { AnimatedHeadline } from '../../components/visual/AnimatedHeadline';
// Import or define WPRideEvent type if not already imported
import type { WPRideEvent } from '../../lib/wordpress';

export const EventPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  // Remove unused variables to fix lint errors
  // const { user, status } = useAuth();
  // const { openMemberLogin } = useMemberLoginOffcanvas();
  const [event, setEvent] = useState<WPRideEvent | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchEvent = async () => {
      if (!slug) return;
      try {
        const e = await getKandieEventBySlug(slug);
        if (mounted) setEvent(e);
      } catch (err) {
        console.error('Failed to load event', err);
      }
    };

    fetchEvent();
    return () => {
      mounted = false;
    };
  }, [slug]);

  if (!slug || !event) {
    return (
      <div className="min-h-screen pt-32 md:pt-40 pb-40 flex flex-col items-center justify-center bg-primary-breath">
        <p className="text-slate-500 mb-6">Event not found.</p>
        <Link
          to="/community"
          className="inline-flex items-center gap-2 text-secondary-purple-rain font-bold hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Community
        </Link>
      </div>
    );
  }

  // Defensive destructuring with correct types from WPRideEvent and EventDetailsMetadata
  const title: string = event?.title ?? '';
  const description: string = event?.eventDetails?.description ?? '';
  const location: string = event?.eventDetails?.meetingPoint?.city ?? '';
  const address: string | undefined = event?.eventDetails?.meetingPoint?.street ?? undefined;
  const dateRange: string = event?.eventDetails?.eventDate ?? '';
  const time: string | undefined = event?.eventDetails?.rideTime ?? undefined;
  // price, ctaLabel, speakers, partners are not in WPRideEvent/EventDetailsMetadata, so remove their usage or set as empty/defaults
  // Removed unused variables: price, ctaLabel, speakers, partners

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-primary-breath min-h-screen selection:bg-[#f9f100] selection:text-black"
    >
      <div className="max-w-3xl mx-auto px-6 pt-32 md:pt-40 pb-24">
        <div className="mb-10">
          <Link
            to="/community"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-primary-ink text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Community
          </Link>
        </div>

        {/* Hero / Title */}
        <header className="text-center mb-12">
          <AnimatedHeadline
            as="h1"
            text={title}
            lineHeight={1.2}
            className="text-4xl md:text-5xl lg:text-6xl font-heading-thin tracking-normal text-secondary-purple-rain mb-6 text-balance"
          />
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-slate-600 text-sm md:text-base">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4 shrink-0" aria-hidden />
              {dateRange}
              {time ? ` · ${time}` : null}
            </span>
            <span className="text-slate-400" aria-hidden>
              ·
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4 shrink-0" aria-hidden />
              {address ?? location}
            </span>
          </div>
        </header>

        {/* Description */}
        <section className="mb-12">
          <div className="prose prose-lg max-w-none text-primary-ink leading-normal whitespace-pre-line">
            {description}
          </div>
        </section>

        {/* Price & CTA — not available in WPRideEvent, so omitted */}

        {/* Speakers */}
        {/* Speakers section omitted: not available in WPRideEvent */}

        {/* Partners */}
        {/* Partners section omitted: not available in WPRideEvent */}
      </div>

      {/* Partner CTA (sits above global newsletter section) */}
      <div className="w-full px-4 md:px-6 mt-20">
        <section className="relative rounded-xl p-12 md:p-24 flex flex-col items-center text-center mb-1 overflow-hidden">
          <img
            src={imageSrc('/images/251031_halloween_gravelo_abbett-86')}
            alt=""
            width={1920}
            height={1080}
            className="absolute inset-0 w-full h-full object-cover"
            aria-hidden
          />
          <div className="absolute inset-0 bg-slate-900/50" aria-hidden />
          <div className="relative z-10 flex flex-col items-center">
            <h2 className="text-4xl md:text-6xl font-light tracking-normal text-white mb-8">
              Become a Kandie Gang Member
            </h2>
            <p className="text-xl text-white/90 mb-12 max-w-xl font-light">
              Early ride access, product discounts, and more.
            </p>
            <Link
              to="/shop/kandie-gang-cycling-club-membership"
              className="group inline-flex flex-nowrap items-center justify-center gap-2 rounded-full border border-white bg-transparent px-6 py-4 text-sm font-medium text-secondary-blush transition-colors hover:border-secondary-blush hover:bg-secondary-blush hover:text-white active:scale-95 md:gap-2 md:text-base"
            >
              <span>Join us</span>
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-secondary-blush/20 p-1 transition-colors group-hover:bg-white">
                <ArrowRight
                  className="h-3 w-3 text-secondary-blush transition-colors"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </span>
            </Link>
          </div>
        </section>
      </div>
    </motion.main>
  );
};
