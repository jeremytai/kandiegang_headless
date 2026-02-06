import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
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
        className="group relative grid grid-cols-[160px_1fr] md:grid-cols-[180px_minmax(0,1fr)_auto] gap-x-4 gap-y-4 md:gap-6 items-stretch border-b border-primary-ink/[0.06] pl-0 pr-4 pt-6 pb-10 md:pr-8 md:pt-8 md:pb-12 text-inherit no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-drift focus-visible:ring-offset-2 focus-visible:ring-offset-primary-breath"
      >
        {/* Image: row 1 col 1 on mobile and desktop; 160px on mobile, 180px on desktop */}
        <div className="col-start-1 row-start-1">
          <div className="overflow-hidden rounded-2xl bg-primary-breath w-[160px] h-[160px] md:w-[180px] md:h-[180px]">
            <img
              src={imageUrl}
              alt={title}
              loading="lazy"
              width={180}
              height={180}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          </div>
        </div>

        {/* Date & location: row 1 col 2 on mobile, col 3 on desktop; beside image on mobile */}
        <div className="col-start-2 row-start-1 md:col-start-3 flex items-center md:items-stretch justify-start md:justify-end text-secondary-purple-rain">
          <div className="flex items-stretch gap-3 md:gap-6 w-full md:w-auto justify-start md:justify-end">
            <time className="flex flex-col items-stretch font-light leading-tight text-center">
              <span className="mb-0.5 md:mb-1 w-full text-center text-[0.8rem] md:text-sm opacity-70">
                {year}
              </span>
              <span className="text-2xl md:text-3xl lg:text-[2.8rem] leading-none tracking-tight mt-1 mb-3 md:mt-6 md:mb-8">
                {days}
              </span>
              <span className="mt-1 md:mt-2 w-full text-center text-[0.85rem] md:text-sm">
                {month.length > 3 ? month.slice(0, 3) : month}
              </span>
            </time>

            {/* Vertical divider: full height of date stack, between date and city */}
            <div
              className="flex w-px min-h-[4rem] md:min-h-[5rem] self-stretch shrink-0 bg-slate-300"
              aria-hidden
            />

            <span className="flex items-center text-xs md:text-sm tracking-[0.2em] md:tracking-[0.3em] uppercase origin-center rotate-90 translate-y-1 shrink-0">
              {location}
            </span>
          </div>
        </div>

        {/* Content: row 2 full width on mobile, row 1 col 2 on desktop */}
        <div className="col-start-1 col-span-2 row-start-2 md:col-span-1 md:col-start-2 md:row-start-1 flex flex-col justify-center gap-3 md:gap-4 md:pl-1">
          <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-2 md:gap-3">
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-heading-light tracking-tight text-secondary-purple-rain">
              {title}
            </h3>
            {tag && (
              <span className="text-[0.85rem] font-light text-secondary-purple-rain/80 tracking-wide">
                {tag}
              </span>
            )}
          </div>

          <p className="text-sm md:text-base leading-relaxed text-primary-ink/80 max-w-xl">
            {description}
          </p>

          <div className="flex justify-start">
            <button
              type="button"
              className="group inline-flex flex-nowrap items-center justify-center gap-2 rounded-full border border-secondary-purple-rain bg-transparent px-3 py-1.5 text-[0.7rem] md:text-xs font-medium text-secondary-purple-rain transition-colors hover:border-secondary-purple-rain hover:bg-secondary-purple-rain hover:text-white active:scale-95"
            >
              <span>Go to event</span>
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-secondary-purple-rain/10 p-1 transition-colors group-hover:bg-white">
                <ArrowRight className="h-3 w-3 text-secondary-purple-rain transition-colors group-hover:text-secondary-purple-rain" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </span>
            </button>
          </div>
        </div>
      </Link>
    </article>
  );
};

