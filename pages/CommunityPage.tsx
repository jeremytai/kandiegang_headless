
/**
 * CommunityPage.tsx
 * Community page: hero, upcoming events, and required reading (Kandie Code, Ride Levels, Waiver).
 */

import * as React from 'react';
import { AnimatedBlob } from '../components/AnimatedBlob';
import { AnimatedHeadline } from '../components/AnimatedHeadline';
import { EventsLayout, EventsLayoutEvent } from '../components/EventsLayout';
import { ThreeThingsToDo } from '../components/ThreeThingsToDo';

const communityEvents: EventsLayoutEvent[] = [
  {
    id: 'kandiegang-bike-repair-workshop',
    href: 'https://discord.com/channels/1059075420798079036/1469975629146493175',
    imageBase: '/images/250701_photosafari-40',
    title: 'Kandie Gang Bike Repair Workshop',
    tag: 'Workshop',
    description: 'Wer seine Tool Skills erweitern möchte, ist hier genau richtig. Robert L. wird uns zeigen, was die wichtigsten Tipps & Tricks sind beim Reparieren',
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
    description: 'If last year is any indication, this will be a fun, challenging ride with thirty other Kandies in Göttingen.',
    startDate: '2026-06-21T09:00:00.000Z',
    endDate: '2026-06-21T14:00:00.000Z',
    year: '2026',
    days: 'Apr 26',
    month: 'Sunday',
    location: 'Göttingen',
  },
];

export const CommunityPage: React.FC = () => (
    <div className="relative selection:bg-[#f9f100] selection:text-black overflow-x-hidden">
      {/* Blob behind hero + events (no section bg so blob shows through) */}
      <div className="absolute inset-0 min-h-full pointer-events-none" aria-hidden>
        <AnimatedBlob contained />
      </div>

      <section className="relative z-10 min-h-[28rem] pt-32 md:pt-40 pb-8 md:pb-10">
        <div className="section-side-margin mx-auto grid max-w-[88rem] grid-cols-12 gap-x-4 lg:gap-x-6">
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
        <div className="section-side-margin max-w-7xl mx-auto space-y-8">
          <EventsLayout events={[communityEvents[0]]} />
          <ThreeThingsToDo />
          <EventsLayout events={[communityEvents[1]]} showTopBorder />
        </div>
      </section>
    </div>
);