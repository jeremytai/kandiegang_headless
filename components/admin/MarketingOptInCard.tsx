import React from 'react';
import { MarketingOptIn } from '../../types/analytics';

interface MarketingOptInCardProps {
  data: MarketingOptIn | null;
}

export function MarketingOptInCard({ data }: MarketingOptInCardProps) {
  if (!data) {
    return (
      <div className="bg-[#1a2730] border border-[#2a3840] rounded-lg p-6">
        <h3 className="text-[#8899a6] text-sm font-medium mb-4 uppercase tracking-wider">
          Marketing Consent
        </h3>
        <div className="text-[#8899a6]">No data available</div>
      </div>
    );
  }

  return (
    <div className="bg-[#1a2730] border border-[#2a3840] rounded-lg p-6">
      <h3 className="text-[#8899a6] text-sm font-medium mb-4 uppercase tracking-wider">
        Marketing Consent
      </h3>

      <div className="mb-4">
        <div className="text-white text-4xl font-light mb-2">
          {data.percentage.toFixed(1)}%
        </div>
        <div className="text-[#8899a6] text-sm">
          {data.optedIn} of {data.total} members
        </div>
      </div>

      <div className="w-full bg-[#0f1419] rounded-full h-2 overflow-hidden">
        <div
          className="bg-[#ff611a] h-full rounded-full transition-all duration-500"
          style={{ width: `${data.percentage}%` }}
        />
      </div>
    </div>
  );
}
