import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

interface EventHeaderProps {
  title: string;
  intro?: string;
  imageUrl?: string;
  onBack?: () => void;
}

const EventHeader: React.FC<EventHeaderProps> = ({ title, intro, imageUrl, onBack }) => {
  return (
    // Main Wrapper with the "grey-50" background
    <section className="bg-primary-ecru py-12 md:py-20 overflow-hidden">
      <div className="max-w-[88rem] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Side: Content */}
          <div className="order-2 lg:order-1 lg:col-span-7">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-secondary-purple-rain/70 hover:text-primary-ink transition-colors mb-6"
              >
                <svg width="12" height="13" viewBox="0 0 12 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10.5001 6.1011C10.5001 6.20056 10.4605 6.29594 10.3902 6.36626C10.3199 6.43659 10.2245 6.4761 10.1251 6.4761H2.78021L5.51536 9.21079C5.5502 9.24563 5.57784 9.28699 5.5967 9.33251C5.61555 9.37804 5.62526 9.42683 5.62526 9.4761C5.62526 9.52537 5.61555 9.57416 5.5967 9.61969C5.57784 9.66521 5.5502 9.70657 5.51536 9.74141C5.48052 9.77625 5.43916 9.80389 5.39364 9.82275C5.34811 9.8416 5.29932 9.85131 5.25005 9.85131C5.20078 9.85131 5.15199 9.8416 5.10646 9.82275C5.06094 9.80389 5.01958 9.77625 4.98474 9.74141L1.60974 6.36641C1.57487 6.33158 1.54721 6.29023 1.52834 6.2447C1.50947 6.19918 1.49976 6.15038 1.49976 6.1011C1.49976 6.05182 1.50947 6.00302 1.52834 5.9575C1.54721 5.91197 1.57487 5.87061 1.60974 5.83579L4.98474 2.46079C5.0551 2.39042 5.15054 2.35089 5.25005 2.35089C5.34956 2.35089 5.445 2.39042 5.51536 2.46079C5.58573 2.53115 5.62526 2.62659 5.62526 2.7261C5.62526 2.82561 5.58573 2.92105 5.51536 2.99141L2.78021 5.7261H10.1251C10.2245 5.7261 10.3199 5.76561 10.3902 5.83593C10.4605 5.90626 10.5001 6.00164 10.5001 6.1011Z" fill="currentColor" />
                </svg>
                Events
              </button>
            )}
            
            <h1 className="text-4xl md:text-6xl font-heading-regular text-secondary-purple-rain leading-tight mb-6">
              {title}
            </h1>
            
            {intro && (
              <div className="w-full">
                <div className="text-xl md:text-xl font-light leading-normal text-primary-ink">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw as any, rehypeSanitize as any]}
                  >
                    {intro}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>

          {/* Right Side: Media */}
          <div className={`order-1 lg:order-2 lg:col-span-5 ${onBack ? 'lg:mt-10' : ''}`}>
            {imageUrl && (
              <div className="rounded-lg overflow-hidden h-full">
                <img
                  src={imageUrl}
                  alt={title}
                  className="w-full h-full object-cover object-top"
                />
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
};

export default EventHeader;
