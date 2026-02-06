/**
 * ProductVariantSelector.tsx
 * Displays product variants as pill buttons (e.g. size ranges (36-39) and (40-46) for socks).
 * User selects one, then adds to basket. Uses the variants array from productFields.
 */

import React from 'react';
import { ProductVariant } from '../lib/products';

/** Format label for pill: size ranges like "36-39" show as "(36-39)". */
function formatVariantLabel(label: string): string {
  if (/^\d+-\d+$/.test(label.trim())) return `(${label})`;
  return label;
}

interface ProductVariantSelectorProps {
  variants: ProductVariant[];
  selectedVariantIndex: number;
  onVariantChange: (variantIndex: number) => void;
  /** 'buttons' = pills (default); 'dropdown' = select. */
  variant?: 'dropdown' | 'buttons';
}

export const ProductVariantSelector: React.FC<ProductVariantSelectorProps> = ({
  variants,
  selectedVariantIndex,
  onVariantChange,
  variant = 'buttons',
}) => {
  if (!variants || variants.length <= 1) {
    return null;
  }

  if (variant === 'dropdown') {
    return (
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <label htmlFor="product-variant" className="text-sm font-medium text-secondary-purple-rain/70 uppercase tracking-widest">
          Variant
        </label>
        <select
          id="product-variant"
          value={selectedVariantIndex}
          onChange={(e) => onVariantChange(Number(e.target.value))}
          className="w-full px-4 py-3 rounded-lg border-2 border-secondary-purple-rain/30 bg-white text-secondary-purple-rain font-medium focus:outline-none focus:ring-2 focus:ring-secondary-purple-rain focus:ring-offset-2 focus:border-secondary-purple-rain cursor-pointer"
          aria-label="Choose product variant"
        >
          {variants.map((v, index) => (
            <option
              key={index}
              value={index}
              disabled={v.inventory <= 0}
            >
              {v.inventory <= 0 ? `${formatVariantLabel(v.label)} (Out of stock)` : formatVariantLabel(v.label)}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm font-medium text-secondary-purple-rain/70 uppercase tracking-widest">
        Size
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {variants.map((v, index) => {
          const isSelected = index === selectedVariantIndex;
          const isInStock = v.inventory > 0;
          return (
            <button
              key={index}
              type="button"
              onClick={() => onVariantChange(index)}
              disabled={!isInStock}
              className={`
                relative px-6 py-3 rounded-full text-sm font-medium transition-all
                ${isSelected ? 'bg-secondary-purple-rain text-white' : 'bg-white border-2 border-secondary-purple-rain/30 text-secondary-purple-rain hover:border-secondary-purple-rain'}
                ${!isInStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                focus:outline-none focus:ring-2 focus:ring-secondary-purple-rain focus:ring-offset-2
              `}
            >
              {formatVariantLabel(v.label)}
            </button>
          );
        })}
      </div>
    </div>
  );
};
