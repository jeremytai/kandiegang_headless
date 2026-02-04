import React from 'react';
import { EventCard, EventCardProps } from './EventCard';

export interface EventsLayoutEvent extends EventCardProps {
  id: string | number;
  startDate: string;
  endDate?: string;
}

interface EventsLayoutProps {
  events: EventsLayoutEvent[];
}

export const EventsLayout: React.FC<EventsLayoutProps> = ({ events }) => {
  const now = new Date();

  const futureEvents = events
    .filter((event) => {
      const start = new Date(event.startDate);
      if (Number.isNaN(start.getTime())) return false;
      return start.getTime() >= now.getTime();
    })
    .sort((a, b) => {
      const aTime = new Date(a.startDate).getTime();
      const bTime = new Date(b.startDate).getTime();
      return aTime - bTime;
    });

  if (!futureEvents.length) return null;

  const [nextEvent, ...upcomingEvents] = futureEvents;

  return (
    <section className="flex flex-col gap-12 md:gap-16">
      {nextEvent && (
        <div className="max-w-5xl mx-auto w-full">
          <EventCard {...nextEvent} />
        </div>
      )}

      {upcomingEvents.length > 0 && (
        <div className="max-w-5xl mx-auto w-full grid grid-cols-1 gap-8 md:gap-10 lg:gap-12 md:grid-cols-2 items-start">
          {upcomingEvents.map((event) => (
            <EventCard key={event.id} {...event} />
          ))}
        </div>
      )}
    </section>
  );
};

