import React, { useState } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  /** Blur the value by default; click or Enter/Space toggles blur on and off. */
  sensitiveValue?: boolean;
}

export function MetricCard({
  title,
  value,
  subtitle,
  active,
  onClick,
  sensitiveValue = false,
}: MetricCardProps) {
  const [valueRevealed, setValueRevealed] = useState(false);
  const interactive = Boolean(onClick || sensitiveValue);

  const handleActivate = () => {
    if (sensitiveValue) setValueRevealed((v) => !v);
    onClick?.();
  };

  const interactiveProps = interactive
    ? {
        role: 'button' as const,
        tabIndex: 0 as const,
        onClick: handleActivate,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleActivate();
          }
        },
      }
    : {};

  return (
    <div
      {...interactiveProps}
      title={
        sensitiveValue
          ? valueRevealed
            ? 'Tap to hide amount'
            : 'Tap to show amount'
          : undefined
      }
      className={`bg-white border rounded-lg p-6 transition-all ${
        active
          ? 'border-[#ff611a] shadow-[0_0_0_1px_#ff611a]'
          : 'border-neutral-200 hover:border-[#ff611a]'
      } ${interactive ? 'cursor-pointer' : ''}`}
    >
      <div className="text-neutral-400 text-xs font-medium mb-3 uppercase tracking-[0.15em]">
        {title}
      </div>
      <div
        className={`text-neutral-900 text-4xl font-light mb-1 transition-[filter] duration-200 ${
          sensitiveValue && !valueRevealed ? 'blur-md select-none' : ''
        }`}
      >
        {value}
      </div>
      {subtitle && <div className="text-neutral-400 text-sm">{subtitle}</div>}
    </div>
  );
}
