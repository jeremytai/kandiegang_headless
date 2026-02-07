/**
 * CheckoutButton.tsx
 * Handles Stripe checkout session creation and redirects to Stripe Checkout.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface CheckoutButtonProps {
  priceId: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  disabled?: boolean;
  className?: string;
  /** 'default' | 'sm' - smaller padding and text when 'sm' */
  size?: 'default' | 'sm';
}

const sizeClasses = {
  default: 'px-8 py-4 text-base rounded-full inline-flex items-center justify-center gap-2',
  sm: 'w-full py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-between',
};

export const CheckoutButton: React.FC<CheckoutButtonProps> = ({
  priceId,
  productId,
  productTitle,
  productSlug,
  disabled = false,
  className = '',
  size = 'default',
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (!priceId || disabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          productId,
          productTitle,
          productSlug,
          userId: user?.id || null,
          userEmail: user?.email || null,
        }),
      });

      // Check if response has content before parsing JSON
      const contentType = response.headers.get('content-type');
      const text = await response.text();
      
      if (!text) {
        throw new Error('Empty response from server. In development, use `vercel dev` instead of `npm run dev` to enable API routes. Or deploy to Vercel to test checkout.');
      }

      let errorData;
      let data;
      
      try {
        if (contentType?.includes('application/json')) {
          data = JSON.parse(text);
        } else {
          throw new Error(`Unexpected response type: ${contentType || 'unknown'}. Response: ${text.substring(0, 100)}`);
        }
      } catch (parseError) {
        console.error('Failed to parse response:', text);
        throw new Error(`Invalid response from server: ${text.substring(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status} ${response.statusText}`);
      }

      if (!data.url) {
        throw new Error('No checkout URL returned from server');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to start checkout. Please ensure the API endpoint is configured.';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const isShopStyle = size === 'sm';

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleCheckout}
        disabled={disabled || isLoading || !priceId}
        className={`bg-secondary-purple-rain text-white transition-all hover:bg-secondary-purple-rain/90 disabled:cursor-not-allowed disabled:bg-secondary-purple-rain/60 disabled:opacity-90 ${sizeClasses[size]} ${className}`}
      >
        {isLoading ? (
          <>
            <Loader2 className={`${size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} animate-spin`} />
            <span>Processing...</span>
          </>
        ) : isShopStyle ? (
          <>
            <span className="tracking-normal">Add to Cart</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </>
        ) : (
          <>
            <ShoppingBag className="w-5 h-5" />
            <span>Add to Cart</span>
          </>
        )}
      </button>
      {error && (
        <p className="text-sm text-red-600 text-center max-w-md">{error}</p>
      )}
    </div>
  );
};
