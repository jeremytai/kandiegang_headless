import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  active?: boolean;
  onClick?: () => void;
}

export function MetricCard({ title, value, subtitle, active, onClick }: MetricCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={`bg-white border rounded-lg p-6 transition-all ${
        active
          ? 'border-[#ff611a] shadow-[0_0_0_1px_#ff611a]'
          : 'border-neutral-200 hover:border-[#ff611a]'
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="text-neutral-400 text-xs font-medium mb-3 uppercase tracking-[0.15em]">
        {title}
      </div>
      <div className="text-neutral-900 text-4xl font-light mb-1">{value}</div>
      {subtitle && <div className="text-neutral-400 text-sm">{subtitle}</div>}
    </div>
  );
}
