import React from 'react';
import { RideGuide } from '../lib/events';
import { transformMediaUrl } from '../lib/wordpress';

interface GuideSectionProps {
  guides: RideGuide[];
}

const GuideSection: React.FC<GuideSectionProps> = ({ guides }) => {
  if (!guides || guides.length === 0) {
    return null;
  }

  return (
    <section className="space-y-12">
      {guides.map((guide, idx) => (
        <div key={idx} className="flex items-center space-x-4">
          {guide.featuredImage?.node?.sourceUrl && (
            <img
              src={transformMediaUrl(guide.featuredImage.node.sourceUrl)}
              alt={guide.title || 'Guide Avatar'}
              className="w-16 h-16 rounded-full object-cover"
            />
          )}
          <div>
            <p className="font-bold">{guide.title}</p>
          </div>
        </div>
      ))}
    </section>
  );
};

export default GuideSection;
