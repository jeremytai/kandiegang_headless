import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { EventShareButton } from './EventShareButton';

interface EventHeaderProps {
  title: string;
  intro?: string;
  imageUrl?: string;
  onBack?: () => void;
  /** WordPress ride slug — enables branded PNG share card. */
  shareSlug?: string;
  pageUrl?: string | null;
}

const EventHeader: React.FC<EventHeaderProps> = ({
  title,
  intro,
  imageUrl,
  onBack,
  shareSlug,
  pageUrl,
}) => {
  return (
    // Main Wrapper with the "grey-50" background
    <section className="bg-secondary-purple-rain py-12 md:py-20 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Side: Content */}
          <div className="order-2 lg:order-1 lg:col-span-7">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-2 text-secondary-current hover:text-secondary-purple-rain text-sm font-medium transition-colors mb-6"
              >
                <ArrowLeft className="w-4 h-4" /> Events
              </button>
            )}

            <h1 className="text-4xl md:text-6xl font-heading-regular text-white leading-tight mb-3">
              {title}
            </h1>

            {intro && (
              <div className="w-full">
                <div className="max-w-[65ch] text-secondary-blush text-[17px] leading-[1.5] [&_p]:my-2.5 [&_p]:leading-[1.5] [&_a]:text-secondary-blush [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-secondary-blush/35 hover:[&_a]:decoration-secondary-blush/70">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      rehypeRaw as any,
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      rehypeSanitize as any,
                    ]}
                  >
                    {intro}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {shareSlug ? (
              <div className={intro ? 'mt-6' : undefined}>
                <EventShareButton eventSlug={shareSlug} pageUrl={pageUrl} />
              </div>
            ) : null}
          </div>

          {/* Right Side: Media */}
          <div className={`order-1 lg:order-2 lg:col-span-5 ${onBack ? 'lg:mt-10' : ''}`}>
            {imageUrl && (
              <div className="rounded-lg overflow-hidden h-full">
                <img src={imageUrl} alt={title} className="w-full h-full object-cover object-top" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default EventHeader;
