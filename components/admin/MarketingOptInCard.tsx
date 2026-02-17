import React from 'react';
import { MarketingOptIn } from '../../types/analytics';

interface MarketingOptInCardProps {
  data: MarketingOptIn | null;
}

export function MarketingOptInCard({ data }: MarketingOptInCardProps) {
  if (!data) {
    return (
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <h3 className="text-neutral-400 text-xs font-medium mb-4 uppercase tracking-[0.15em]">
          Marketing Consent
        </h3>
        <div className="text-neutral-400">No data available</div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-6">
      <h3 className="text-neutral-400 text-xs font-medium mb-4 uppercase tracking-[0.15em]">
        Marketing Consent
      </h3>

      <div className="mb-4">
        <div className="text-neutral-900 text-4xl font-light mb-2">
          {data.percentage.toFixed(1)}%
        </div>
        <div className="text-neutral-400 text-sm">
          {data.optedIn} of {data.total} members
        </div>
      </div>

      <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
        <div
          className="bg-[#ff611a] h-full rounded-full transition-all duration-500 marketing-progress-bar"
          data-progress-width={data.percentage}
        />
      </div>
    </div>
  );
}
