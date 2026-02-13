import React from 'react';
import { EventCard, EventCardProps } from './EventCard';

export interface EventsGridEvent extends EventCardProps {
  id: string | number;
}

interface EventsGridProps {
  events: EventsGridEvent[];
}

export const EventsGrid: React.FC<EventsGridProps> = ({ events }) => {
  if (!events.length) return null;

  return (
    <section className="grid grid-cols-1 gap-8 md:gap-10 lg:gap-12 md:grid-cols-2 xl:grid-cols-3 items-start">
      {events.map((event) => (
        <EventCard key={event.id} {...event} />
      ))}
    </section>
  );
};

