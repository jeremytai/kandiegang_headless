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
  /** When true, hide the "Size" label above the variant buttons. */
  hideLabel?: boolean;
  /** Label for the variant type (e.g. "Size", "Color"). Used for the contextual required message. */
  variantLabel?: string;
  /** When true, replace the variant label with "Please choose a {variantLabel}" (shown after add-to-cart without selection). */
  showVariantRequiredMessage?: boolean;
}

/** Lowercase first letter for use in sentence (e.g. "Size" -> "size"). */
function variantLabelInSentence(label: string): string {
  if (!label) return 'variant';
  return label.charAt(0).toLowerCase() + label.slice(1);
}

export const ProductVariantSelector: React.FC<ProductVariantSelectorProps> = ({
  variants,
  selectedVariantIndex,
  onVariantChange,
  variant = 'buttons',
  hideLabel = false,
  variantLabel: variantLabelProp = 'Size',
  showVariantRequiredMessage = false,
}) => {
  if (!variants || variants.length <= 1) {
    return null;
  }

  const contextualMessage = `Please choose a ${variantLabelInSentence(variantLabelProp)}`;

  if (variant === 'dropdown') {
    return (
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <div className="flex flex-col gap-0.5">
          {showVariantRequiredMessage ? (
            <p className="text-[11px] font-medium text-amber-600" role="status">
              {contextualMessage}
            </p>
          ) : (
            <label htmlFor="product-variant" className="text-sm font-medium text-secondary-purple-rain/70 uppercase tracking-widest">
              {variantLabelProp}
            </label>
          )}
        </div>
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
    <div className="flex flex-col items-start gap-2 self-start">
      {!hideLabel && (
        <div className="flex flex-col gap-0.5">
          {showVariantRequiredMessage ? (
            <p className="text-[11px] font-medium text-amber-600" role="status">
              {contextualMessage}
            </p>
          ) : (
            <p className="text-[11px] font-medium text-secondary-purple-rain/70 uppercase tracking-widest">
              {variantLabelProp}
            </p>
          )}
        </div>
      )}
      <div className="flex flex-nowrap justify-start items-center gap-1.5">
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
                relative px-2 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap
                ${isSelected ? 'bg-secondary-purple-rain text-white border border-secondary-purple-rain' : 'bg-white border border-slate-300 text-slate-800 hover:border-slate-400'}
                ${!isInStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                focus:outline-none focus:ring-2 focus:ring-secondary-purple-rain focus:ring-offset-1
              `}
            >
              {formatVariantLabel(v.label)}
            </button>
          );
        })}
        {selectedVariantIndex >= 0 && (
          <button
            type="button"
            onClick={() => onVariantChange(-1)}
            className="text-[11px] font-medium text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-secondary-purple-rain focus:ring-offset-1 rounded"
            aria-label="Clear variant selection"
          >
            cancel
          </button>
        )}
      </div>
    </div>
  );
};
