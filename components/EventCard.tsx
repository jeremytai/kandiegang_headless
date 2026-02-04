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
        className="group relative grid gap-6 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1.6fr)_auto] items-stretch rounded-2xl bg-white/90 border border-primary-ink/[0.06] px-4 py-4 md:px-8 md:py-8 shadow-[0_32px_80px_rgba(0,0,0,0.05)] text-inherit no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-drift focus-visible:ring-offset-2 focus-visible:ring-offset-primary-breath"
      >
        {/* Image */}
        <div className="relative order-1 md:order-1">
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

        {/* Date & location (Vertica-inspired) */}
        <div className="order-2 md:order-3 flex items-stretch justify-end text-secondary-purple-rain">
          <div className="flex items-center gap-6 w-full md:w-auto justify-end">
            <time className="flex flex-col items-end font-light leading-tight">
              <span className="text-[0.8rem] md:text-sm opacity-70">{year}</span>
              <span className="text-3xl md:text-4xl lg:text-[2.8rem] tracking-tight">{days}</span>
              <span className="mt-2 text-[0.85rem] md:text-sm">{month}</span>
            </time>

            <div className="hidden md:flex items-center gap-4">
              <div className="h-24 w-px bg-secondary-purple-rain/20" />
              <span className="text-sm tracking-[0.3em] uppercase origin-center rotate-90 translate-y-1">
                {location}
              </span>
            </div>

            <span className="mt-1 text-[0.8rem] tracking-[0.18em] uppercase md:hidden">
              {location}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="order-3 md:order-2 flex flex-col justify-center gap-4 md:pl-2">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-heading-thin tracking-tight text-secondary-purple-rain">
              {title}
            </h3>
            {tag && (
              <span className="inline-flex items-center rounded-full bg-secondary-blush/70 px-3 py-1.5 text-[0.75rem] font-medium text-primary-ink/90 tracking-wide">
                {tag}
              </span>
            )}
          </div>

          <p className="text-sm md:text-base leading-relaxed text-primary-ink/80 max-w-xl">
            {description}
          </p>

          <button
            type="button"
            className="group inline-flex flex-nowrap items-center justify-center gap-2 rounded-full border border-secondary-purple-rain bg-transparent px-4 py-2 text-xs md:text-sm font-medium text-secondary-purple-rain transition-colors hover:border-secondary-purple-rain hover:bg-secondary-purple-rain hover:text-white active:scale-95"
          >
            <span>Go to event</span>
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-secondary-purple-rain/10 p-1 transition-colors group-hover:bg-white">
              <ArrowRight className="h-3 w-3 text-secondary-purple-rain transition-colors group-hover:text-secondary-purple-rain" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </span>
          </button>
        </div>
      </Link>
    </article>
  );
};

