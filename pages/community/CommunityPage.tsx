/**
 * CommunityPage.tsx
 * Community page: hero, upcoming events, and required reading (Kandie Code, Ride Levels, Waiver).
 * Fetches live event data from WordPress GraphQL.
 */

import * as React from 'react';
import { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { AnimatedBlob } from '../../components/visual/AnimatedBlob';
import { AnimatedHeadline } from '../../components/visual/AnimatedHeadline';
import { EventsLayout, EventsLayoutEvent } from '../../components/event/EventsLayout';
import { ThreeThingsToDo } from '../../components/sections/ThreeThingsToDo';
import { getKandieEvents, WPRideEvent, transformMediaUrl } from '../../lib/wordpress';

/**
 * Fallback events if WordPress fetch fails
 */
const FALLBACK_EVENTS: EventsLayoutEvent[] = [
  {
    id: 'kandiegang-bike-repair-workshop',
    href: 'https://discord.com/channels/1059075420798079036/1469975629146493175',
    imageBase: '/images/250701_photosafari-40',
    title: 'Kandie Gang Bike Repair Workshop',
    tag: 'Workshop',
    description:
      'Wer seine Tool Skills erweitern möchte, ist hier genau richtig. Robert L. wird uns zeigen, was die wichtigsten Tipps & Tricks sind beim Reparieren',
    startDate: '2026-04-22T18:00:00.000Z',
    endDate: '2026-04-22T21:00:00.000Z',
    year: '2026',
    days: 'Apr 22',
    month: 'Wednesday',
    location: 'Hamburg',
  },
  {
    id: 'kandiegang-social-ride',
    href: '/kandiegangcyclingclub',
    imageBase: '/images/250701_photosafari-12',
    title: 'Kandie Gang Season Opener',
    tag: 'Social Ride',
    description: 'A relaxed, no-drop evening ride to explore Hamburg together. All levels welcome.',
    startDate: '2026-03-31T18:00:00.000Z',
    endDate: '2026-03-31T20:30:00.000Z',
    year: '2026',
    days: 'Mar 31',
    month: 'Tuesday',
    location: 'Hamburg',
  },
  {
    id: 'tour-de-energie',
    href: 'https://discord.com/channels/1059075420798079036/1458942794545631467',
    imageBase: '/images/250621_hamburg-14',
    title: 'Tour de Energie',
    tag: 'Road Event',
    description:
      'If last year is any indication, this will be a fun, challenging ride with thirty other Kandies in Göttingen.',
    startDate: '2026-06-21T09:00:00.000Z',
    endDate: '2026-06-21T14:00:00.000Z',
    year: '2026',
    days: 'Apr 26',
    month: 'Sunday',
    location: 'Göttingen',
  },
];

/**
 * Generate URL-friendly slug from event title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Transform WordPress RideEvent to EventsLayoutEvent
 */
function transformToEventsLayoutEvent(event: WPRideEvent): EventsLayoutEvent {
  const details = event.eventDetails;
  const eventDate = details?.eventDate ? new Date(details.eventDate) : new Date();
  const slug = generateSlug(event.title);

  // Truncate description to 200 characters
  const fullDescription = stripHtml(event.excerpt || details?.description || '');
  const truncatedDescription =
    fullDescription.length > 200
      ? fullDescription.substring(0, 200).trim() + '...'
      : fullDescription;

  return {
    id: event.databaseId || `event-${Date.now()}`,
    href: `/event/${slug}`,
    imageUrl: event.featuredImage?.node?.sourceUrl
      ? transformMediaUrl(event.featuredImage.node.sourceUrl)
      : undefined,
    title: event.title,
    tag: details?.primaryType || 'Event',
    description: truncatedDescription,
    startDate: details?.eventDate || new Date().toISOString(),
    endDate: details?.eventDate || new Date().toISOString(),
    year: eventDate.getFullYear().toString(),
    days: eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    month: eventDate.toLocaleDateString('en-US', { weekday: 'long' }),
    location: details?.meetingPoint?.city || '',
  };
}

export const CommunityPage: React.FC = () => {
  const [events, setEvents] = useState<EventsLayoutEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError(null);

        const wpEvents = await getKandieEvents(20);

        if (wpEvents && wpEvents.length > 0) {
          const transformedEvents = wpEvents.map(transformToEventsLayoutEvent);
          setEvents(transformedEvents);
          if (import.meta.env.DEV) {
            console.log('[Community] Loaded events:', transformedEvents.length);
          }
        } else {
          setEvents(FALLBACK_EVENTS);
          if (import.meta.env.DEV) {
            console.warn('[Community] No events from WordPress, using fallback');
          }
        }
      } catch (err) {
        console.error('[Community] Failed to fetch events:', err);
        setError('Could not load events');
        setEvents(FALLBACK_EVENTS);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <div className="relative selection:bg-[#f9f100] selection:text-black overflow-x-hidden">
      {/* Blob behind hero + events (no section bg so blob shows through) */}
      <div className="absolute inset-0 min-h-full pointer-events-none" aria-hidden>
        <AnimatedBlob contained />
      </div>

      <section className="relative z-10 min-h-[28rem] pt-32 md:pt-40 pb-8 md:pb-10">
        <div className="mx-auto grid max-w-site grid-cols-12 gap-x-4 px-6 lg:gap-x-6">
          <div className="col-span-12">
            <AnimatedHeadline
              text="Community is the heart of Kandie Gang"
              as="h1"
              lineHeight={1.5}
              fullWidth
              className="text-4xl md:text-6xl lg:text-[6.5vw] font-heading-light tracking-normal text-secondary-purple-rain mb-2 md:mb-4 text-balance w-full"
            />
          </div>
        </div>
      </section>

      <section className="relative z-10 pt-4 md:pt-6 pb-16 md:pb-12">
        <div className="max-w-site mx-auto space-y-8 px-6">
          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-secondary-purple-rain" />
            </div>
          )}

          {/* Error state (but still show fallback) */}
          {error && !loading && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-amber-50 border border-amber-200">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800">{error}. Showing cached events.</p>
            </div>
          )}

          {/* Events display */}
          {!loading && events.length > 0 && (
            <>
              <EventsLayout events={[events[0]]} />
              <ThreeThingsToDo />
              {events.length > 1 && <EventsLayout events={[events[1]]} showTopBorder />}
            </>
          )}

          {!loading && events.length === 0 && (
            <div className="text-center py-12">
              <p className="text-secondary-purple-rain">No events available at this time.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
