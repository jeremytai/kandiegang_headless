import React from 'react';
import { Link } from 'react-router-dom';
import { imageSrc } from '../lib/images';

export interface EventCardProps {
  href: string;
  /** Base path without extension, e.g. "/images/250701_photosafari-12" */
  imageBase: string;
  title: string;
  tag?: string;
  description: string;
  year: string;
  days: string;
  month: string;
  location: string;
}

export const EventCard: React.FC<EventCardProps> = ({
  href,
  imageBase,
  title,
  tag,
  description,
  year,
  days,
  month,
  location,
}) => {
  const imageUrl = imageSrc(imageBase, 800);

  return (
    <article className="w-full">
      <Link
        to={href}
        className="group relative grid gap-6 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1.6fr)_auto] items-stretch rounded-2xl bg-white/90 border border-primary-ink/[0.06] px-4 py-4 md:px-8 md:py-8 shadow-[0_32px_80px_rgba(0,0,0,0.05)] text-inherit no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-drift focus-visible:ring-offset-2 focus-visible:ring-offset-primary-breath"
      >
        {/* Image */}
        <div className="relative">
          <div className="overflow-hidden rounded-2xl bg-primary-breath aspect-[4/3]">
            <img
              src={imageUrl}
              alt={title}
              loading="lazy"
              width={800}
              height={600}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col justify-center gap-4 md:pl-2">
          <div className="inline-flex items-center gap-3">
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-heading-thin tracking-tight text-secondary-purple-rain">
              {title}
            </h3>
            {tag && (
              <span className="inline-flex items-center rounded-full bg-secondary-blush/80 px-3 py-1 text-[0.75rem] font-medium text-primary-ink">
                {tag}
              </span>
            )}
          </div>

          <p className="text-sm md:text-base leading-relaxed text-primary-ink/80 max-w-xl">
            {description}
          </p>

          <span className="inline-flex items-center gap-2 text-sm font-medium text-secondary-purple-rain group-hover:underline underline-offset-4">
            <span className="text-base">→</span>
            <span>Go to event</span>
          </span>
        </div>

        {/* Date & location */}
        <div className="flex flex-col items-end justify-between text-secondary-purple-rain">
          <time className="flex flex-col items-end font-light leading-tight">
            <span className="text-[0.8rem] opacity-70">{year}</span>
            <span className="text-2xl md:text-3xl lg:text-[2.2rem] tracking-tight">{days}</span>
            <span className="mt-1 text-[0.8rem]">{month}</span>
          </time>
          <span className="mt-8 hidden text-[0.8rem] tracking-[0.25em] uppercase md:block origin-center rotate-90 translate-y-4">
            {location}
          </span>
          <span className="mt-3 text-[0.8rem] tracking-[0.15em] uppercase md:hidden">
            {location}
          </span>
        </div>
      </Link>
    </article>
  );
};

