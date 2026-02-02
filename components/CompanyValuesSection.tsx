/**
 * CompanyValuesSection.tsx
 * Values block inspired by Sunday.ai company page.
 * Two-column layout: heading block (Our Values / The principles that guide us) and a list of
 * value items (title + description) with top borders, rounded background, and responsive spacing.
 */

import React from 'react';

const VALUES: { title: string; description: string }[] = [
  {
    title: 'Diversity',
    description:
      "Different voices make cycling culture richer and more vibrant. We welcome all underrepresented riders, creating space for everyone to contribute, ride, and be seen. Inclusion drives creativity, belonging, and growth across the community.",
  },
  {
    title: 'Authenticity',
    description:
      "Being real matters. Members and partners alike are encouraged to show up as themselves, fostering honest connections. We cultivate experiences that reflect the true spirit of cycling.",
  },
  {
    title: 'Community',
    description:
      'Connections are at the heart of Kandie Gang. We create rides, events, and initiatives where participants feel supported and heard. A strong community fuels culture, participation, and growth.',
  },
  {
    title: 'Openness',
    description:
      'Spaces are intentionally welcoming and barrier-free. We listen, adapt, and make room for new voices, ensuring every rider can participate and help shape the culture. Openness keeps the community vibrant and evolving.',
  },
  {
    title: 'Playful',
    description:
      'We use playfulness to keep cycling culture open and approachable. It allows curiosity, experimentation, and enjoyment without pressure to perform, making it easier to show up, connect, and shape the culture together.',
  },
  {
    title: 'Empowerment',
    description:
      'Everyone can lead, contribute, and shape the culture. We provide tools, guidance, and opportunities so members can take initiative, create experiences, and grow as part of the community. Empowerment ensures culture is co-created, not dictated.',
  },
];

export const CompanyValuesSection: React.FC = () => {
  return (
    <section
      id="company-values"
      className="pt-16 pb-8 lg:pt-24 lg:pb-12"
      data-section-title="company-values"
    >
      <div className="grid grid-cols-12 gap-x-6 gap-y-5 rounded-2xl bg-secondary-purple-rain px-4 pt-16 pb-16 text-primary transition-colors duration-300 lg:px-8 lg:pt-12 lg:pb-20">
        <div className="col-span-full pb-8 lg:col-span-4">
          <h3 className="text-xs font-normal font-gtplanar uppercase tracking-[0.3em] text-white mb-8">
            Our Values
          </h3>
          <h2 className="text-4xl md:text-5xl font-light tracking-normal text-secondary-drift">
            The principles that guide us
          </h2>
        </div>
        <div className="hidden lg:block lg:col-span-1" aria-hidden="true" />
        <div className="col-span-full lg:col-span-7">
          <ul className="flex flex-col text-lg font-light leading-relaxed">
            {VALUES.map(({ title, description }) => (
              <li
                key={title}
                className="flex flex-col border-t border-secondary-current pt-4 pb-6 lg:flex-row lg:gap-6 lg:pb-12"
              >
                <div className="flex-1">
                  <h4 className="lg:max-w-[24ch] font-gtplanar text-xl font-medium tracking-tight text-secondary-drift text-primary">
                    {title}
                  </h4>
                </div>
                <div className="flex-1 text-white [&_p+*]:mt-[1em]">
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
