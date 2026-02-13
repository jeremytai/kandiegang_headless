/**
 * AddToCartButton.tsx
 * Adds the current product (and variant) to the cart and opens the cart offcanvas.
 * Same visual style as the previous CheckoutButton for product pages.
 */

import React from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export interface AddToCartButtonProps {
  priceId: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  variantLabel?: string;
  /** Unit price for subtotal (e.g. 25.50 for €25.50). */
  price?: number;
  disabled?: boolean;
  className?: string;
  /** 'default' | 'sm' - smaller padding and text when 'sm' */
  size?: 'default' | 'sm';
  /** If provided and returns false, add is not performed (e.g. to show validation message). */
  onBeforeAdd?: () => boolean;
}

const sizeClasses = {
  default: 'px-8 py-4 text-base rounded-full inline-flex items-center justify-center gap-2',
  sm: 'w-full py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-between',
};

export const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  priceId,
  productId,
  productTitle,
  productSlug,
  variantLabel,
  price,
  disabled = false,
  className = '',
  size = 'default',
  onBeforeAdd,
}) => {
  const { addItem, openCart } = useCart();

  const handleClick = () => {
    if (onBeforeAdd?.() === false) return;
    if (!priceId || disabled) return;
    addItem({
      priceId,
      productId,
      productTitle,
      productSlug,
      quantity: 1,
      variantLabel,
      price,
    });
    openCart();
  };

  const isShopStyle = size === 'sm';

  return (
    <div className={`flex flex-col gap-2 ${isShopStyle ? 'w-full' : 'items-center'}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || !priceId}
        className={`bg-secondary-purple-rain text-white transition-all hover:bg-secondary-purple-rain/90 disabled:cursor-not-allowed disabled:bg-secondary-purple-rain/60 disabled:opacity-90 ${sizeClasses[size]} ${className}`}
      >
        {isShopStyle ? (
          <>
            <span className="tracking-normal">Add to Basket</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </>
        ) : (
          <>
            <ShoppingBag className="w-5 h-5" />
            <span>Add to Basket</span>
          </>
        )}
      </button>
    </div>
  );
};
