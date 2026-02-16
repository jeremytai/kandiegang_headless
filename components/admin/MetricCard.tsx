import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
}

export function MetricCard({ title, value, subtitle }: MetricCardProps) {
  return (
    <div className="bg-[#1a2730] border border-[#2a3840] rounded-lg p-6 hover:border-[#ff611a] transition-colors">
      <div className="text-[#8899a6] text-sm font-medium mb-2 uppercase tracking-wider">
        {title}
      </div>
      <div className="text-white text-4xl font-light mb-1">
        {value}
      </div>
      {subtitle && (
        <div className="text-[#8899a6] text-sm">
          {subtitle}
        </div>
      )}
    </div>
  );
}
