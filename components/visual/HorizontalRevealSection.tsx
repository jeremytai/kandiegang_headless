import React from 'react';
import { Link } from 'react-router-dom';

export const HorizontalRevealSection: React.FC = () => {
  return (
    <section className="relative h-[400vh] md:h-[500vh] bg-secondary-purple-rain">
      <div className="sticky top-0 h-screen w-full flex flex-col justify-center overflow-hidden">
        {/* Header */}
        <div className="absolute top-12 md:top-20 left-0 w-full px-8 md:px-16 pb-12 md:pb-16 flex justify-between items-start z-20">
          <h2 className="text-5xl md:text-7xl font-light tracking-tight text-secondary-current text-balance">
            Community is Our Catalyst
          </h2>
          <div className="hidden md:flex items-center gap-2 text-slate-400 font-medium text-xs md:text-sm pt-4">
            <span className="uppercase tracking-widest text-secondary-current text-[10px]">
              Scroll down to explore
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4 text-secondary-current"
              aria-hidden="true"
            >
              <path d="m9 18 6-6-6-6"></path>
            </svg>
          </div>
        </div>
        {/* Progress Bars */}
        <div className="absolute left-4 md:left-12 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-[2px] md:w-[3px] h-4 md:h-6 rounded-full bg-black origin-center opacity-10"
            />
          ))}
        </div>
        {/* Card Row */}
        <div className="flex gap-6 md:gap-8 pl-[2vw] md:pl-[4vw] pr-[5vw] md:pr-[15vw] items-center min-w-max mt-16 md:mt-24 transform-none">
          <div className="relative flex-none w-[90vw] md:w-[60vw] aspect-[4/5] md:aspect-[16/10] rounded-xl overflow-hidden p-8 md:p-20 flex flex-col justify-end bg-slate-900 text-white shadow-2xl group">
            <div className="relative z-10 max-w-xl">
              <Link
                className="block text-white no-underline hover:text-white focus:text-white focus:outline-none"
                to="/community"
                data-discover="true"
              >
                <h3 className="text-3xl md:text-5xl font-light tracking-tight mb-2 md:mb-3 group-hover:scale-105 transition-transform duration-700 origin-left text-balance">
                  Let's Ride
                </h3>
                <p className="opacity-60 text-sm md:text-base leading-tight font-light tracking-tight text-balance">
                  People join us for our community rides, to exchange bicycle knowledge and build
                  friendships—no matter their gender, race or social background.
                </p>
              </Link>
            </div>
            <div className="absolute inset-0 z-0">
              <img
                width={1200}
                height={800}
                className="w-full h-full object-cover"
                alt="Let's Ride"
                loading="lazy"
                src="https://leckerbisschen.s3.eu-central-1.amazonaws.com/wp-content/uploads/2025/09/06220134/250923_kandiegangsocialride-20-scaled.jpg"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            </div>
          </div>
          <div className="relative flex-none w-[90vw] md:w-[60vw] aspect-[4/5] md:aspect-[16/10] rounded-xl overflow-hidden p-8 md:p-20 flex flex-col justify-end bg-slate-900 text-white shadow-2xl group">
            <div className="relative z-10 max-w-xl">
              <Link
                className="block text-white no-underline hover:text-white focus:text-white focus:outline-none"
                to="/stories"
                data-discover="true"
              >
                <h3 className="text-3xl md:text-5xl font-light tracking-tight mb-2 md:mb-3 group-hover:scale-105 transition-transform duration-700 origin-left text-balance">
                  Stories
                </h3>
                <p className="opacity-60 text-sm md:text-base leading-tight font-light tracking-tight text-balance">
                  We believe actions speak louder than words. Because belonging emerges when people
                  show up, ride, and co-create together.
                </p>
              </Link>
            </div>
            <div className="absolute inset-0 z-0">
              <img
                width={1200}
                height={800}
                className="w-full h-full object-cover"
                alt="Stories"
                loading="lazy"
                src="https://leckerbisschen.s3.eu-central-1.amazonaws.com/wp-content/uploads/2026/02/05074948/prettigoodride-scaled.jpg"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            </div>
          </div>
          <div className="relative flex-none w-[90vw] md:w-[60vw] aspect-[4/5] md:aspect-[16/10] rounded-xl overflow-hidden p-8 md:p-20 flex flex-col justify-end bg-slate-900 text-white shadow-2xl group">
            <div className="relative z-10 max-w-xl">
              <Link
                className="block text-white no-underline hover:text-white focus:text-white focus:outline-none"
                to="/kandiegangcyclingclub"
                data-discover="true"
              >
                <h3 className="text-3xl md:text-5xl font-light tracking-tight mb-2 md:mb-3 group-hover:scale-105 transition-transform duration-700 origin-left text-balance">
                  Membership
                </h3>
                <p className="opacity-60 text-sm md:text-base leading-tight font-light tracking-tight text-balance">
                  An annual subscription includes early access to weekly local rides, members only
                  access to photos, discounts on products, and much more.
                </p>
              </Link>
            </div>
            <div className="absolute inset-0 z-0">
              <img
                width={1200}
                height={800}
                className="w-full h-full object-cover"
                alt="Membership"
                loading="lazy"
                src="https://leckerbisschen.s3.eu-central-1.amazonaws.com/wp-content/uploads/2025/04/08130454/250401_kandiegang_seasonopener_2025-14-2048x1539.jpg"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            </div>
          </div>
          <div className="relative flex-none w-[90vw] md:w-[60vw] aspect-[4/5] md:aspect-[16/10] rounded-xl overflow-hidden p-8 md:p-20 flex flex-col justify-end bg-slate-900 text-white shadow-2xl group">
            <div className="relative z-10 max-w-xl">
              <Link
                className="block text-white no-underline hover:text-white focus:text-white focus:outline-none"
                to="/shop"
                data-discover="true"
              >
                <h3 className="text-3xl md:text-5xl font-light tracking-tight mb-2 md:mb-3 group-hover:scale-105 transition-transform duration-700 origin-left text-balance">
                  Shop
                </h3>
                <p className="opacity-60 text-sm md:text-base leading-tight font-light tracking-tight text-balance">
                  Excluive Kandie Gang products including limited edition apparel and accessories
                  because we believe in the power of collectivism and standing out from the crowd.
                </p>
              </Link>
            </div>
            <div className="absolute inset-0 z-0">
              <img
                width={1200}
                height={800}
                className="w-full h-full object-cover"
                alt="Shop"
                loading="lazy"
                src="https://leckerbisschen.s3.eu-central-1.amazonaws.com/wp-content/uploads/2025/06/24094519/250621_hamburg-17-768x577.jpg"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            </div>
          </div>
        </div>
        {/* Bottom Navigation */}
        <div className="fixed bottom-10 left-0 w-full z-[100] pointer-events-none flex justify-center px-6 opacity-20 translate-y-1">
          <nav className="pointer-events-auto relative mx-auto flex w-fit justify-center gap-0.5 md:gap-1 rounded-full bg-[hsla(0,0%,80%,0.2)] p-1.5 backdrop-blur-xl border border-white/10 shadow-lg">
            {["Let's Ride", 'Stories', 'Membership', 'Shop'].map((segment, i) => (
              <div
                key={segment}
                className="relative my-auto cursor-pointer text-center select-none"
              >
                <button
                  className={`z-10 inline-flex h-8 md:h-9 cursor-pointer flex-nowrap items-center justify-center px-3 md:px-4 py-1.5 text-[12px] md:text-sm font-medium transition-colors duration-300 rounded-full ${i === 0 ? 'text-black' : 'text-slate-600'}`}
                >
                  {i === 0 && (
                    <div className="absolute inset-0 bg-white rounded-full -z-10 shadow-sm" />
                  )}
                  {segment}
                </button>
              </div>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
};