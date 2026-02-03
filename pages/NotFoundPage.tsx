/**
 * NotFoundPage.tsx
 * 404 page styled like the story page: headline, pill, ExpandingHero, then back link and message.
 * Route: * (catch-all)
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ExpandingHero } from '../components/ExpandingHero';
import { AnimatedHeadline } from '../components/AnimatedHeadline';

const NOT_FOUND_IMAGE = '/images/230902_7mesh-59.JPG';

export const NotFoundPage: React.FC = () => (
  <div className="bg-primary-breath min-h-screen selection:bg-[#f9f100] selection:text-black">
    <article>
      <section className="px-6 pt-32 md:pt-40 pb-12 md:pb-16 text-center">
        <div className="max-w-3xl mx-auto grid grid-cols-12 gap-4">
          <AnimatedHeadline
            as="h1"
            text="Page not found!"
            lineHeight={1.35}
            className="col-span-12 text-5xl md:text-8xl lg:text-[8.5vw] font-heading-thin tracking-normal text-secondary-purple-rain mb-4 md:mb-6 text-balance inline-block w-full text-center"
          />
          <p className="col-span-12 col-start-1 md:col-span-8 md:col-start-3 text-lg md:text-xl text-slate-600 leading-normal">
            Oops.
          </p>
          <div className="col-span-12 mt-6 flex justify-center">
            <span className="inline-block w-fit rounded-full bg-secondary-purple-rain px-2 py-1 text-xs font-light text-white">
              404
            </span>
          </div>
        </div>
      </section>

      <ExpandingHero imageUrl={NOT_FOUND_IMAGE} imageAlt="Kandie Gang" />

      <div className="max-w-4xl mx-auto px-6 pb-40">
        <div className="sticky top-0 z-10 -mx-6 px-6 pt-6 pb-2 bg-primary-breath/90 backdrop-blur-sm">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
        <p className="text-slate-600 leading-relaxed mt-4">
          Head back to the homepage or try a tubeless setup next time.
        </p>
      </div>
    </article>
  </div>
);
