/**
 * CartOffcanvas.tsx
 * Cart side panel: list of items, remove, Proceed to Checkout.
 * Uses OffCanvas (same pattern as members panel) and CartContext.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { OffCanvas } from './OffCanvas';
import { useCart, CartLineItem } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Loader2, ShoppingBag, Trash2, Minus, Plus } from 'lucide-react';

function CartLineRow({
  item,
  onRemove,
  onUpdateQuantity,
}: {
  item: CartLineItem;
  onRemove: () => void;
  onUpdateQuantity: (quantity: number) => void;
}) {
  return (
    <div className="flex gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-secondary-purple-rain text-sm truncate">
          {item.productTitle}
        </p>
        {item.variantLabel && (
          <p className="text-xs text-slate-500 mt-0.5">{item.variantLabel}</p>
        )}
        {item.price != null && item.price > 0 && (
          <p className="text-xs text-slate-600 mt-0.5">
            €{item.price.toFixed(2)}
            {item.quantity > 1 && (
              <span className="text-slate-500"> × {item.quantity} = €{(item.price * item.quantity).toFixed(2)}</span>
            )}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={() => onUpdateQuantity(item.quantity - 1)}
            aria-label={`Decrease quantity of ${item.productTitle}`}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            disabled={item.quantity <= 1}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="min-w-[1.5rem] text-center text-sm font-medium text-slate-700" aria-live="polite">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => onUpdateQuantity(item.quantity + 1)}
            aria-label={`Increase quantity of ${item.productTitle}`}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${item.productTitle} from basket`}
        className="shrink-0 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors self-start"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export const CartOffcanvas: React.FC = () => {
  const { items, itemCount, removeItem, updateQuantity, closeCart, isOpen } = useCart();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProceedToCheckout = async () => {
    if (items.length === 0) return;
    setError(null);
    setIsLoading(true);
    try {
      const lineItems = items.map((i) => ({
        priceId: i.priceId,
        quantity: i.quantity,
        productId: i.productId,
        productTitle: i.productTitle,
        productSlug: i.productSlug,
      }));
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineItems,
          userId: user?.id ?? null,
          userEmail: user?.email ?? null,
        }),
      });
      const contentType = response.headers.get('content-type');
      const text = await response.text();
      if (!text) {
        throw new Error(
          'Empty response from server. Use `vercel dev` for API routes or deploy to Vercel.'
        );
      }
      let data: { url?: string; error?: string };
      try {
        data = contentType?.includes('application/json') ? JSON.parse(text) : {};
      } catch {
        throw new Error(`Invalid response: ${text.substring(0, 100)}`);
      }
      if (!response.ok) {
        throw new Error(data.error ?? `Server error: ${response.status}`);
      }
      if (!data.url) {
        throw new Error('No checkout URL returned');
      }
      window.location.href = data.url;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to start checkout.';
      setError(msg);
      setIsLoading(false);
    }
  };

  return (
    <OffCanvas open={isOpen} onClose={closeCart} title="Basket">
      <div className="flex flex-col h-full">
        {itemCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-slate-600 mb-4">Your basket is empty.</p>
            <Link
              to="/shop"
              onClick={closeCart}
              className="inline-flex items-center gap-2 rounded-full bg-secondary-purple-rain px-6 py-3 text-sm font-medium text-white hover:bg-secondary-purple-rain/90 transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              Browse Shop
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto -mx-6 px-6">
              {items.map((item) => (
                <CartLineRow
                  key={item.id}
                  item={item}
                  onRemove={() => removeItem(item.id)}
                  onUpdateQuantity={(qty) => updateQuantity(item.id, qty)}
                />
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-slate-200 space-y-3">
              {(() => {
                const subtotal = items.reduce(
                  (sum, i) => sum + (i.price ?? 0) * i.quantity,
                  0
                );
                const hasAnyPrice = items.some((i) => i.price != null && i.price > 0);
                return hasAnyPrice ? (
                  <p className="text-sm font-medium text-slate-700 flex justify-between">
                    <span>Subtotal</span>
                    <span>€{subtotal.toFixed(2)}</span>
                  </p>
                ) : null;
              })()}
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <button
                type="button"
                onClick={handleProceedToCheckout}
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-lg text-sm font-medium bg-secondary-purple-rain text-white hover:bg-secondary-purple-rain/90 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Proceed to Checkout'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </OffCanvas>
  );
};
