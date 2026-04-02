import React from 'react';
import { EventCard, EventCardProps } from './EventCard';

export interface EventsLayoutEvent extends EventCardProps {
  id: string | number;
  startDate: string;
  endDate?: string;
}

interface EventsLayoutProps {
  events: EventsLayoutEvent[];
  /** When true, renders a top border (e.g. for event blocks that are not the first on the page). */
  showTopBorder?: boolean;
  /** When true, hero card has no bottom border from `md` up; mobile keeps the divider before ThreeThingsToDo. */
  omitHeroBottomBorder?: boolean;
}

export const EventsLayout: React.FC<EventsLayoutProps> = ({
  events,
  showTopBorder,
  omitHeroBottomBorder,
}) => {
  const now = new Date();

  const cetDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(now);

  const futureEvents = events
    .filter((event) => {
      const start = new Date(event.startDate);
      if (Number.isNaN(start.getTime())) return false;
      // Show event until 23:59 CET on the day of the event
      const eventDateCET = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(start);
      return eventDateCET >= cetDateStr;
    })
    .sort((a, b) => {
      const aTime = new Date(a.startDate).getTime();
      const bTime = new Date(b.startDate).getTime();
      return aTime - bTime;
    });

  if (!futureEvents.length) return null;

  const [nextEvent, ...upcomingEvents] = futureEvents;

  return (
    <section
      className={`flex flex-col gap-12 md:gap-16 ${showTopBorder ? 'pt-8 border-t border-black/10' : ''}`}
    >
      {nextEvent && (
        <div className="w-full">
          <EventCard {...nextEvent} hideBottomBorder={omitHeroBottomBorder} />
        </div>
      )}

      {upcomingEvents.length > 0 && (
        <div className="w-full grid grid-cols-1 gap-8 md:gap-10 lg:gap-12 md:grid-cols-2 xl:grid-cols-3 items-start">
          {upcomingEvents.map((event) => (
            <EventCard key={event.id} {...event} />
          ))}
        </div>
      )}
    </section>
  );
};
