import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { imageSrc } from '../../lib/images';

export interface EventCardProps {
  href: string;
  /** Base path without extension, e.g. "/images/250701_photosafari-12" */
  imageBase?: string;
  /** Full image URL (overrides imageBase if provided). Used for external WordPress images */
  imageUrl?: string;
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
  imageUrl: externalImageUrl,
  title,
  tag,
  description,
  year,
  days,
  month,
  location,
}) => {
  const imageUrl = externalImageUrl || (imageBase ? imageSrc(imageBase, 800) : '/images/fallback-event.jpg');
  const isExternal = /^https?:\/\//i.test(href);
  const linkClassName =
    'group relative grid grid-cols-[160px_1fr] md:grid-cols-[180px_minmax(0,1fr)_auto] gap-x-4 gap-y-4 md:gap-6 items-stretch border-b border-primary-ink/[0.06] pl-0 pr-4 pt-6 pb-10 md:pr-8 md:pt-8 md:pb-12 text-inherit no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-drift focus-visible:ring-offset-2 focus-visible:ring-offset-primary-breath';

  const linkContent = (
    <>
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

        {/* Date & location: date stack, vertical divider, rotated location matching screenshot */}
        <div className="col-start-2 row-start-1 md:col-start-3 flex items-center justify-end text-secondary-purple-rain">
          <div className="flex items-center gap-4 md:gap-5">
            <time className="flex flex-col font-light leading-tight text-center">
              <span className="text-[0.75rem] md:text-sm opacity-70 mb-1">{year}</span>
              <span className="text-3xl md:text-4xl lg:text-5xl leading-none tracking-tight font-light mt-2 mb-8">
                {days}
              </span>
              <span className="text-[0.85rem] md:text-sm">{month}</span>
            </time>

            <div
              className="w-px h-24 md:h-28 bg-slate-200 shrink-0"
              aria-hidden="true"
            />

            <span className="event-card-location-vertical text-sm md:text-base tracking-widest uppercase font-light">
              {location}
            </span>
          </div>
        </div>

        {/* Content: row 2 full width on mobile, row 1 col 2 on desktop */}
        <div className="col-start-1 col-span-2 row-start-2 md:col-span-1 md:col-start-2 md:row-start-1 flex flex-col justify-center gap-3 md:gap-4 md:pl-1">
          <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-2 md:gap-3">
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-gt-planar font-light tracking-tight text-secondary-purple-rain">
              {title}
            </h3>
            {tag && (
              <span className="text-[0.85rem] font-light text-secondary-blush/80 tracking-wide">
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
              className="group inline-flex flex-nowrap items-center justify-center gap-2 rounded-full border border-secondary-purple-rain bg-transparent px-3 py-1.5 text-[0.7rem] md:text-xs font-medium text-secondary-purple-rain transition-colors hover:border-secondary-blush hover:bg-secondary-purple-rain hover:text-white active:scale-95"
            >
              <span>Go to event</span>
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-secondary-purple-rain/10 p-1 transition-colors group-hover:bg-white">
                <ArrowRight className="h-3 w-3 text-secondary-purple-rain transition-colors group-hover:text-secondary-purple-rain" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </span>
            </button>
          </div>
        </div>
    </>
  );

  return (
    <article className="w-full">
      {isExternal ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
        >
          {linkContent}
        </a>
      ) : (
        <Link to={href} className={linkClassName}>
          {linkContent}
        </Link>
      )}
    </article>
  );
};

