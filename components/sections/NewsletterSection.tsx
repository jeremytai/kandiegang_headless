/**
 * NewsletterSection.tsx
 * Newsletter signup bar inspired by Sunday.ai, using project CSS.
 * - "Get the latest in your inbox" / "Sign up to our newsletter" + Subscribe button.
 * - Opens NewsletterModal on Subscribe click.
 */

import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { NewsletterModal } from '../modals/NewsletterModal';

export const NewsletterSection: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <section
        className="section-side-margin relative my-4 grid h-[20vh] min-h-[110px] grid-cols-1 grid-rows-1 overflow-hidden rounded-xl bg-secondary-current md:my-6 md:h-[110px]"
        aria-label="Newsletter signup"
      >
        <div className="relative z-10 col-span-1 col-start-1 row-start-1 flex flex-col items-center justify-center gap-1 p-6 md:flex-row md:gap-4">
          <h3 className="hidden font-body text-center text-sm font-normal tracking-normal text-white md:block md:text-base">
            Get the latest in your inbox
          </h3>
          <h3 className="font-body pb-2 text-center text-sm font-light text-secondary-blush sm:pb-0 md:text-base">
            Sign up to our newsletter
          </h3>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="group inline-flex flex-nowrap items-center justify-center gap-2 rounded-full border border-white bg-transparent px-6 py-4 text-sm font-medium text-secondary-blush transition-colors hover:border-secondary-blush hover:bg-secondary-blush hover:text-white active:scale-95 md:gap-2 md:text-base"
            aria-label="Subscribe to newsletter"
          >
            <span>Subscribe</span>
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-secondary-blush/20 p-1 transition-colors group-hover:bg-white">
              <ArrowRight
                className="h-3 w-3 text-secondary-blush transition-colors"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </span>
          </button>
        </div>
      </section>

      <NewsletterModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};
